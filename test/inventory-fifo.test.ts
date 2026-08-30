import assert from 'node:assert/strict'
import test from 'node:test'

import {
  allocateFifoCost,
  assertNoDuplicateLayerAllocations,
  createProductionCostLayer,
  createsSaleCostAllocation,
  orderFifoLayers,
} from '../src/features/inventory/fifo'
import { calculateUnitCostMillisTotal } from '../src/features/operations/calculations'

function layer(input: {
  id: number
  outputId: number
  productId?: number
  availableAt?: string
  quantity: bigint
  cost: bigint
}) {
  return createProductionCostLayer({
    id: input.id,
    productId: input.productId ?? 3,
    productionBatchOutputId: input.outputId,
    sourceStockMovementId: input.id + 100,
    availableAt: input.availableAt ?? '2026-08-29T22:16:43.810Z',
    quantity: input.quantity,
    allocatedCost: input.cost,
  })
}

test('HML aloca duas vendas de PROD003 e preserva o resíduo da camada', () => {
  const original = [layer({ id: 1, outputId: 18, quantity: 12_000n, cost: 4_533n })]
  const first = allocateFifoCost(original, 3, 1_000n)
  const second = allocateFifoCost(first.layers, 3, 1_000n)

  assert.equal(first.allocatedCost, 378n)
  assert.equal(second.allocatedCost, 378n)
  assert.equal(second.layers[0].remainingQuantity, 10_000n)
  assert.equal(second.layers[0].remainingCost, 3_777n)
  assert.equal(378n + 378n + second.layers[0].remainingCost, 4_533n)
})

test('consumo parcial e final reconciliam o custo exato da camada', () => {
  const original = [layer({ id: 1, outputId: 10, quantity: 3_000n, cost: 100n })]
  const partial = allocateFifoCost(original, 3, 1_000n)
  const final = allocateFifoCost(partial.layers, 3, 2_000n)

  assert.equal(partial.allocatedCost, 33n)
  assert.equal(final.allocatedCost, 67n)
  assert.equal(final.layers[0].remainingQuantity, 0n)
  assert.equal(final.layers[0].remainingCost, 0n)
})

test('consome várias camadas pela ordem FIFO determinística', () => {
  const layers = [
    layer({
      id: 9,
      outputId: 20,
      availableAt: '2026-08-30T10:00:00.000Z',
      quantity: 1_000n,
      cost: 200n,
    }),
    layer({
      id: 4,
      outputId: 10,
      availableAt: '2026-08-29T10:00:00.000Z',
      quantity: 1_000n,
      cost: 150n,
    }),
  ]
  const plan = allocateFifoCost(layers, 3, 1_500n)

  assert.deepEqual(
    plan.allocations.map((allocation) => [allocation.layerId, allocation.quantity]),
    [
      [4, 1_000n],
      [9, 500n],
    ],
  )
  assert.equal(plan.allocatedCost, 250n)
})

test('desempata camadas com a mesma data pelo ID da saída e depois da camada', () => {
  const ordered = orderFifoLayers(
    [
      layer({ id: 9, outputId: 4, quantity: 1_000n, cost: 100n }),
      layer({ id: 2, outputId: 3, quantity: 1_000n, cost: 100n }),
      layer({ id: 1, outputId: 3, quantity: 1_000n, cost: 100n }),
    ],
    3,
  )
  assert.deepEqual(ordered.map((item) => item.id), [1, 2, 9])
})

test('recusa quantidade sem camada FIFO suficiente', () => {
  assert.throws(
    () => allocateFifoCost([layer({ id: 1, outputId: 1, quantity: 999n, cost: 10n })], 3, 1_000n),
    /insuficiente/,
  )
})

test('somente vendas confirmadas ou pagas alocam custo', () => {
  assert.equal(createsSaleCostAllocation('draft'), false)
  assert.equal(createsSaleCostAllocation('cancelled'), false)
  assert.equal(createsSaleCostAllocation('confirmed'), true)
  assert.equal(createsSaleCostAllocation('paid'), true)
})

test('recusa a duplicação da mesma camada no mesmo movimento de saída', () => {
  assert.throws(
    () =>
      assertNoDuplicateLayerAllocations([
        { layerId: 1, outgoingStockMovementId: 20 },
        { layerId: 1, outgoingStockMovementId: 20 },
      ]),
    /duplicada/,
  )
})

test('FIFO não altera o contrato de compra com custo de R$ 0,005', () => {
  assert.equal(calculateUnitCostMillisTotal(5n, 240_000n), 120n)
})
