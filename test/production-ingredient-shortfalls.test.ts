import assert from 'node:assert/strict'
import test from 'node:test'
import { ingredientShortfalls } from '../src/features/production/ingredient-shortfalls'

test('déficits preservam unidades separadas e o limite exato do saldo', () => {
  const rows = [
    { productId: 1, unit: 'kg', quantity: '1.001', available: '1.000' },
    { productId: 2, unit: 'unit', quantity: '1', available: '1' },
    { productId: 3, unit: 'l', quantity: '2', available: '-0.500' },
  ]
  assert.deepEqual(ingredientShortfalls(rows), [
    { ...rows[0], shortfall: '0.001' },
    { ...rows[2], shortfall: '2.500' },
  ])
  assert.equal(rows[0].available, '1.000')
})

test('déficit grande é exato e dados inválidos não viram saldo zero', () => {
  assert.equal(
    ingredientShortfalls([
      { quantity: '9007199254740993.001', available: '9007199254740993.000' },
    ])[0].shortfall,
    '0.001',
  )
  assert.deepEqual(ingredientShortfalls([]), [])
  assert.throws(
    () => ingredientShortfalls([{ quantity: '1', available: 'inválido' }]),
    /Quantidade de insumo inválida/,
  )
})
