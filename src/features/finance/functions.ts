import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, sql } from 'drizzle-orm'

import {
  financialEvents,
  financialPeriods,
  saleItems,
  sales,
} from '#/db/schema'
import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'
import {
  compensateSaleValues,
  deliverSaleValues,
} from '#/features/finance/contracts'
import type {
  CompensateSaleInput,
  DeliverSaleInput,
} from '#/features/finance/contracts'
import { calculateCompensationAmount } from '#/features/finance/policy'
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

async function requireFinancialSchema(tx: {
  execute: (
    query: unknown,
  ) => Promise<{ rows: Array<{ financial_events: string | null }> }>
}) {
  const result = await tx.execute(
    sql`select to_regclass('public.financial_events') as financial_events`,
  )
  if (!result.rows[0]?.financial_events)
    throw new FinancialSchemaUnavailableError()
}

function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`
}

async function assertOpenPeriod(tx: any, competenceDate: string) {
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
