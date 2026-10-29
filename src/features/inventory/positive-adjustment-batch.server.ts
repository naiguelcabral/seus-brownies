import { inArray } from 'drizzle-orm'
import { products, stockMovements } from '../../db/schema'
import type { DatabaseReader } from '../../db/contracts'
import { inventoryEventSourceKey } from './lifecycle'
import { previewPositiveAdjustmentBatch } from './positive-adjustment-batch'
import type { PositiveAdjustmentBatch } from './positive-adjustment-batch'

export async function readPositiveAdjustmentBatch(
  database: DatabaseReader,
  batch: PositiveAdjustmentBatch,
) {
  const [catalog, movements] = await Promise.all([
    database
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        unit: products.unit,
        isActive: products.isActive,
      })
      .from(products)
      .where(
        inArray(
          products.id,
          batch.adjustments.map((item) => item.productId),
        ),
      ),
    database
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        sourceKey: stockMovements.sourceKey,
        referenceType: stockMovements.referenceType,
        quantityDelta: stockMovements.quantityDelta,
        allocatedCost: stockMovements.allocatedCost,
        exactCost: stockMovements.exactCost,
        notes: stockMovements.notes,
      })
      .from(stockMovements)
      .where(
        inArray(
          stockMovements.sourceKey,
          batch.adjustments.map((item) =>
            inventoryEventSourceKey(
              'adjustment-positive',
              item.productId,
              item.reference,
            ),
          ),
        ),
      ),
  ]).catch(() => {
    throw new Error(
      'Não foi possível consultar o estoque. Tente conferir novamente.',
    )
  })
  return previewPositiveAdjustmentBatch(batch, catalog, movements)
}
