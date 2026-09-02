import assert from 'node:assert/strict'
import test from 'node:test'

import { canCancelSale, canSubmitLifecycle, lifecycleErrorMessage, validateLifecycleForm } from '../src/features/inventory/lifecycle-ui'

test('cancelamento só fica disponível para venda confirmada ou paga', () => {
  assert.equal(canCancelSale('draft'), false)
  assert.equal(canCancelSale('cancelled'), false)
  assert.equal(canCancelSale('confirmed'), true)
  assert.equal(canCancelSale('paid'), true)
})

test('validação local preserva payload do writer e bloqueia quantidade inválida', () => {
  assert.deepEqual(validateLifecycleForm('loss', { productId: 3, quantity: '1.250', reason: 'Quebra', reference: 'L-1' }), { ok: true, data: { productId: 3, quantity: '1.250', reason: 'Quebra', reference: 'L-1' } })
  assert.equal(validateLifecycleForm('return', { saleItemId: 2, quantity: '1.0000', reason: 'Retorno', reference: 'R-1' }).ok, false)
})

test('erro de schema ausente recebe orientação operacional sem simular sucesso', () => {
  assert.match(lifecycleErrorMessage(new Error('FIFO fase 2 requer a migration 0013_fifo_lifecycle antes de gravar.')), /migration 0013/)
})

test('estado pendente ou confirmação ausente bloqueia reenvio local', () => {
  assert.equal(canSubmitLifecycle(true), false)
  assert.equal(canSubmitLifecycle(false, true, false), false)
  assert.equal(canSubmitLifecycle(false, true, true), true)
})
