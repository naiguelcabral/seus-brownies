import assert from 'node:assert/strict'
import test from 'node:test'

import {
  hmlFifoSalePrefixes,
  planHmlFifoBackfill,
} from '../src/features/inventory/hml-backfill'

function sales() {
  return hmlFifoSalePrefixes.map((prefix, index) => ({
    saleId: index + 1,
    prefix,
    status: 'confirmed',
    itemId: index + 1,
    productId: 3,
    sku: 'PROD003',
    quantity: '1.000',
    unitPrice: '12.00',
    totalAmount: '12.00',
    movementId: index + 20,
    movementQuantity: '-1.000',
    movementAllocatedCost: null,
  }))
}

const candidate = {
  productionBatchId: 18,
  productId: 3,
  sku: 'PROD003',
  originalQuantity: '12.000',
  originalCost: '45.33',
}

test('planeja o backfill HML a partir da saída reconciliada sem duplicar dados', () => {
  const plan = planHmlFifoBackfill({
    candidate,
    layer: null,
    sales: sales(),
    allocations: [],
  })
  assert.equal(plan.action, 'create')
  assert.deepEqual(
    plan.allocations.map((allocation) => allocation.allocatedCost),
    ['3.78', '3.78'],
  )
  assert.equal(plan.remainingQuantity, '10.000')
  assert.equal(plan.remainingCost, '37.77')
})

test('é idempotente quando a camada e as duas alocações já estão reconciliadas', () => {
  const plan = planHmlFifoBackfill({
    candidate,
    layer: {
      id: 1,
      ...candidate,
      remainingQuantity: '10.000',
      remainingCost: '37.77',
    },
    sales: sales().map((sale) => ({ ...sale, movementAllocatedCost: '3.78' })),
    allocations: [
      {
        saleItemId: 1,
        outgoingStockMovementId: 20,
        quantity: '1.000',
        allocatedCost: '3.78',
      },
      {
        saleItemId: 2,
        outgoingStockMovementId: 21,
        quantity: '1.000',
        allocatedCost: '3.78',
      },
    ],
  })
  assert.equal(plan.action, 'noop')
})

test('aborta antes de escrita diante de pré-condição HML divergente', () => {
  assert.throws(
    () =>
      planHmlFifoBackfill({
        candidate,
        layer: null,
        sales: sales().map((sale, index) =>
          index === 0 ? { ...sale, totalAmount: '1.20' } : sale,
        ),
        allocations: [],
      }),
    /divergente/,
  )
})
