import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculatePriceCentsTotal,
  calculateUnitCostMillisTotal,
} from '../src/features/operations/calculations'

test('calcula R$ 12,00 por uma unidade a partir de centavos', () => {
  assert.equal(calculatePriceCentsTotal(1_200n, 1_000n), 1_200n)
})

test('calcula R$ 12,00 por uma unidade e meia', () => {
  assert.equal(calculatePriceCentsTotal(1_200n, 1_500n), 1_800n)
})

test('arredonda quantidade com tres casas para o centavo mais proximo', () => {
  assert.equal(calculatePriceCentsTotal(1n, 500n), 1n)
  assert.equal(calculatePriceCentsTotal(1_200n, 333n), 400n)
})

test('soma totais de venda de multiplos itens em centavos', () => {
  const total = [
    calculatePriceCentsTotal(1_200n, 1_000n),
    calculatePriceCentsTotal(500n, 2_000n),
  ].reduce((sum, item) => sum + item, 0n)
  assert.equal(total, 2_200n)
})

test('preserva a compra de R$ 0,005 por 240 unidades', () => {
  assert.equal(calculateUnitCostMillisTotal(5n, 240_000n), 120n)
})

test('o caso que antes reduzia R$ 12,00 para R$ 1,20 retorna R$ 12,00', () => {
  assert.equal(calculatePriceCentsTotal(1_200n, 1_000n), 1_200n)
})
