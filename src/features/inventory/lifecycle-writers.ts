import { createServerFn } from '@tanstack/react-start'
import { asc, eq, inArray, sql } from 'drizzle-orm'

import {
  inventoryCostAllocations,
  inventoryCostLayers,
  inventoryCostReversals,
  products,
  saleItems,
  sales,
  stockMovements,
} from '#/db/schema'
import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'
import {
  cancelSaleValues,
  negativeInventoryValues,
  positiveInventoryValues,
  returnSaleValues,
} from '#/features/inventory/lifecycle-contracts'
import type {
  CancelSaleInput,
  NegativeInventoryInput,
  PositiveInventoryInput,
  ReturnSaleInput,
} from '#/features/inventory/lifecycle-contracts'
import {
  assertPositiveAdjustment,
  planNegativeInventoryEvent,
  planRemainingReversalQuantities,
  planStockRestoration,
} from '#/features/inventory/lifecycle'
import { persistDeliveredSaleCompensation } from '#/features/finance/functions'
import { inventoryEffectForSaleLifecycle } from '#/features/finance/policy'
import {
  moneyToCents,
  quantityToThousandths,
} from '#/features/production/calculations'
import { appendOperationalAudit } from '#/features/operations/audit'

export class FifoLifecycleSchemaUnavailableError extends Error {
  constructor() {
    super('FIFO fase 2 requer a migration 0013_fifo_lifecycle antes de gravar.')
  }
}

export function assertFifoLifecycleSchema(error: unknown): never {
  const code = (error as { code?: string } | null)?.code
  if (code === '42P01' || code === '42703')
    throw new FifoLifecycleSchemaUnavailableError()
  throw error
}

/** Exported to make rollback semantics independently testable. */
export async function runLifecycleWriter<T>(
  transaction: <TResult>(work: () => Promise<TResult>) => Promise<TResult>,
  work: () => Promise<T>,
) {
  try {
    return await transaction(work)
  } catch (error) {
    assertFifoLifecycleSchema(error)
  }
}

const parseQuantity = (value: string) => {
  const [whole, fraction = ''] = value.replace(',', '.').split('.')
  return BigInt(`${whole}${fraction.padEnd(3, '0')}`)
}
const parseMoney = (value: string) => {
  const [whole, fraction = ''] = value.replace(',', '.').split('.')
  return BigInt(`${whole}${fraction.padEnd(2, '0')}`)
}
const quantity = (value: bigint) =>
  `${value / 1_000n}.${String(value % 1_000n).padStart(3, '0')}`
const money = (value: bigint) =>
  `${value / 100n}.${String(value % 100n).padStart(2, '0')}`
const sourceKey = (event: string, id: number, ref: string) =>
  `fifo-lifecycle:${event}:${id}:${ref}`

/** First statement in each transaction. It is read-only and fails closed. */
async function requireLifecycleSchema(tx: {
  execute: (
    query: unknown,
  ) => Promise<{ rows: Array<{ lifecycle_table: string | null }> }>
}) {
  const result = await tx.execute(
    sql`select to_regclass('public.inventory_cost_reversals') as lifecycle_table`,
  )
  if (!result.rows[0]?.lifecycle_table)
    throw new FifoLifecycleSchemaUnavailableError()
}

export function lifecycleLockOrder(productIds: number[]) {
  return [...new Set(productIds)].sort((a, b) => a - b)
}

/** Structural boundary used by the local transaction mock and the real Drizzle db. */
export type LifecycleDatabase = {
  transaction: (work: (tx: any) => Promise<any>) => Promise<any>
}

async function lockProductAndLayers(
  tx: { execute: (query: unknown) => Promise<unknown> },
  productIds: number[],
) {
  const ids = lifecycleLockOrder(productIds)
  await tx.execute(
    sql`select id from ${products} where ${products.id} in ${ids} order by ${products.id} for update`,
  )
  await tx.execute(
    sql`select id from ${inventoryCostLayers} where ${inventoryCostLayers.productId} in ${ids} order by ${inventoryCostLayers.productId}, ${inventoryCostLayers.availableAt}, ${inventoryCostLayers.id} for update`,
  )
}

// Drizzle's transaction type is adapter-private; this boundary is deliberately
// kept structural so the writers can also be exercised with a transaction mock.
async function loadLayers(tx: any, productIds: number[]) {
  const rows = await tx
    .select()
    .from(inventoryCostLayers)
    .where(inArray(inventoryCostLayers.productId, productIds))
    .orderBy(
      asc(inventoryCostLayers.productId),
      asc(inventoryCostLayers.availableAt),
      asc(inventoryCostLayers.id),
    )
  return rows.map((row: typeof inventoryCostLayers.$inferSelect) => ({
    ...row,
    availableAt: row.availableAt.toISOString(),
    originalQuantity: quantityToThousandths(row.originalQuantity)!,
    originalCost: moneyToCents(row.originalCost)!,
    remainingQuantity: quantityToThousandths(row.remainingQuantity)!,
    remainingCost: moneyToCents(row.remainingCost)!,
  }))
}

async function updateBalances(
  tx: any,
  layers: Array<{
    id: number
    remainingQuantity: bigint
    remainingCost: bigint
  }>,
) {
  for (const layer of layers.sort((a, b) => a.id - b.id))
    await tx
      .update(inventoryCostLayers)
      .set({
        remainingQuantity: quantity(layer.remainingQuantity),
        remainingCost: money(layer.remainingCost),
        updatedAt: new Date(),
      })
      .where(eq(inventoryCostLayers.id, layer.id))
}

async function assertUnused(tx: any, key: string) {
  const rows = await tx
    .select({ id: stockMovements.id })
    .from(stockMovements)
    .where(eq(stockMovements.sourceKey, key))
  if (rows.length)
    throw new Error('Evento FIFO já registrado para esta referência.')
}

async function applyReversal(
  tx: any,
  input: {
    allocations: Array<typeof inventoryCostAllocations.$inferSelect>
    layers: Awaited<ReturnType<typeof loadLayers>>
    requestedQuantity: bigint | null
    event: 'sale_cancellation'
    referenceId: number
    key: string
    reason: string
  },
) {
  const ids = input.allocations.map((row) => row.id)
  const existing = ids.length
    ? await tx
        .select()
        .from(inventoryCostReversals)
        .where(inArray(inventoryCostReversals.originalAllocationId, ids))
    : []
  const reversed = new Map<number, { quantity: bigint; cost: bigint }>()
  for (const row of existing) {
    const prior = reversed.get(row.originalAllocationId) ?? {
      quantity: 0n,
      cost: 0n,
    }
    prior.quantity += quantityToThousandths(row.quantity)!
    prior.cost += moneyToCents(row.restoredCost)!
    reversed.set(row.originalAllocationId, prior)
  }
  const reversibleAllocations = input.allocations.map((row) => ({
    id: row.id,
    layerId: row.inventoryCostLayerId,
    productId: row.productId,
    productionBatchOutputId: null,
    sourceStockMovementId: 0,
    quantity: quantityToThousandths(row.quantity)!,
    allocatedCost: moneyToCents(row.allocatedCost)!,
    reversedQuantity: reversed.get(row.id)?.quantity,
    reversedCost: reversed.get(row.id)?.cost,
  }))
  const requested = planRemainingReversalQuantities({
    allocations: reversibleAllocations,
    requestedQuantity: input.requestedQuantity,
  })
  const plan = planStockRestoration({
    event: input.event,
    layers: input.layers,
    quantities: requested,
    allocations: reversibleAllocations,
  })
  for (const reversal of plan.reversals) {
    const movementKey = `${input.key}:allocation:${reversal.originalAllocationId}`
    await assertUnused(tx, movementKey)
    const [movement] = await tx
      .insert(stockMovements)
      .values({
        productId: reversal.productId,
        type: 'return',
        quantityDelta: quantity(reversal.quantity),
        allocatedCost: money(reversal.allocatedCost),
        referenceType: input.event,
        referenceId: input.referenceId,
        sourceKey: movementKey,
        notes: input.reason,
      })
      .returning({ id: stockMovements.id })
    await tx.insert(inventoryCostReversals).values({
      originalAllocationId: reversal.originalAllocationId,
      incomingStockMovementId: movement.id,
      eventType: input.event,
      referenceType: input.event,
      referenceId: input.referenceId,
      quantity: quantity(reversal.quantity),
      restoredCost: money(reversal.allocatedCost),
    })
  }
  await updateBalances(tx, plan.layers)
  return plan
}

export async function persistSaleCancellation(
  database: LifecycleDatabase,
  data: CancelSaleInput,
  actorAuthUserId?: string,
) {
  return database.transaction(async (tx) => {
    try {
      await requireLifecycleSchema(tx)
      await tx.execute(
        sql`select id from ${sales} where ${sales.id} = ${data.saleId} for update`,
      )
      const [sale] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, data.saleId))
      if (!['confirmed', 'paid'].includes(sale.status))
        throw new Error('Apenas venda confirmada ou paga pode ser cancelada.')
      inventoryEffectForSaleLifecycle({
        event: 'cancellation',
        deliveredAt: sale.deliveredAt,
      })
      const items = await tx
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, sale.id))
      const allocations = (await tx
        .select()
        .from(inventoryCostAllocations)
        .where(
          inArray(
            inventoryCostAllocations.saleItemId,
            items.map((item: typeof saleItems.$inferSelect) => item.id),
          ),
        )) as Array<typeof inventoryCostAllocations.$inferSelect>
      if (!allocations.length)
        throw new Error('Venda não possui alocações FIFO para estornar.')
      await lockProductAndLayers(
        tx,
        allocations.map(
          (row: typeof inventoryCostAllocations.$inferSelect) => row.productId,
        ),
      )
      await tx.execute(
        sql`select id from ${inventoryCostAllocations} where ${inventoryCostAllocations.id} in ${allocations.map((row: typeof inventoryCostAllocations.$inferSelect) => row.id)} order by ${inventoryCostAllocations.id} for update`,
      )
      const layers = await loadLayers(tx, [
        ...new Set(
          allocations.map(
            (row: typeof inventoryCostAllocations.$inferSelect) =>
              row.productId,
          ),
        ),
      ])
      await applyReversal(tx, {
        allocations,
        layers,
        requestedQuantity: null,
        event: 'sale_cancellation',
        referenceId: sale.id,
        key: sourceKey('sale-cancellation', sale.id, 'cancel'),
        reason: data.reason,
      })
      await tx
        .update(sales)
        .set({
          status: 'cancelled',
          auditNotes: data.reason,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, sale.id))
      await appendOperationalAudit(tx, {
        actorAuthUserId,
        action: 'sale.cancel',
        entityType: 'sale',
        entityId: sale.id,
        operationReference: sourceKey('sale-cancellation', sale.id, 'cancel'),
        reason: data.reason,
      })
      return { status: 'cancelled' as const }
    } catch (error) {
      assertFifoLifecycleSchema(error)
    }
  })
}
export const cancelSaleLifecycle = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('cancelSaleLifecycle')])
  .validator(cancelSaleValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistSaleCancellation(getDb(), data, context.principal!.id)
  })

export async function persistSaleReturn(
  database: LifecycleDatabase,
  data: ReturnSaleInput,
  actorAuthUserId?: string,
) {
  if (!actorAuthUserId)
    throw new Error('Compensação exige autoria autenticada no servidor.')
  return persistDeliveredSaleCompensation(database, data, actorAuthUserId)
}
export const returnSaleLifecycle = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('returnSaleLifecycle')])
  .validator(returnSaleValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistSaleReturn(getDb(), data, context.principal!.id)
  })

export async function persistNegativeInventoryEvent(
  database: LifecycleDatabase,
  data: NegativeInventoryInput,
  event: 'loss' | 'adjustment_negative',
  actorAuthUserId?: string,
) {
  return database.transaction(async (tx) => {
    try {
      await requireLifecycleSchema(tx)
      await lockProductAndLayers(tx, [data.productId])
      const key = sourceKey(event, data.productId, data.reference)
      await assertUnused(tx, key)
      const plan = planNegativeInventoryEvent({
        event,
        reason: data.reason,
        reference: data.reference,
        layers: await loadLayers(tx, [data.productId]),
        productId: data.productId,
        quantity: parseQuantity(data.quantity),
      })
      const [movement] = await tx
        .insert(stockMovements)
        .values({
          productId: data.productId,
          type: event === 'loss' ? 'loss' : 'adjustment',
          quantityDelta: `-${quantity(parseQuantity(data.quantity))}`,
          allocatedCost: money(plan.allocatedCost),
          referenceType: event,
          sourceKey: key,
          notes: data.reason,
        })
        .returning({ id: stockMovements.id })
      await tx.insert(inventoryCostAllocations).values(
        plan.allocations.map((row) => ({
          inventoryCostLayerId: row.layerId,
          outgoingStockMovementId: movement.id,
          productId: row.productId,
          eventType: event === 'loss' ? 'loss' : 'adjustment_negative',
          eventReferenceType: event,
          quantity: quantity(row.quantity),
          allocatedCost: money(row.allocatedCost),
        })),
      )
      await updateBalances(tx, plan.layers)
      await appendOperationalAudit(tx, {
        actorAuthUserId,
        action: `inventory.${event}`,
        entityType: 'stock_movement',
        entityId: movement.id,
        operationReference: key,
        reason: data.reason,
      })
      return {
        movementId: movement.id,
        allocatedCost: money(plan.allocatedCost),
      }
    } catch (error) {
      assertFifoLifecycleSchema(error)
    }
  })
}

export const recordLossLifecycle = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('recordLossLifecycle')])
  .validator(negativeInventoryValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistNegativeInventoryEvent(
      getDb(),
      data,
      'loss',
      context.principal!.id,
    )
  })
export const recordNegativeAdjustmentLifecycle = createServerFn({
  method: 'POST',
})
  .middleware([
    requireServerFunctionPermission('recordNegativeAdjustmentLifecycle'),
  ])
  .validator(negativeInventoryValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistNegativeInventoryEvent(
      getDb(),
      data,
      'adjustment_negative',
      context.principal!.id,
    )
  })

export async function persistPositiveInventoryAdjustment(
  database: LifecycleDatabase,
  data: PositiveInventoryInput,
  actorAuthUserId?: string,
) {
  return database.transaction(async (tx) => {
    try {
      await requireLifecycleSchema(tx)
      await lockProductAndLayers(tx, [data.productId])
      const amount = parseQuantity(data.quantity)
      const cost = parseMoney(data.totalCost)
      assertPositiveAdjustment({
        quantity: amount,
        totalCost: cost,
        sourceReference: data.originReference,
      })
      const key = sourceKey(
        'adjustment-positive',
        data.productId,
        data.reference,
      )
      await assertUnused(tx, key)
      const [movement] = await tx
        .insert(stockMovements)
        .values({
          productId: data.productId,
          type: 'adjustment',
          quantityDelta: quantity(amount),
          allocatedCost: money(cost),
          referenceType: 'adjustment_positive',
          sourceKey: key,
          notes: `${data.reason} | origem: ${data.originReference}`,
        })
        .returning({ id: stockMovements.id })
      const [layer] = await tx
        .insert(inventoryCostLayers)
        .values({
          productId: data.productId,
          sourceStockMovementId: movement.id,
          origin: 'adjustment',
          availableAt: new Date(),
          originalQuantity: quantity(amount),
          originalCost: money(cost),
          remainingQuantity: quantity(amount),
          remainingCost: money(cost),
        })
        .returning({ id: inventoryCostLayers.id })
      await appendOperationalAudit(tx, {
        actorAuthUserId,
        action: 'inventory.adjustment_positive',
        entityType: 'stock_movement',
        entityId: movement.id,
        operationReference: key,
        reason: data.reason,
      })
      return { movementId: movement.id, layerId: layer.id }
    } catch (error) {
      assertFifoLifecycleSchema(error)
    }
  })
}
export const recordPositiveAdjustmentLifecycle = createServerFn({
  method: 'POST',
})
  .middleware([
    requireServerFunctionPermission('recordPositiveAdjustmentLifecycle'),
  ])
  .validator(positiveInventoryValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistPositiveInventoryAdjustment(
      getDb(),
      data,
      context.principal!.id,
    )
  })
