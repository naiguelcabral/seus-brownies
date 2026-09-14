import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'

import {
  financialEvents,
  financialPeriods,
  saleItems,
  sales,
} from '#/db/schema'
import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'
import {
  compensateSaleValues,
  closeFinancialPeriodValues,
  correctFinancialEventValues,
  deliverSaleValues,
  financialOverviewValues,
} from '#/features/finance/contracts'
import type {
  CloseFinancialPeriodInput,
  CompensateSaleInput,
  CorrectFinancialEventInput,
  DeliverSaleInput,
} from '#/features/finance/contracts'
import {
  calculateCompensationAmount,
  canCorrectClosedFinancialPeriod,
  summarizeFinancialEventEffects,
} from '#/features/finance/policy'
import type { AppRole } from '#/features/auth/authorization'
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
    super('G2 financeiro requer as migrations 0023 a 0025 antes de gravar.')
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

      if (sale.status === 'paid') {
        const cashDate = dateOnly(sale.soldAt)
        await assertOpenPeriod(tx, cashDate)
        const cashKey = `${key}:cash`
        const cashHash = await hashOperationPayload({
          saleId: sale.id,
          amount: centsToMoney(amount),
          occurredOn: cashDate,
        })
        await tx.insert(financialEvents).values({
          idempotencyKey: cashKey,
          idempotencyHash: cashHash,
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
      }

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

      const snapshot = await loadPeriodSnapshot(tx, periodMonth)
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
        const snapshot = await loadPeriodSnapshot(tx, periodMonth)
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
      const [period, events, currentSnapshot] = await Promise.all([
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
        events,
        eventsLimited: currentSnapshot.eventCount > events.length,
      }
    } catch (error) {
      assertFinancialSchema(error)
    }
  })
