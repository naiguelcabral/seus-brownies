import assert from 'node:assert/strict'
import test from 'node:test'

import {
  IdempotencyConflictError,
  hashOperationPayload,
  resolveIdempotentReplay,
} from '../src/features/operations/idempotency'

test('reenvio com a mesma chave e payload retorna o fato existente', () => {
  assert.deepEqual(
    resolveIdempotentReplay(
      { id: 17, idempotencyHash: 'same-hash' },
      'same-hash',
    ),
    { id: 17, replayed: true },
  )
})

test('mesma chave com payload diferente falha explicitamente', () => {
  assert.throws(
    () =>
      resolveIdempotentReplay(
        { id: 17, idempotencyHash: 'first-hash' },
        'different-hash',
      ),
    IdempotencyConflictError,
  )
})

test('hash é determinístico e sensível aos itens da operação', async () => {
  const payload = {
    supplierName: 'Fornecedor sintético',
    items: [{ productId: 3, quantity: '1.000', unitCost: '2.500' }],
  }
  const first = await hashOperationPayload(payload)
  const replay = await hashOperationPayload(payload)
  const conflict = await hashOperationPayload({
    ...payload,
    items: [{ productId: 3, quantity: '2.000', unitCost: '2.500' }],
  })

  assert.match(first, /^[a-f0-9]{64}$/)
  assert.equal(replay, first)
  assert.notEqual(conflict, first)
})
