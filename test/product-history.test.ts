import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateProductHistoryPage,
  productHistoryPageSize,
} from '../src/features/catalog/product-history'

test('paginação de produtos limita o tamanho e ajusta páginas fora do intervalo', () => {
  assert.equal(productHistoryPageSize, 20)
  assert.deepEqual(calculateProductHistoryPage(2, 41), {
    page: 2,
    pageSize: 20,
    totalPages: 3,
    offset: 20,
  })
  assert.deepEqual(calculateProductHistoryPage(0, 0), {
    page: 1,
    pageSize: 20,
    totalPages: 1,
    offset: 0,
  })
})
