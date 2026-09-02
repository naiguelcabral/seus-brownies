import assert from 'node:assert/strict'
import test from 'node:test'

import {
  cancelSaleValues,
  negativeInventoryValues,
  positiveInventoryValues,
  returnSaleValues,
} from '../src/features/inventory/lifecycle-contracts'

test('contratos de ciclo de vida exigem referência, motivo e custo explícito', () => {
  assert.equal(cancelSaleValues.safeParse({ saleId: 1, reason: 'erro' }).success, true)
  assert.equal(returnSaleValues.safeParse({ saleItemId: 1, quantity: '1', reason: 'avaria', reference: 'RMA-1' }).success, true)
  assert.equal(negativeInventoryValues.safeParse({ productId: 1, quantity: '1', reason: '', reference: '' }).success, false)
  assert.equal(positiveInventoryValues.safeParse({ productId: 1, quantity: '1', reason: 'contagem', reference: 'AJ-1', totalCost: '', originReference: '' }).success, false)
})
