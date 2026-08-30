import { and, eq, inArray, sql } from 'drizzle-orm'

import { getDb } from '../src/db/index.ts'
import {
  inventoryCostAllocations,
  inventoryCostLayers,
  products,
  productionBatches,
  productionBatchOutputs,
  saleItems,
  sales,
  stockMovements,
} from '../src/db/schema.ts'
import {
  hmlFifoSalePrefixes,
  planHmlFifoBackfill,
} from '../src/features/inventory/hml-backfill.ts'

function usage(): never {
  throw new Error(
    'Uso: npm run fifo:backfill:hml -- --environment development --confirm',
  )
}

const args = process.argv.slice(2)
if (
  args.length !== 3 ||
  !args.includes('--confirm') ||
  !args.includes('--environment') ||
  args[args.indexOf('--environment') + 1] !== 'development'
)
  usage()

// This script intentionally does not load .env files. Its caller must provide
// the already-configured development runtime connection.
const database = getDb()

await database.transaction(async (tx) => {
  await tx.execute(
    sql`select id from ${productionBatchOutputs} where ${productionBatchOutputs.productionBatchId} = 18 for update`,
  )
  await tx.execute(
    sql`select id from ${sales} where ${sales.notes} in ${hmlFifoSalePrefixes} order by ${sales.id} for update`,
  )

  const [candidateLayers, saleRows, itemRows, movementRows] = await Promise.all([
    tx
      .select({
        layerId: inventoryCostLayers.id,
        outputId: productionBatchOutputs.id,
        productionBatchId: productionBatchOutputs.productionBatchId,
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
      .innerJoin(
        productionBatches,
        eq(productionBatchOutputs.productionBatchId, productionBatches.id),
      )
      .innerJoin(
        stockMovements,
        and(
          eq(stockMovements.referenceType, 'production_output'),
          eq(stockMovements.referenceId, productionBatchOutputs.productionBatchId),
          eq(stockMovements.productId, productionBatchOutputs.productId),
        ),
      )
      .leftJoin(
        inventoryCostLayers,
        eq(
          inventoryCostLayers.productionBatchOutputId,
          productionBatchOutputs.id,
        ),
      )
      .where(
        and(
          eq(productionBatchOutputs.productionBatchId, 18),
          eq(products.sku, 'PROD003'),
          eq(productionBatches.status, 'completed'),
        ),
      ),
    tx
      .select({ id: sales.id, prefix: sales.notes, status: sales.status })
      .from(sales)
      .where(inArray(sales.notes, hmlFifoSalePrefixes)),
    tx
      .select({
        id: saleItems.id,
        saleId: saleItems.saleId,
        productId: saleItems.productId,
        sku: products.sku,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        totalAmount: saleItems.totalAmount,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(inArray(sales.notes, hmlFifoSalePrefixes)),
    tx
      .select({
        id: stockMovements.id,
        saleId: stockMovements.referenceId,
        productId: stockMovements.productId,
        quantity: stockMovements.quantityDelta,
        allocatedCost: stockMovements.allocatedCost,
      })
      .from(stockMovements)
      .innerJoin(sales, eq(stockMovements.referenceId, sales.id))
      .where(
        and(
          eq(stockMovements.type, 'sale'),
          eq(stockMovements.referenceType, 'sale'),
          inArray(sales.notes, hmlFifoSalePrefixes),
        ),
      ),
  ])

  if (candidateLayers.length !== 1)
    throw new Error('Backfill HML requer uma única saída PROD003 no lote 18.')
  const candidate = candidateLayers[0]
  if (!candidate.quantity || !candidate.allocatedCost)
    throw new Error('Backfill HML requer quantidade e custo alocado na saída.')
  const layer = candidate.layerId
    ? {
        id: candidate.layerId,
        productionBatchId: candidate.productionBatchId,
        productId: candidate.productId,
        sku: candidate.sku,
        originalQuantity: candidate.layerOriginalQuantity!,
        originalCost: candidate.layerOriginalCost!,
        remainingQuantity: candidate.remainingQuantity!,
        remainingCost: candidate.remainingCost!,
      }
    : null
  const allocations = layer
    ? await tx
        .select({
          saleItemId: inventoryCostAllocations.saleItemId,
          outgoingStockMovementId:
            inventoryCostAllocations.outgoingStockMovementId,
          quantity: inventoryCostAllocations.quantity,
          allocatedCost: inventoryCostAllocations.allocatedCost,
        })
        .from(inventoryCostAllocations)
        .where(eq(inventoryCostAllocations.inventoryCostLayerId, layer.id))
    : []
  const salesForPlan = saleRows.map((sale) => {
    const item = itemRows.filter((row) => row.saleId === sale.id)
    const movement = movementRows.filter((row) => row.saleId === sale.id)
    if (item.length !== 1 || movement.length !== 1 || !item[0].productId)
      throw new Error('Backfill HML requer um único item e movimento por venda.')
    return {
      saleId: sale.id,
      prefix: sale.prefix ?? '',
      status: sale.status,
      itemId: item[0].id,
      productId: item[0].productId,
      sku: item[0].sku,
      quantity: item[0].quantity,
      unitPrice: item[0].unitPrice,
      totalAmount: item[0].totalAmount,
      movementId: movement[0].id,
      movementQuantity: movement[0].quantity,
      movementAllocatedCost: movement[0].allocatedCost,
    }
  })
  const plan = planHmlFifoBackfill({
    candidate: {
      productionBatchId: candidate.productionBatchId,
      productId: candidate.productId,
      sku: candidate.sku,
      originalQuantity: candidate.quantity,
      originalCost: candidate.allocatedCost,
    },
    layer,
    sales: salesForPlan,
    allocations,
  })
  if (plan.action === 'noop') {
    console.log('Backfill HML FIFO já aplicado; nenhuma escrita necessária.')
    return
  }

  const [createdLayer] = layer
    ? [layer]
    : await tx
        .insert(inventoryCostLayers)
        .values({
          productId: candidate.productId,
          productionBatchOutputId: candidate.outputId,
          sourceStockMovementId: candidate.sourceMovementId,
          availableAt: candidate.availableAt,
          originalQuantity: candidate.quantity,
          originalCost: candidate.allocatedCost,
          remainingQuantity: plan.remainingQuantity,
          remainingCost: plan.remainingCost,
        })
        .returning({ id: inventoryCostLayers.id })
  await tx.insert(inventoryCostAllocations).values(
    plan.allocations.map((allocation) => ({
      inventoryCostLayerId: createdLayer.id,
      outgoingStockMovementId: allocation.outgoingStockMovementId,
      saleItemId: allocation.saleItemId,
      productId: allocation.productId,
      quantity: allocation.quantity,
      allocatedCost: allocation.allocatedCost,
      unitCost: allocation.unitCost,
    })),
  )
  await tx
    .update(inventoryCostLayers)
    .set({
      remainingQuantity: plan.remainingQuantity,
      remainingCost: plan.remainingCost,
      updatedAt: new Date(),
    })
    .where(eq(inventoryCostLayers.id, createdLayer.id))
  for (const allocation of plan.allocations) {
    await tx
      .update(stockMovements)
      .set({ allocatedCost: allocation.allocatedCost })
      .where(eq(stockMovements.id, allocation.outgoingStockMovementId))
  }
  console.log('Backfill HML FIFO concluído para as duas vendas autorizadas.')
})
