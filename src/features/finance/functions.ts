import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'

import {
  financialEvents,
  financialPeriods,
  inventoryCostAllocations,
  inventoryCostLayers,
  productionBatchOutputs,
  saleItems,
  sales,
  salesLocations,
} from '#/db/schema'
import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'
import {
  compensateSaleValues,
  closeFinancialPeriodValues,
  correctFinancialEventValues,
  deliverSaleValues,
  financialOverviewValues,
  redeemStoreCreditValues,
} from '#/features/finance/contracts'
import type {
  CloseFinancialPeriodInput,
  CompensateSaleInput,
  CorrectFinancialEventInput,
  DeliverSaleInput,
  RedeemStoreCreditInput,
} from '#/features/finance/contracts'
import {
  calculateCompensationAmount,
  canCorrectClosedFinancialPeriod,
  summarizeFinancialEventEffects,
} from '#/features/finance/policy'
import { summarizeAccrualMargins } from '#/features/finance/accrual-margins'
import { diagnoseDeliveryFifoCoverage } from '#/features/finance/delivery-fifo-coverage'
import type {
  AccrualMarginAllocation,
  AccrualMarginEvent,
  AccrualMarginSale,
  AccrualMarginSaleItem,
} from '#/features/finance/accrual-margins'
import type { AppRole } from '#/features/auth/authorization'
import {
  calculateStoreCreditBalance,
  summarizeStoreCreditLedger,
} from '#/features/finance/store-credits'
import type { StoreCreditLedgerEvent } from '#/features/finance/store-credits'
import { appendOperationalAudit } from '#/features/operations/audit'
import {
  hashOperationPayload,
  resolveIdempotentReplay,
} from '#/features/operations/idempotency'
import {
  centsToMoney,
  moneyToCents,
  quantityToThousandths,
  thousandthsToQuantity,
} from '#/features/production/calculations'

export class FinancialSchemaUnavailableError extends Error {
  constructor() {
    super('G2 financeiro requer as migrations 0023 a 0026 antes de gravar.')
  }
}

function assertFinancialSchema(error: unknown): never {
  const code = (error as { code?: string } | null)?.code
  if (code === '42P01' || code === '42703')
    throw new FinancialSchemaUnavailableError()
  throw error
}

async function requireFinancialSchema(tx: any) {
  const result = await tx.execute(
    sql`select to_regclass('public.financial_events') as financial_events`,
  )
  if (!result.rows[0]?.financial_events)
    throw new FinancialSchemaUnavailableError()
}

function parseClosureSnapshot(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const snapshot = value as Record<string, unknown>
  if (
    typeof snapshot.netRevenue !== 'string' ||
    typeof snapshot.cashFlow !== 'string' ||
    typeof snapshot.eventCount !== 'number'
  )
    return null
  return {
    netRevenue: snapshot.netRevenue,
    cashFlow: snapshot.cashFlow,
    eventCount: snapshot.eventCount,
    ...(typeof snapshot.cogs === 'string' &&
    typeof snapshot.grossMargin === 'string' &&
    typeof snapshot.unattributedRevenue === 'string' &&
    typeof snapshot.reconciled === 'boolean'
      ? {
          cogs: snapshot.cogs,
          grossMargin: snapshot.grossMargin,
          unattributedRevenue: snapshot.unattributedRevenue,
          reconciled: snapshot.reconciled,
        }
      : {}),
  }
}

function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`
}

function nextMonth(value: string) {
  const [year, month] = value.slice(0, 7).split('-').map(Number)
  const next = new Date(Date.UTC(year, month, 1))
  return next.toISOString().slice(0, 10)
}

async function lockFinancialPeriod(tx: any, competenceDate: string) {
  const period = monthStart(competenceDate)
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`cacau:financial-period:${period}`}, 0))`,
  )
  return period
}

async function assertOpenPeriod(tx: any, competenceDate: string) {
  await lockFinancialPeriod(tx, competenceDate)
  const [period] = await tx
    .select({ status: financialPeriods.status })
    .from(financialPeriods)
    .where(eq(financialPeriods.periodMonth, monthStart(competenceDate)))
    .limit(1)
  if (period?.status === 'closed')
    throw new Error(
      'Período financeiro fechado: registre uma correção autorizada pelo Dono.',
    )
}

async function loadPeriodSnapshot(tx: any, periodMonth: string) {
  const rows = (await tx
    .select({
      revenueEffect: financialEvents.revenueEffect,
      cashEffect: financialEvents.cashEffect,
    })
    .from(financialEvents)
    .where(
      and(
        gte(financialEvents.competenceDate, periodMonth),
        lt(financialEvents.competenceDate, nextMonth(periodMonth)),
      ),
    )) as Array<{ revenueEffect: string; cashEffect: string }>
  return summarizeFinancialEventEffects(rows)
}

async function loadAccrualMargins(database: any, periodMonth: string) {
  const events = (await database
    .select({
      id: financialEvents.id,
      type: financialEvents.type,
      saleId: financialEvents.saleId,
      saleItemId: financialEvents.saleItemId,
      revenueEffect: financialEvents.revenueEffect,
    })
    .from(financialEvents)
    .where(
      and(
        gte(financialEvents.competenceDate, periodMonth),
        lt(financialEvents.competenceDate, nextMonth(periodMonth)),
      ),
    )) as AccrualMarginEvent[]
  const saleIds = [
    ...new Set(
      events.flatMap((event) => (event.saleId === null ? [] : [event.saleId])),
    ),
  ]
  if (!saleIds.length)
    return {
      ...summarizeAccrualMargins({
        events,
        sales: [],
        saleItems: [],
        allocations: [],
      }),
      fifoCoverage: diagnoseDeliveryFifoCoverage({
        events,
        saleItems: [],
        allocations: [],
      }),
    }

  const [saleRows, itemRows] = (await Promise.all([
    database
      .select({
        id: sales.id,
        locationId: sales.locationId,
        locationName: salesLocations.name,
      })
      .from(sales)
      .leftJoin(salesLocations, eq(sales.locationId, salesLocations.id))
      .where(inArray(sales.id, saleIds)),
    database
      .select({
        id: saleItems.id,
        saleId: saleItems.saleId,
        productId: saleItems.productId,
        productName: saleItems.productName,
        quantity: saleItems.quantity,
        revenue:
          sql<string>`coalesce(${saleItems.reportedAmount}, ${saleItems.totalAmount})`.as(
            'revenue',
          ),
      })
      .from(saleItems)
      .where(inArray(saleItems.saleId, saleIds)),
  ])) as [
    AccrualMarginSale[],
    Array<AccrualMarginSaleItem & { quantity: string }>,
  ]
  const itemIds = itemRows.map((item) => item.id)
  const allocationRows = itemIds.length
    ? ((await database
        .select({
          id: inventoryCostAllocations.id,
          saleItemId: inventoryCostAllocations.saleItemId,
          productionBatchId: productionBatchOutputs.productionBatchId,
          quantity: inventoryCostAllocations.quantity,
          allocatedCost: inventoryCostAllocations.allocatedCost,
        })
        .from(inventoryCostAllocations)
        .innerJoin(
          inventoryCostLayers,
          eq(
            inventoryCostAllocations.inventoryCostLayerId,
            inventoryCostLayers.id,
          ),
        )
        .leftJoin(
          productionBatchOutputs,
          eq(
            inventoryCostLayers.productionBatchOutputId,
            productionBatchOutputs.id,
          ),
        )
        .where(inArray(inventoryCostAllocations.saleItemId, itemIds))) as Array<
        Omit<AccrualMarginAllocation, 'saleItemId'> & {
          saleItemId: number | null
        }
      >)
    : []
  const allocations = allocationRows.map((allocation) => {
    if (allocation.saleItemId === null)
      throw new Error('Alocação FIFO de venda sem item vinculado.')
    return { ...allocation, saleItemId: allocation.saleItemId }
  })
  return {
    ...summarizeAccrualMargins({
      events,
      sales: saleRows,
      saleItems: itemRows,
      allocations,
    }),
    fifoCoverage: diagnoseDeliveryFifoCoverage({
      events,
      saleItems: itemRows,
      allocations,
    }),
  }
}

async function loadFinancialPosition(database: any, periodMonth: string) {
  const eventEffects = await loadPeriodSnapshot(database, periodMonth)
  const accrualMargins = await loadAccrualMargins(database, periodMonth)
  return {
    ...eventEffects,
    cogs: accrualMargins.cogs,
    grossMargin: accrualMargins.grossMargin,
    unattributedRevenue: accrualMargins.unattributedRevenue,
    reconciled: accrualMargins.reconciled,
  }
}

async function loadStoreCredits(database: any) {
  const events = (await database
    .select({
      id: financialEvents.id,
      type: financialEvents.type,
      settlesEventId: financialEvents.settlesEventId,
      saleId: financialEvents.saleId,
      saleItemId: financialEvents.saleItemId,
      amount: financialEvents.amount,
      occurredAt: financialEvents.occurredAt,
      reason: financialEvents.reason,
    })
    .from(financialEvents)
    .where(
      inArray(financialEvents.type, [
        'store_credit_issued',
        'store_credit_redeemed',
      ]),
    )) as StoreCreditLedgerEvent[]
  return summarizeStoreCreditLedger(events)
}

function signedMoneyToCents(value: string, allowZero = false) {
  const normalized = value.trim().replace(',', '.')
  const negative = normalized.startsWith('-')
  const cents = moneyToCents(negative ? normalized.slice(1) : normalized)
  if (cents === null || (!allowZero && cents === 0n))
    throw new Error('A correção deve ter valor monetário diferente de zero.')
  return negative ? -cents : cents
}

function dateOnly(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function occurredAt(value: string) {
  return new Date(`${value}T12:00:00.000Z`)
}

export type FinanceDatabase = {
  transaction: (work: (tx: any) => Promise<any>) => Promise<any>
}

type PaidSaleCashInput = {
  id: number
  status: string
  totalAmount: string
  soldAt: Date
}

export async function appendPaidSaleCashReceipt(
  tx: any,
  sale: PaidSaleCashInput,
  actorAuthUserId: string,
) {
  if (sale.status !== 'paid') return null
  if (!actorAuthUserId)
    throw new Error('Recebimento de venda paga exige autoria autenticada.')
  try {
    await requireFinancialSchema(tx)
    const amount = moneyToCents(sale.totalAmount)
    if (amount === null || amount <= 0n)
      throw new Error('Venda paga não possui valor financeiro válido.')
    const cashDate = dateOnly(sale.soldAt)
    const key = `finance:sale-delivery:${sale.id}:cash`
    const hash = await hashOperationPayload({
      saleId: sale.id,
      amount: centsToMoney(amount),
      occurredOn: cashDate,
    })
    const [existing] = await tx
      .select({
        id: financialEvents.id,
        idempotencyHash: financialEvents.idempotencyHash,
      })
      .from(financialEvents)
      .where(eq(financialEvents.idempotencyKey, key))
      .limit(1)
    const replay = resolveIdempotentReplay(existing, hash)
    if (replay) return replay

    await assertOpenPeriod(tx, cashDate)
    const [receipt] = await tx
      .insert(financialEvents)
      .values({
        idempotencyKey: key,
        idempotencyHash: hash,
        type: 'cash_receipt',
        saleId: sale.id,
        amount: centsToMoney(amount),
        revenueEffect: '0.00',
        cashEffect: centsToMoney(amount),
        competenceDate: cashDate,
        occurredAt: sale.soldAt,
        reason: 'Recebimento da venda paga',
        createdByAuthUserId: actorAuthUserId,
      })
      .returning({ id: financialEvents.id })
    if (!receipt) throw new Error('Não foi possível registrar o recebimento.')
    return { id: receipt.id, replayed: false as const }
  } catch (error) {
    assertFinancialSchema(error)
  }
}

export async function appendPaidSaleCancellationCashRefund(
  tx: any,
  sale: PaidSaleCashInput,
  input: { occurredOn: string; reason: string },
  actorAuthUserId: string,
) {
  if (sale.status !== 'paid') return null
  try {
    await appendPaidSaleCashReceipt(tx, sale, actorAuthUserId)
    const amount = moneyToCents(sale.totalAmount)
    if (amount === null || amount <= 0n)
      throw new Error('Venda paga não possui valor financeiro válido.')
    const key = `finance:sale-cancellation:${sale.id}:cash-refund`
    const hash = await hashOperationPayload({
      saleId: sale.id,
      amount: centsToMoney(amount),
      occurredOn: input.occurredOn,
    })
    const [existing] = await tx
      .select({
        id: financialEvents.id,
        idempotencyHash: financialEvents.idempotencyHash,
      })
      .from(financialEvents)
      .where(eq(financialEvents.idempotencyKey, key))
      .limit(1)
    const replay = resolveIdempotentReplay(existing, hash)
    if (replay) return replay

    await assertOpenPeriod(tx, input.occurredOn)
    const [refund] = await tx
      .insert(financialEvents)
      .values({
        idempotencyKey: key,
        idempotencyHash: hash,
        type: 'cash_refund',
        saleId: sale.id,
        amount: centsToMoney(amount),
        revenueEffect: '0.00',
        cashEffect: centsToMoney(-amount),
        competenceDate: input.occurredOn,
        occurredAt: occurredAt(input.occurredOn),
        reason: input.reason,
        createdByAuthUserId: actorAuthUserId,
        authorizedByAuthUserId: actorAuthUserId,
      })
      .returning({ id: financialEvents.id })
    if (!refund)
      throw new Error('Não foi possível registrar o estorno de caixa.')
    return { id: refund.id, replayed: false as const }
  } catch (error) {
    assertFinancialSchema(error)
  }
}

export async function persistSaleDelivery(
  database: FinanceDatabase,
  data: DeliverSaleInput,
  actorAuthUserId: string,
) {
  const key = `finance:sale-delivery:${data.saleId}`
  const hash = await hashOperationPayload(data)
  return database.transaction(async (tx) => {
    try {
      await requireFinancialSchema(tx)
      await tx.execute(
        sql`select id from ${sales} where ${sales.id} = ${data.saleId} for update`,
      )
      const [existing] = await tx
        .select({
          id: financialEvents.id,
          idempotencyHash: financialEvents.idempotencyHash,
        })
        .from(financialEvents)
        .where(eq(financialEvents.idempotencyKey, key))
        .limit(1)
      const replay = resolveIdempotentReplay(existing, hash)
      if (replay) return replay

      const [sale] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, data.saleId))
      if (!sale || !['confirmed', 'paid'].includes(sale.status))
        throw new Error('Entrega exige venda confirmada ou paga.')
      if (sale.deliveredAt)
        throw new Error('Venda já possui entrega registrada.')
      await assertOpenPeriod(tx, data.deliveredOn)

      const amount = moneyToCents(sale.totalAmount)
      if (amount === null || amount <= 0n)
        throw new Error('Venda não possui valor financeiro válido.')
      const [event] = await tx
        .insert(financialEvents)
        .values({
          idempotencyKey: key,
          idempotencyHash: hash,
          type: 'sale_revenue',
          saleId: sale.id,
          amount: centsToMoney(amount),
          revenueEffect: centsToMoney(amount),
          cashEffect: '0.00',
          competenceDate: data.deliveredOn,
          occurredAt: occurredAt(data.deliveredOn),
          reason: 'Entrega confirmada',
          createdByAuthUserId: actorAuthUserId,
        })
        .returning({ id: financialEvents.id })
      if (!event)
        throw new Error('Não foi possível registrar a receita da entrega.')

      await appendPaidSaleCashReceipt(tx, sale, actorAuthUserId)

      await tx
        .update(sales)
        .set({
          deliveredAt: occurredAt(data.deliveredOn),
          updatedAt: new Date(),
        })
        .where(eq(sales.id, sale.id))
      await appendOperationalAudit(tx, {
        actorAuthUserId,
        action: 'sale.deliver',
        entityType: 'sale',
        entityId: sale.id,
        operationReference: key,
        reason: 'Entrega confirmada',
      })
      return { id: event.id, replayed: false as const }
    } catch (error) {
      assertFinancialSchema(error)
    }
  })
}

export const deliverSale = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('deliverSale')])
  .validator(deliverSaleValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistSaleDelivery(getDb(), data, context.principal!.id)
  })

export async function persistDeliveredSaleCompensation(
  database: FinanceDatabase,
  data: CompensateSaleInput,
  actorAuthUserId: string,
) {
  const key = `finance:sale-compensation:${data.saleItemId}:${data.reference}`
  const hash = await hashOperationPayload(data)
  return database.transaction(async (tx) => {
    try {
      await requireFinancialSchema(tx)
      await tx.execute(
        sql`select id from ${saleItems} where ${saleItems.id} = ${data.saleItemId} for update`,
      )
      const [existing] = await tx
        .select({
          id: financialEvents.id,
          idempotencyHash: financialEvents.idempotencyHash,
        })
        .from(financialEvents)
        .where(eq(financialEvents.idempotencyKey, key))
        .limit(1)
      const replay = resolveIdempotentReplay(existing, hash)
      if (replay) return replay

      const [item] = await tx
        .select()
        .from(saleItems)
        .where(eq(saleItems.id, data.saleItemId))
      if (!item) throw new Error('Item de venda não encontrado.')
      const [sale] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, item.saleId))
      if (!sale?.deliveredAt)
        throw new Error('Compensação exige venda previamente entregue.')
      await assertOpenPeriod(tx, data.occurredOn)

      const prior = (await tx
        .select({
          saleItemId: financialEvents.saleItemId,
          quantity: financialEvents.quantity,
          amount: financialEvents.amount,
        })
        .from(financialEvents)
        .where(
          and(
            eq(financialEvents.saleItemId, item.id),
            inArray(financialEvents.type, [
              'cash_refund',
              'store_credit_issued',
            ]),
          ),
        )) as Array<{
        saleItemId: number | null
        quantity: string | null
        amount: string
      }>
      const priorQuantity = prior.reduce(
        (sum, row) =>
          sum + (row.quantity ? quantityToThousandths(row.quantity)! : 0n),
        0n,
      )
      const priorAmount = prior.reduce(
        (sum, row) => sum + (moneyToCents(row.amount) ?? 0n),
        0n,
      )
      const amount = calculateCompensationAmount({
        itemAmount: item.reportedAmount ?? item.totalAmount,
        itemQuantity: item.quantity,
        priorCompensatedAmount: centsToMoney(priorAmount),
        priorCompensatedQuantity: thousandthsToQuantity(priorQuantity),
        requestedQuantity: data.quantity,
      })
      const amountCents = moneyToCents(amount)!
      const [event] = await tx
        .insert(financialEvents)
        .values({
          idempotencyKey: key,
          idempotencyHash: hash,
          type:
            data.settlement === 'refund'
              ? 'cash_refund'
              : 'store_credit_issued',
          saleId: sale.id,
          saleItemId: item.id,
          quantity: thousandthsToQuantity(
            quantityToThousandths(data.quantity)!,
          ),
          amount,
          revenueEffect: centsToMoney(-amountCents),
          cashEffect:
            data.settlement === 'refund' ? centsToMoney(-amountCents) : '0.00',
          competenceDate: data.occurredOn,
          occurredAt: occurredAt(data.occurredOn),
          reason: data.reason,
          createdByAuthUserId: actorAuthUserId,
          authorizedByAuthUserId: actorAuthUserId,
        })
        .returning({ id: financialEvents.id })
      if (!event) throw new Error('Não foi possível registrar a compensação.')
      await appendOperationalAudit(tx, {
        actorAuthUserId,
        action: `sale.compensate.${data.settlement}`,
        entityType: 'sale_item',
        entityId: item.id,
        operationReference: key,
        reason: data.reason,
      })
      return { id: event.id, amount, replayed: false as const }
    } catch (error) {
      assertFinancialSchema(error)
    }
  })
}

export const compensateDeliveredSale = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('compensateDeliveredSale')])
  .validator(compensateSaleValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistDeliveredSaleCompensation(
      getDb(),
      data,
      context.principal!.id,
    )
  })

export async function persistStoreCreditRedemption(
  database: FinanceDatabase,
  data: RedeemStoreCreditInput,
  actorAuthUserId: string,
) {
  const key = `finance:store-credit-redemption:${data.reference}`
  const hash = await hashOperationPayload(data)
  return database.transaction(async (tx) => {
    try {
      await requireFinancialSchema(tx)
      await tx.execute(
        sql`select id from ${financialEvents} where ${financialEvents.id} = ${data.issuanceEventId} for update`,
      )
      const [issuance] = await tx
        .select()
        .from(financialEvents)
        .where(eq(financialEvents.id, data.issuanceEventId))
        .limit(1)
      if (!issuance || issuance.type !== 'store_credit_issued')
        throw new Error('Emissão de crédito não encontrada.')

      const [existing] = await tx
        .select({
          id: financialEvents.id,
          idempotencyHash: financialEvents.idempotencyHash,
        })
        .from(financialEvents)
        .where(eq(financialEvents.idempotencyKey, key))
        .limit(1)
      const replay = resolveIdempotentReplay(existing, hash)
      const prior = (await tx
        .select({ amount: financialEvents.amount })
        .from(financialEvents)
        .where(
          and(
            eq(financialEvents.type, 'store_credit_redeemed'),
            eq(financialEvents.settlesEventId, issuance.id),
          ),
        )) as Array<{ amount: string }>
      if (replay) {
        const currentBalance = calculateStoreCreditBalance({
          issuedAmount: issuance.amount,
          redeemedAmounts: prior.map((event) => event.amount),
        })
        return { ...replay, remaining: currentBalance.available }
      }

      await assertOpenPeriod(tx, data.occurredOn)
      const balance = calculateStoreCreditBalance({
        issuedAmount: issuance.amount,
        redeemedAmounts: prior.map((event) => event.amount),
        requestedAmount: data.amount,
      })
      const amount = moneyToCents(data.amount)!
      const [redemption] = await tx
        .insert(financialEvents)
        .values({
          idempotencyKey: key,
          idempotencyHash: hash,
          type: 'store_credit_redeemed',
          saleId: issuance.saleId,
          saleItemId: issuance.saleItemId,
          settlesEventId: issuance.id,
          amount: centsToMoney(amount),
          revenueEffect: '0.00',
          cashEffect: '0.00',
          competenceDate: data.occurredOn,
          occurredAt: occurredAt(data.occurredOn),
          reason: data.reason,
          createdByAuthUserId: actorAuthUserId,
          authorizedByAuthUserId: actorAuthUserId,
        })
        .returning({ id: financialEvents.id })
      if (!redemption) throw new Error('Não foi possível resgatar o crédito.')
      await appendOperationalAudit(tx, {
        actorAuthUserId,
        action: 'store_credit.redeem',
        entityType: 'financial_event',
        entityId: redemption.id,
        operationReference: key,
        reason: data.reason,
      })
      return {
        id: redemption.id,
        remaining: balance.remainingAfterRequest,
        replayed: false as const,
      }
    } catch (error) {
      assertFinancialSchema(error)
    }
  })
}

export const redeemStoreCredit = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('redeemStoreCredit')])
  .validator(redeemStoreCreditValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistStoreCreditRedemption(getDb(), data, context.principal!.id)
  })

export async function persistFinancialPeriodClose(
  database: FinanceDatabase,
  data: CloseFinancialPeriodInput,
  actorAuthUserId: string,
) {
  return database.transaction(async (tx) => {
    try {
      await requireFinancialSchema(tx)
      const periodMonth = await lockFinancialPeriod(tx, data.periodMonth)
      const [existing] = await tx
        .select()
        .from(financialPeriods)
        .where(eq(financialPeriods.periodMonth, periodMonth))
        .limit(1)
      if (existing?.status === 'closed')
        throw new Error('Período financeiro já está fechado.')

      const snapshot = await loadFinancialPosition(tx, periodMonth)
      const closedAt = new Date()
      let periodId: number
      if (existing) {
        const [updated] = await tx
          .update(financialPeriods)
          .set({
            status: 'closed',
            version: existing.version + 1,
            closureSnapshot: snapshot,
            closureNotes: data.notes,
            closedByAuthUserId: actorAuthUserId,
            closedAt,
            updatedAt: closedAt,
          })
          .where(
            and(
              eq(financialPeriods.id, existing.id),
              eq(financialPeriods.version, existing.version),
              eq(financialPeriods.status, 'open'),
            ),
          )
          .returning({ id: financialPeriods.id })
        if (!updated)
          throw new Error('O período mudou durante o fechamento. Recarregue.')
        periodId = updated.id
      } else {
        const [inserted] = await tx
          .insert(financialPeriods)
          .values({
            periodMonth,
            status: 'closed',
            closureSnapshot: snapshot,
            closureNotes: data.notes,
            closedByAuthUserId: actorAuthUserId,
            closedAt,
          })
          .returning({ id: financialPeriods.id })
        if (!inserted) throw new Error('Não foi possível fechar o período.')
        periodId = inserted.id
      }
      await appendOperationalAudit(tx, {
        actorAuthUserId,
        action: 'financial_period.close',
        entityType: 'financial_period',
        entityId: periodId,
        operationReference: `financial-period:${periodMonth}:close`,
        reason: data.notes,
      })
      return { id: periodId, periodMonth, snapshot }
    } catch (error) {
      assertFinancialSchema(error)
    }
  })
}

export const closeFinancialPeriod = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('closeFinancialPeriod')])
  .validator(closeFinancialPeriodValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistFinancialPeriodClose(getDb(), data, context.principal!.id)
  })

export async function persistFinancialEventCorrection(
  database: FinanceDatabase,
  data: CorrectFinancialEventInput,
  actor: { id: string; role: AppRole },
) {
  const key = `finance:correction:${data.reference}`
  const hash = await hashOperationPayload(data)
  return database.transaction(async (tx) => {
    try {
      await requireFinancialSchema(tx)
      await tx.execute(
        sql`select id from ${financialEvents} where ${financialEvents.id} = ${data.correctsEventId} for update`,
      )
      const [target] = await tx
        .select()
        .from(financialEvents)
        .where(eq(financialEvents.id, data.correctsEventId))
        .limit(1)
      if (!target) throw new Error('Fato financeiro original não encontrado.')
      const periodMonth = await lockFinancialPeriod(tx, target.competenceDate)
      const [period] = await tx
        .select()
        .from(financialPeriods)
        .where(eq(financialPeriods.periodMonth, periodMonth))
        .limit(1)
      if (
        period?.status === 'closed' &&
        !canCorrectClosedFinancialPeriod(actor.role)
      )
        throw new Error('Somente o Dono pode corrigir período fechado.')

      const [existing] = await tx
        .select({
          id: financialEvents.id,
          idempotencyHash: financialEvents.idempotencyHash,
        })
        .from(financialEvents)
        .where(eq(financialEvents.idempotencyKey, key))
        .limit(1)
      const replay = resolveIdempotentReplay(existing, hash)
      if (replay) return replay

      const targetEffect =
        data.effect === 'revenue' ? target.revenueEffect : target.cashEffect
      if (signedMoneyToCents(targetEffect, true) === 0n)
        throw new Error('O fato original não afeta a visão selecionada.')
      const delta = signedMoneyToCents(data.deltaAmount)
      const [correction] = await tx
        .insert(financialEvents)
        .values({
          idempotencyKey: key,
          idempotencyHash: hash,
          type:
            data.effect === 'revenue'
              ? 'revenue_correction'
              : 'cash_correction',
          saleId: target.saleId,
          saleItemId: target.saleItemId,
          correctsEventId: target.id,
          amount: centsToMoney(delta),
          revenueEffect:
            data.effect === 'revenue' ? centsToMoney(delta) : '0.00',
          cashEffect: data.effect === 'cash' ? centsToMoney(delta) : '0.00',
          competenceDate: target.competenceDate,
          occurredAt: occurredAt(data.occurredOn),
          reason: data.reason,
          createdByAuthUserId: actor.id,
          authorizedByAuthUserId: actor.id,
        })
        .returning({ id: financialEvents.id })
      if (!correction) throw new Error('Não foi possível registrar a correção.')

      if (period?.status === 'closed') {
        const snapshot = await loadFinancialPosition(tx, periodMonth)
        const [updatedPeriod] = await tx
          .update(financialPeriods)
          .set({
            version: period.version + 1,
            closureSnapshot: snapshot,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(financialPeriods.id, period.id),
              eq(financialPeriods.version, period.version),
            ),
          )
          .returning({ id: financialPeriods.id })
        if (!updatedPeriod)
          throw new Error(
            'O período mudou durante a correção. Recarregue e tente novamente.',
          )
      }
      await appendOperationalAudit(tx, {
        actorAuthUserId: actor.id,
        action: `financial_event.correct.${data.effect}`,
        entityType: 'financial_event',
        entityId: correction.id,
        operationReference: key,
        reason: data.reason,
      })
      return {
        id: correction.id,
        correctsEventId: target.id,
        competenceDate: target.competenceDate,
        replayed: false as const,
      }
    } catch (error) {
      assertFinancialSchema(error)
    }
  })
}

export const correctFinancialEvent = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('correctFinancialEvent')])
  .validator(correctFinancialEventValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistFinancialEventCorrection(getDb(), data, {
      id: context.principal!.id,
      role: context.principal!.role,
    })
  })

export const getFinancialOverview = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('getFinancialOverview')])
  .validator(financialOverviewValues)
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')
    const database = getDb()
    try {
      await requireFinancialSchema(database)
      const [period, events, currentSnapshot, accrualMargins, storeCredits] =
        await Promise.all([
          database
            .select({
              id: financialPeriods.id,
              status: financialPeriods.status,
              version: financialPeriods.version,
              closureSnapshot: financialPeriods.closureSnapshot,
              closureNotes: financialPeriods.closureNotes,
              closedAt: financialPeriods.closedAt,
            })
            .from(financialPeriods)
            .where(eq(financialPeriods.periodMonth, data.periodMonth))
            .limit(1),
          database
            .select({
              id: financialEvents.id,
              type: financialEvents.type,
              saleId: financialEvents.saleId,
              saleItemId: financialEvents.saleItemId,
              correctsEventId: financialEvents.correctsEventId,
              settlesEventId: financialEvents.settlesEventId,
              amount: financialEvents.amount,
              revenueEffect: financialEvents.revenueEffect,
              cashEffect: financialEvents.cashEffect,
              competenceDate: financialEvents.competenceDate,
              occurredAt: financialEvents.occurredAt,
              reason: financialEvents.reason,
            })
            .from(financialEvents)
            .where(
              and(
                gte(financialEvents.competenceDate, data.periodMonth),
                lt(financialEvents.competenceDate, nextMonth(data.periodMonth)),
              ),
            )
            .orderBy(desc(financialEvents.occurredAt), desc(financialEvents.id))
            .limit(100),
          loadPeriodSnapshot(database, data.periodMonth),
          loadAccrualMargins(database, data.periodMonth),
          loadStoreCredits(database),
        ])
      const selectedPeriod = period.at(0)
      return {
        periodMonth: data.periodMonth,
        period: selectedPeriod
          ? {
              ...selectedPeriod,
              closureSnapshot: parseClosureSnapshot(
                selectedPeriod.closureSnapshot,
              ),
            }
          : null,
        currentSnapshot,
        accrualMargins,
        storeCredits,
        events,
        eventsLimited: currentSnapshot.eventCount > events.length,
      }
    } catch (error) {
      assertFinancialSchema(error)
    }
  })
