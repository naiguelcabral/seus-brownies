import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateSaleHistoryPage,
  endOfSaleHistoryDay,
  saleHistoryPageSize,
  saleStatuses,
} from '../src/features/operations/sale-history'

test('paginação de vendas limita o tamanho e ajusta páginas fora do intervalo', () => {
  assert.equal(saleHistoryPageSize, 20)
  assert.deepEqual(calculateSaleHistoryPage(2, 47), {
    page: 2,
    pageSize: 20,
    totalPages: 3,
    offset: 20,
  })
  assert.deepEqual(calculateSaleHistoryPage(99, 0), {
    page: 1,
    pageSize: 20,
    totalPages: 1,
    offset: 0,
  })
})

test('filtro final de vendas inclui o dia todo em UTC', () => {
  assert.equal(
    endOfSaleHistoryDay('2026-02-28').toISOString(),
    '2026-03-01T00:00:00.000Z',
  )
  assert.deepEqual(saleStatuses, ['draft', 'confirmed', 'paid', 'cancelled'])
})
