import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertCompletableBatchStatus,
  assertLossReasons,
  assertSufficientStock,
  allocateOutputCosts,
  backfillMissingOutputAllocations,
  calculateRecipeCapacity,
  calculateUnitCostCents,
  calculateWeightedAverageCost,
  millisToUnitCost,
  unitCostToMillis,
} from '../src/features/production/calculations'

test('calcula capacidade e Bordinhas como coproduto', () => {
  const result = calculateRecipeCapacity(
    '1',
    [{ productId: 3, quantity: '12', expectedYield: '24' }],
    '12',
  )
  assert.equal(result.overCapacity, false)
  assert.equal(result.remaining, '0.500')
  assert.equal(result.suggestedBordinhas, '6.000')
})

test('rejeita rendimento que excede o multiplicador', () => {
  const result = calculateRecipeCapacity(
    '1',
    [{ productId: 3, quantity: '25', expectedYield: '24' }],
    '12',
  )
  assert.equal(result.overCapacity, true)
})

test('exige motivo em perda manual', () => {
  assert.throws(
    () => assertLossReasons([{ quantity: '1', reason: '  ' }]),
    /motivo/,
  )
})

test('rejeita conclusão repetida e saldo insuficiente', () => {
  assert.throws(() => assertCompletableBatchStatus('completed'), /rascunho/)
  assert.throws(
    () =>
      assertSufficientStock([
        { name: 'Chocolate', available: 1_000n, required: 1_001n },
      ]),
    /Estoque insuficiente/,
  )
})

test('reconstitui custo médio ponderado sem ponto flutuante', () => {
  const cost = calculateWeightedAverageCost([
    { quantityDelta: '100.000', unitCost: '2.00' },
    { quantityDelta: '100.000', unitCost: '4.00' },
    { quantityDelta: '-50.000', unitCost: null },
  ])
  assert.equal(millisToUnitCost(cost), '3.000')
})

test('preserva custo unitário de três casas sem arredondamento prematuro', () => {
  const flourUnitCost = unitCostToMillis('0.005')
  assert.equal(flourUnitCost, 5n)
  assert.equal(calculateUnitCostCents(flourUnitCost, 240_000n), 120n)
  const cost = calculateWeightedAverageCost([
    { quantityDelta: '240.000', unitCost: '0.005' },
  ])
  assert.equal(millisToUnitCost(cost), '0.005')
})

test('aloca R$ 68,00 entre as saídas do lote sem criar resíduo contábil', () => {
  const allocations = allocateOutputCosts(6_800n, [
    { productId: 3, quantity: 12_000n },
    { productId: 2, quantity: 6_000n },
  ])
  assert.deepEqual(
    allocations.map(({ productId, allocatedCost }) => ({
      productId,
      allocatedCost,
    })),
    [
      { productId: 3, allocatedCost: 4_533n },
      { productId: 2, allocatedCost: 2_267n },
    ],
  )
  assert.equal(
    allocations.reduce((sum, output) => sum + output.allocatedCost, 0n),
    6_800n,
  )
})

test('aloca custos entre mais de duas saídas proporcionalmente', () => {
  const allocations = allocateOutputCosts(101n, [
    { productId: 1, quantity: 1_000n },
    { productId: 2, quantity: 2_000n },
    { productId: 3, quantity: 3_000n },
  ])
  assert.deepEqual(
    allocations.map((output) => output.allocatedCost),
    [17n, 34n, 50n],
  )
  assert.equal(
    allocations.reduce((sum, output) => sum + output.allocatedCost, 0n),
    101n,
  )
})

test('desempata o resíduo pelo menor productId', () => {
  const allocations = allocateOutputCosts(100n, [
    { productId: 9, quantity: 1_000n },
    { productId: 3, quantity: 1_000n },
    { productId: 7, quantity: 1_000n },
  ])
  assert.deepEqual(
    allocations.map((output) => output.allocatedCost),
    [33n, 34n, 33n],
  )
})

test('o backfill de saídas de produção é idempotente', () => {
  const pending = [
    { productId: 3, quantity: 12_000n, allocatedCost: null },
    { productId: 2, quantity: 6_000n, allocatedCost: null },
  ]
  const once = backfillMissingOutputAllocations(6_800n, pending)
  const twice = backfillMissingOutputAllocations(6_800n, once)
  assert.deepEqual(once, twice)
  assert.equal(
    once.reduce((sum, output) => sum + (output.allocatedCost ?? 0n), 0n),
    6_800n,
  )
})
