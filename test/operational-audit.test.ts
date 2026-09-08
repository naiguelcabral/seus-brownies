import assert from 'node:assert/strict'
import test from 'node:test'

import { appendOperationalAudit } from '../src/features/operations/audit'

test('auditoria operacional normaliza entidade e preserva identidade, motivo e referência', async () => {
  let written: Record<string, unknown> | undefined
  const transaction = {
    insert() {
      return {
        async values(value: Record<string, unknown>) {
          written = value
        },
      }
    },
  }

  await appendOperationalAudit(transaction, {
    actorAuthUserId: 'auth-user-17',
    action: 'sale.cancel',
    entityType: 'sale',
    entityId: 42,
    operationReference: 'fifo-lifecycle:sale-cancellation:42:cancel',
    reason: '  solicitação do cliente  ',
  })

  assert.deepEqual(written, {
    actorAuthUserId: 'auth-user-17',
    action: 'sale.cancel',
    entityType: 'sale',
    entityId: '42',
    operationReference: 'fifo-lifecycle:sale-cancellation:42:cancel',
    reason: 'solicitação do cliente',
  })
})

test('falha ao persistir auditoria é propagada para a transação chamadora', async () => {
  const expected = new Error('audit unavailable')
  const transaction = {
    insert() {
      return {
        async values() {
          throw expected
        },
      }
    },
  }

  await assert.rejects(
    appendOperationalAudit(transaction, {
      action: 'expense.create',
      entityType: 'expense',
      entityId: 8,
    }),
    expected,
  )
})
