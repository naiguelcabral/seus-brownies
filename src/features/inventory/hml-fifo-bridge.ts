import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, inArray, sql } from 'drizzle-orm'

import { getDb } from '#/db/index'
import {
  inventoryCostAllocations,
  inventoryCostLayers,
  products,
  productionBatches,
  productionBatchOutputs,
  saleItems,
  sales,
  stockMovements,
} from '#/db/schema'
import {
  hmlFifoSalePrefixes,
  planHmlFifoBackfill,
} from '#/features/inventory/hml-backfill'

function assertLocalDevelopment() {
  if (process.env.NODE_ENV !== 'development')
    throw new Error('Ponte HML disponível somente em development.')
  const hostname = new URL(getRequest().url).hostname
  if (hostname !== '127.0.0.1' && hostname !== 'localhost')
    throw new Error('Ponte HML aceita somente requisições locais.')
}

async function readState(database: ReturnType<typeof getDb>) {
  const [layers, allocations, saleRows, movements] = await Promise.all([
    database
      .select({
        id: inventoryCostLayers.id,
        sku: products.sku,
        originalQuantity: inventoryCostLayers.originalQuantity,
        originalCost: inventoryCostLayers.originalCost,
        remainingQuantity: inventoryCostLayers.remainingQuantity,
        remainingCost: inventoryCostLayers.remainingCost,
      })
      .from(inventoryCostLayers)
      .innerJoin(products, eq(inventoryCostLayers.productId, products.id))
      .innerJoin(
        productionBatchOutputs,
        eq(inventoryCostLayers.productionBatchOutputId, productionBatchOutputs.id),
      )
      .where(eq(productionBatchOutputs.productionBatchId, 18))
      .orderBy(inventoryCostLayers.id),
    database
      .select({
        id: inventoryCostAllocations.id,
        layerId: inventoryCostAllocations.inventoryCostLayerId,
        saleItemId: inventoryCostAllocations.saleItemId,
        movementId: inventoryCostAllocations.outgoingStockMovementId,
        quantity: inventoryCostAllocations.quantity,
        allocatedCost: inventoryCostAllocations.allocatedCost,
      })
      .from(inventoryCostAllocations)
      .innerJoin(saleItems, eq(inventoryCostAllocations.saleItemId, saleItems.id))
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(inArray(sales.notes, hmlFifoSalePrefixes))
      .orderBy(inventoryCostAllocations.id),
    database
      .select({ id: sales.id, prefix: sales.notes, total: sales.totalAmount })
      .from(sales)
      .where(inArray(sales.notes, hmlFifoSalePrefixes))
      .orderBy(sales.id),
    database
      .select({ id: stockMovements.id, allocatedCost: stockMovements.allocatedCost })
      .from(stockMovements)
      .innerJoin(sales, eq(stockMovements.referenceId, sales.id))
      .where(
        and(
          eq(stockMovements.type, 'sale'),
          eq(stockMovements.referenceType, 'sale'),
          inArray(sales.notes, hmlFifoSalePrefixes),
        ),
      )
      .orderBy(stockMovements.id),
  ])
  return { layers, allocations, sales: saleRows, movements }
}

async function applyBackfill(database: ReturnType<typeof getDb>) {
  return database.transaction(async (tx) => {
    await tx.execute(
      sql`select id from ${productionBatchOutputs} where ${productionBatchOutputs.productionBatchId} = 18 for update`,
    )
    await tx.execute(
      sql`select id from ${sales} where ${sales.notes} in ${hmlFifoSalePrefixes} order by ${sales.id} for update`,
    )
    const [candidateRows, saleRows, itemRows, movementRows] = await Promise.all([
      tx
        .select({
          layerId: inventoryCostLayers.id,
          outputId: productionBatchOutputs.id,
          productId: products.id,
          sku: products.sku,
          sourceMovementId: stockMovements.id,
          availableAt: stockMovements.occurredAt,
          quantity: productionBatchOutputs.actualQuantity,
          allocatedCost: productionBatchOutputs.allocatedCost,
          layerOriginalQuantity: inventoryCostLayers.originalQuantity,
          layerOriginalCost: inventoryCostLayers.originalCost,
          remainingQuantity: inventoryCostLayers.remainingQuantity,
          remainingCost: inventoryCostLayers.remainingCost,
        })
        .from(productionBatchOutputs)
        .innerJoin(products, eq(productionBatchOutputs.productId, products.id))
        .innerJoin(productionBatches, eq(productionBatchOutputs.productionBatchId, productionBatches.id))
        .innerJoin(stockMovements, and(eq(stockMovements.referenceType, 'production_output'), eq(stockMovements.referenceId, productionBatchOutputs.productionBatchId), eq(stockMovements.productId, productionBatchOutputs.productId)))
        .leftJoin(inventoryCostLayers, eq(inventoryCostLayers.productionBatchOutputId, productionBatchOutputs.id))
        .where(and(eq(productionBatchOutputs.productionBatchId, 18), eq(products.sku, 'PROD003'), eq(productionBatches.status, 'completed'))),
      tx.select({ id: sales.id, prefix: sales.notes, status: sales.status }).from(sales).where(inArray(sales.notes, hmlFifoSalePrefixes)),
      tx.select({ id: saleItems.id, saleId: saleItems.saleId, productId: saleItems.productId, sku: products.sku, quantity: saleItems.quantity, unitPrice: saleItems.unitPrice, totalAmount: saleItems.totalAmount }).from(saleItems).innerJoin(products, eq(saleItems.productId, products.id)).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(inArray(sales.notes, hmlFifoSalePrefixes)),
      tx.select({ id: stockMovements.id, saleId: stockMovements.referenceId, productId: stockMovements.productId, quantity: stockMovements.quantityDelta, allocatedCost: stockMovements.allocatedCost }).from(stockMovements).innerJoin(sales, eq(stockMovements.referenceId, sales.id)).where(and(eq(stockMovements.type, 'sale'), eq(stockMovements.referenceType, 'sale'), inArray(sales.notes, hmlFifoSalePrefixes))),
    ])
    if (candidateRows.length !== 1) throw new Error('Pré-checagem HML sem saída PROD003 única.')
    const candidate = candidateRows[0]
    if (!candidate.quantity || !candidate.allocatedCost) throw new Error('Pré-checagem HML sem custo ou quantidade.')
    const layer = candidate.layerId ? { id: candidate.layerId, productionBatchId: 18, productId: candidate.productId, sku: candidate.sku, originalQuantity: candidate.layerOriginalQuantity!, originalCost: candidate.layerOriginalCost!, remainingQuantity: candidate.remainingQuantity!, remainingCost: candidate.remainingCost! } : null
    const allocations = layer ? await tx.select({ saleItemId: inventoryCostAllocations.saleItemId, outgoingStockMovementId: inventoryCostAllocations.outgoingStockMovementId, quantity: inventoryCostAllocations.quantity, allocatedCost: inventoryCostAllocations.allocatedCost }).from(inventoryCostAllocations).where(eq(inventoryCostAllocations.inventoryCostLayerId, layer.id)) : []
    const plannedSales = saleRows.map((sale) => {
      const item = itemRows.filter((row) => row.saleId === sale.id)
      const movement = movementRows.filter((row) => row.saleId === sale.id)
      if (item.length !== 1 || movement.length !== 1 || !item[0].productId) throw new Error('Pré-checagem HML requer item e movimento únicos.')
      return { saleId: sale.id, prefix: sale.prefix ?? '', status: sale.status, itemId: item[0].id, productId: item[0].productId, sku: item[0].sku, quantity: item[0].quantity, unitPrice: item[0].unitPrice, totalAmount: item[0].totalAmount, movementId: movement[0].id, movementQuantity: movement[0].quantity, movementAllocatedCost: movement[0].allocatedCost }
    })
    const plan = planHmlFifoBackfill({ candidate: { productionBatchId: 18, productId: candidate.productId, sku: candidate.sku, originalQuantity: candidate.quantity, originalCost: candidate.allocatedCost }, layer, sales: plannedSales, allocations })
    if (plan.action === 'noop') return { action: 'noop' as const }
    const [createdLayer] = layer ? [layer] : await tx.insert(inventoryCostLayers).values({ productId: candidate.productId, productionBatchOutputId: candidate.outputId, sourceStockMovementId: candidate.sourceMovementId, availableAt: candidate.availableAt, originalQuantity: candidate.quantity, originalCost: candidate.allocatedCost, remainingQuantity: plan.remainingQuantity, remainingCost: plan.remainingCost }).returning({ id: inventoryCostLayers.id })
    await tx.insert(inventoryCostAllocations).values(plan.allocations.map((allocation) => ({ inventoryCostLayerId: createdLayer.id, outgoingStockMovementId: allocation.outgoingStockMovementId, saleItemId: allocation.saleItemId, productId: allocation.productId, quantity: allocation.quantity, allocatedCost: allocation.allocatedCost, unitCost: allocation.unitCost })))
    await tx.update(inventoryCostLayers).set({ remainingQuantity: plan.remainingQuantity, remainingCost: plan.remainingCost, updatedAt: new Date() }).where(eq(inventoryCostLayers.id, createdLayer.id))
    for (const allocation of plan.allocations) await tx.update(stockMovements).set({ allocatedCost: allocation.allocatedCost }).where(eq(stockMovements.id, allocation.outgoingStockMovementId))
    return { action: 'created' as const }
  })
}

export const inspectTemporaryHmlFifoBridge = createServerFn({ method: 'GET' }).handler(async () => {
  assertLocalDevelopment()
  return readState(getDb())
})

export const runTemporaryHmlFifoBridge = createServerFn({ method: 'POST' }).handler(async () => {
  assertLocalDevelopment()
  const database = getDb()
  const result = await applyBackfill(database)
  return { ...result, ...(await readState(database)) }
})
