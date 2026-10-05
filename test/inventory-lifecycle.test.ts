import assert from 'node:assert/strict'
import test from 'node:test'

import {
  allocateFifoCost,
  createIncomingCostLayer,
  createProductionCostLayer,
} from '../src/features/inventory/fifo'
import {
  assertPositiveAdjustment,
  planNegativeInventoryEvent,
  planRemainingReversalQuantities,
  planStockRestoration,
} from '../src/features/inventory/lifecycle'

function productionLayer(id: number, quantity: bigint, cost: bigint) {
  return createProductionCostLayer({
    id,
    productId: 3,
    productionBatchOutputId: id,
    sourceStockMovementId: id + 100,
    availableAt: `2026-09-0${id}T00:00:00.000Z`,
    quantity,
    allocatedCost: cost,
  })
}

test('cancelamento integral restaura a camada sem apagar a alocação', () => {
  const sold = allocateFifoCost([productionLayer(1, 1_000n, 378n)], 3, 1_000n)
  const restored = planStockRestoration({
    event: 'sale_cancellation',
    layers: sold.layers,
    allocations: [{ id: 10, ...sold.allocations[0] }],
    quantities: [{ allocationId: 10, quantity: 1_000n }],
  })
  assert.equal(restored.restoredCost, 378n)
  assert.equal(restored.layers[0].remainingQuantity, 1_000n)
  assert.equal(restored.reversals[0].originalAllocationId, 10)
})

test('perda e ajuste negativo consomem várias camadas FIFO com motivo', () => {
  const plan = planNegativeInventoryEvent({
    event: 'loss',
    reason: 'quebra',
    reference: 'contagem-1',
    layers: [
      productionLayer(1, 1_000n, 100n),
      productionLayer(2, 1_000n, 200n),
    ],
    productId: 3,
    quantity: 1_500n,
  })
  assert.deepEqual(
    plan.allocations.map((item) => item.layerId),
    [1, 2],
  )
  assert.equal(plan.allocatedCost, 200n)
  assert.throws(
    () =>
      planNegativeInventoryEvent({
        event: 'adjustment_negative',
        reason: '',
        reference: '',
        layers: [],
        productId: 3,
        quantity: 1n,
      }),
    /exige/,
  )
})

test('ajuste positivo exige custo e compra de acabado participa do FIFO global', () => {
  assert.throws(
    () =>
      assertPositiveAdjustment({
        quantity: 1_000n,
        totalCost: 0n,
        sourceReference: '',
      }),
    /exige/,
  )
  assertPositiveAdjustment({
    quantity: 1_000n,
    totalCost: 200n,
    sourceReference: 'nota-ajuste',
  })
  const plan = allocateFifoCost(
    [
      productionLayer(1, 1_000n, 100n),
      createIncomingCostLayer({
        id: 2,
        productId: 3,
        sourceStockMovementId: 200,
        origin: 'purchase',
        availableAt: '2026-09-03T00:00:00.000Z',
        quantity: 1_000n,
        allocatedCost: 250n,
      }),
    ],
    3,
    1_500n,
  )
  assert.deepEqual(
    plan.allocations.map((item) => item.layerId),
    [1, 2],
  )
  assert.equal(plan.allocatedCost, 225n)
})

test('devoluções sucessivas consomem somente o saldo ainda reversível', () => {
  const allocations = [
    { id: 1, quantity: 1_000n, reversedQuantity: 1_000n },
    { id: 2, quantity: 2_000n, reversedQuantity: 500n },
  ]
  assert.deepEqual(
    planRemainingReversalQuantities({
      allocations,
      requestedQuantity: 1_000n,
    }),
    [{ allocationId: 2, quantity: 1_000n }],
  )
  assert.throws(
    () =>
      planRemainingReversalQuantities({
        allocations,
        requestedQuantity: 2_000n,
      }),
    /ainda reversível/,
  )
})

test('cancelamento após devolução parcial planeja apenas o residual', () => {
  assert.deepEqual(
    planRemainingReversalQuantities({
      allocations: [
        { id: 1, quantity: 2_000n, reversedQuantity: 750n },
        { id: 2, quantity: 1_000n },
      ],
      requestedQuantity: null,
    }),
    [
      { allocationId: 1, quantity: 1_250n },
      { allocationId: 2, quantity: 1_000n },
    ],
  )
})
