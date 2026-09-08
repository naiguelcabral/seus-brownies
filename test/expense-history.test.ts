import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateExpenseHistoryPage,
  expenseHistoryPageSize,
} from '../src/features/operations/expense-history'

test('paginação de despesas limita o tamanho e ajusta páginas fora do intervalo', () => {
  assert.equal(expenseHistoryPageSize, 20)
  assert.deepEqual(calculateExpenseHistoryPage(1, 47), {
    page: 1,
    pageSize: 20,
    totalPages: 3,
    offset: 0,
  })
  assert.deepEqual(calculateExpenseHistoryPage(9, 47), {
    page: 3,
    pageSize: 20,
    totalPages: 3,
    offset: 40,
  })
  assert.deepEqual(calculateExpenseHistoryPage(0, 0), {
    page: 1,
    pageSize: 20,
    totalPages: 1,
    offset: 0,
  })
})
