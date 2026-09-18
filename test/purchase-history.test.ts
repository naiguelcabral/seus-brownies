import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculatePurchaseHistoryPage,
  purchaseHistoryPageSize,
} from '../src/features/operations/purchase-history'

test('paginação de compras limita o tamanho e ajusta páginas fora do intervalo', () => {
  assert.equal(purchaseHistoryPageSize, 20)
  assert.deepEqual(calculatePurchaseHistoryPage(1, 47), {
    page: 1,
    pageSize: 20,
    totalPages: 3,
    offset: 0,
  })
  assert.deepEqual(calculatePurchaseHistoryPage(99, 47), {
    page: 3,
    pageSize: 20,
    totalPages: 3,
    offset: 40,
  })
  assert.deepEqual(calculatePurchaseHistoryPage(-1, 0), {
    page: 1,
    pageSize: 20,
    totalPages: 1,
    offset: 0,
  })
})
