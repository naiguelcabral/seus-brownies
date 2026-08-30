import assert from 'node:assert/strict'
import test from 'node:test'

import {
  consumptionProductIds,
  movementsForProduct,
  profileComponentToConsumption,
  recipeItemToConsumption,
} from '../src/features/production/identities'

test('item de receita usa o ID do produto de catálogo, não o ID de recipe_items', () => {
  const consumption = recipeItemToConsumption({
    recipeItemId: 2,
    productId: 21,
    sku: 'INS004',
    name: 'Farinha de Trigo',
    unit: 'g',
    type: 'ingredient',
  })

  assert.equal(consumption.id, 21)
  assert.equal(consumption.recipeItemId, 2)
})

test('componente de recheio preserva o ID do produto de catálogo', () => {
  const consumption = profileComponentToConsumption({
    productId: 34,
    sku: 'INS013',
    name: 'Brigadeiro (Recheio)',
    unit: 'g',
    type: 'ingredient',
  })

  assert.equal(consumption.id, 34)
  assert.equal(consumption.productId, 34)
})

test('consulta de movimentos usa o mesmo ID do produto comprado', () => {
  const flour = recipeItemToConsumption({
    recipeItemId: 2,
    productId: 21,
    sku: 'INS004',
    name: 'Farinha de Trigo',
    unit: 'g',
    type: 'ingredient',
  })
  const movements = [
    { productId: 21, quantityDelta: '240.000', unitCost: '0.005' },
    { productId: 2, quantityDelta: '5.000', unitCost: '1.000' },
  ]

  assert.deepEqual(consumptionProductIds([flour]), [21])
  assert.deepEqual(movementsForProduct(movements, flour.id), [movements[0]])
  assert.equal(movementsForProduct(movements, flour.id)[0].quantityDelta, '240.000')
})
