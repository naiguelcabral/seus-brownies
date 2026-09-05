import assert from 'node:assert/strict'
import test from 'node:test'

import { executeAuditedPasswordReset } from '../src/features/auth/password-reset-audit'

test('reset só é considerado concluído após persistir intenção e resultado sanitizados', async () => {
  const events: Array<Record<string, unknown>> = []
  const result = await executeAuditedPasswordReset({
    action: 'password_reset_completed',
    requestId: 'request-audit-test',
    writer: { append: async (event) => events.push(event) },
    execute: async () => ({ ok: true }),
    getOutcome: (providerResult) => (providerResult.ok ? 'success' : 'failure'),
  })

  assert.deepEqual(result, { auditComplete: true, result: { ok: true } })
  assert.deepEqual(events, [
    {
      action: 'password_reset_completed',
      outcome: 'blocked',
      targetType: 'identity',
      requestId: 'request-audit-test',
      metadata: {
        provider: 'neon-auth',
        reasonCode: 'provider_outcome_pending',
      },
    },
    {
      action: 'password_reset_completed',
      outcome: 'success',
      targetType: 'identity',
      requestId: 'request-audit-test',
      metadata: { provider: 'neon-auth' },
    },
  ])
})

test('falha ao registrar intenção bloqueia o provedor antes de qualquer reset', async () => {
  let providerCalled = false
  const result = await executeAuditedPasswordReset({
    action: 'password_reset_requested',
    writer: {
      append: async () => {
        throw new Error('audit unavailable')
      },
    },
    execute: async () => {
      providerCalled = true
      return { ok: true }
    },
    getOutcome: () => 'success',
  })

  assert.deepEqual(result, { auditComplete: false, stage: 'before-provider' })
  assert.equal(providerCalled, false)
})

test('falha ao registrar resultado mantém intenção explícita e não aceita sucesso', async () => {
  const events: Array<Record<string, unknown>> = []
  const result = await executeAuditedPasswordReset({
    action: 'password_reset_completed',
    writer: {
      append: async (event) => {
        events.push(event)
        if (events.length === 2) throw new Error('audit unavailable')
      },
    },
    execute: async () => ({ ok: true }),
    getOutcome: () => 'success',
  })

  assert.deepEqual(result, {
    auditComplete: false,
    result: { ok: true },
    stage: 'after-provider',
  })
  assert.equal(events[0]?.outcome, 'blocked')
  assert.equal(events[0]?.metadata instanceof Object, true)
})
