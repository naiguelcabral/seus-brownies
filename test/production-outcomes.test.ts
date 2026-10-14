import assert from 'node:assert/strict'
import test from 'node:test'

import {
  summarizeCoProducts,
  summarizeDeclaredLosses,
} from '../src/features/reports/production-outcomes'

test('perdas somam somente declarações por produto sem custo presumido', () => {
  assert.deepEqual(
    summarizeDeclaredLosses([
      { productId: 2, productName: 'Brownie', quantity: '1.250' },
      { productId: 2, productName: 'Brownie', quantity: '0.750' },
      { productId: 1, productName: 'Bordinhas', quantity: '0.125' },
    ]),
    [
      {
        productId: 1,
        productName: 'Bordinhas',
        quantity: '0.125',
        declarations: 1,
      },
      {
        productId: 2,
        productName: 'Brownie',
        quantity: '2.000',
        declarations: 2,
      },
    ],
  )
  assert.deepEqual(summarizeDeclaredLosses([]), [])
})

test('coproduto soma quantidades e custos alocados exatos sem virar perda', () => {
  assert.deepEqual(
    summarizeCoProducts([
      {
        productId: 1,
        productName: 'Bordinhas',
        actualQuantity: '9007199254740993.125',
        allocatedCost: '90071992547409.93',
      },
      {
        productId: 1,
        productName: 'Bordinhas',
        actualQuantity: '0.875',
        allocatedCost: '0.07',
      },
    ]),
    [
      {
        productId: 1,
        productName: 'Bordinhas',
        quantity: '9007199254740994.000',
        allocatedCost: '90071992547410.00',
        missingQuantityRows: 0,
        missingCostRows: 0,
      },
    ],
  )
})

test('lacuna de custo ou rendimento não é apresentada como zero', () => {
  assert.deepEqual(
    summarizeCoProducts([
      {
        productId: 1,
        productName: 'Bordinhas',
        actualQuantity: null,
        allocatedCost: '1.00',
      },
      {
        productId: 1,
        productName: 'Bordinhas',
        actualQuantity: '2.000',
        allocatedCost: null,
      },
    ]),
    [
      {
        productId: 1,
        productName: 'Bordinhas',
        quantity: null,
        allocatedCost: null,
        missingQuantityRows: 1,
        missingCostRows: 1,
      },
    ],
  )
  assert.throws(
    () =>
      summarizeCoProducts([
        {
          productId: 1,
          productName: 'Bordinhas',
          actualQuantity: '1.0001',
          allocatedCost: '1.00',
        },
      ]),
    /Quantidade de coproduto inválida/,
  )
})
