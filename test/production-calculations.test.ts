import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertCompletableBatchStatus,
  assertLossReasons,
  assertSufficientStock,
  calculateRecipeCapacity,
  calculateWeightedAverageCost,
  centsToMoney,
} from '../src/features/production/calculations'

test('calcula capacidade e Bordinhas como coproduto', () => {
  const result = calculateRecipeCapacity('1', [{ productId: 3, quantity: '12', expectedYield: '24' }], '12')
  assert.equal(result.overCapacity, false)
  assert.equal(result.remaining, '0.500')
  assert.equal(result.suggestedBordinhas, '6.000')
})

test('rejeita rendimento que excede o multiplicador', () => {
  const result = calculateRecipeCapacity('1', [{ productId: 3, quantity: '25', expectedYield: '24' }], '12')
  assert.equal(result.overCapacity, true)
})

test('exige motivo em perda manual', () => {
  assert.throws(() => assertLossReasons([{ quantity: '1', reason: '  ' }]), /motivo/)
})

test('rejeita conclusão repetida e saldo insuficiente', () => {
  assert.throws(() => assertCompletableBatchStatus('completed'), /rascunho/)
  assert.throws(() => assertSufficientStock([{ name: 'Chocolate', available: 1_000n, required: 1_001n }]), /Estoque insuficiente/)
})

test('reconstitui custo médio ponderado sem ponto flutuante', () => {
  const cost = calculateWeightedAverageCost([
    { quantityDelta: '100.000', unitCost: '2.00' },
    { quantityDelta: '100.000', unitCost: '4.00' },
    { quantityDelta: '-50.000', unitCost: null },
  ])
  assert.equal(centsToMoney(cost), '3.00')
})
