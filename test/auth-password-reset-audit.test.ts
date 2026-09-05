import assert from 'node:assert/strict'
import test from 'node:test'

import {
  executeAuditedPasswordReset,
  isAuditedPasswordResetSuccessful,
} from '../src/features/auth/password-reset-audit'
import type { PasswordResetTelemetryEvent } from '../src/features/auth/password-reset-telemetry.server'
import {
  passwordResetRequestMessage,
  requestPasswordReset,
} from '../src/features/auth/login-actions'

test('reset só é considerado concluído após persistir intenção e resultado sanitizados', async () => {
  const events: Array<Record<string, unknown>> = []
  const telemetry: PasswordResetTelemetryEvent[] = []
  const result = await executeAuditedPasswordReset({
    action: 'password_reset_completed',
    requestId: 'request-audit-test',
    writer: { append: async (event) => events.push(event) },
    telemetry: { emit: (event) => telemetry.push(event) },
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
  assert.deepEqual(
    telemetry.map((event) => event.stage),
    ['provider_request_started', 'provider_request_succeeded', 'completed'],
  )
  assert.equal(isAuditedPasswordResetSuccessful(result), true)
})

test('falha ao registrar intenção bloqueia o provedor antes de qualquer reset', async () => {
  let providerCalled = false
  const telemetry: PasswordResetTelemetryEvent[] = []
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
    telemetry: { emit: (event) => telemetry.push(event) },
  })

  assert.deepEqual(result, { auditComplete: false, stage: 'before-provider' })
  assert.equal(providerCalled, false)
  assert.deepEqual(
    telemetry.map((event) => event.stage),
    ['initial_audit_failed'],
  )
})

test('falha ao registrar resultado mantém intenção explícita e não aceita sucesso', async () => {
  const events: Array<Record<string, unknown>> = []
  const telemetry: PasswordResetTelemetryEvent[] = []
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
    telemetry: { emit: (event) => telemetry.push(event) },
  })

  assert.deepEqual(result, {
    auditComplete: false,
    result: { ok: true },
    stage: 'after-provider',
  })
  assert.equal(events[0]?.outcome, 'blocked')
  assert.equal(events[0]?.metadata instanceof Object, true)
  assert.deepEqual(
    telemetry.map((event) => event.stage),
    [
      'provider_request_started',
      'provider_request_succeeded',
      'final_audit_failed',
    ],
  )
  assert.equal(isAuditedPasswordResetSuccessful(result), false)
})

test('erro do provider mantém resposta pública genérica, audita failure e não é sucesso interno', async () => {
  const events: Array<Record<string, unknown>> = []
  const telemetry: PasswordResetTelemetryEvent[] = []
  const providerResult = await requestPasswordReset(
    {
      requestPasswordReset: async () => ({ error: { status: 502 } }),
      resetPassword: async () => ({ error: null }),
    },
    {
      email: 'pessoa@example.test',
      redirectTo: 'http://localhost:3000/login/redefinir-senha',
    },
  )
  const result = await executeAuditedPasswordReset({
    action: 'password_reset_requested',
    requestId: 'request-provider-failed',
    writer: { append: async (event) => events.push(event) },
    telemetry: { emit: (event) => telemetry.push(event) },
    execute: async () => providerResult,
    getOutcome: (provider) => (provider.ok ? 'success' : 'failure'),
  })

  assert.deepEqual(providerResult, {
    ok: false,
    message: passwordResetRequestMessage,
  })
  assert.equal(isAuditedPasswordResetSuccessful(result), false)
  assert.equal(events[1]?.outcome, 'failure')
  assert.deepEqual(
    telemetry.map((event) => event.stage),
    ['provider_request_started', 'provider_request_failed'],
  )
})

test('timeout do provider registra failure sanitizado na auditoria final', async () => {
  const events: Array<Record<string, unknown>> = []
  const telemetry: PasswordResetTelemetryEvent[] = []
  const result = await executeAuditedPasswordReset({
    action: 'password_reset_requested',
    requestId: 'request-provider-timeout',
    writer: { append: async (event) => events.push(event) },
    telemetry: { emit: (event) => telemetry.push(event) },
    execute: async () => ({
      ok: false,
      reasonCode: 'provider_timeout' as const,
    }),
    getOutcome: (provider) => (provider.ok ? 'success' : 'failure'),
    getFailureReasonCode: (provider) => provider.reasonCode,
  })

  assert.equal(isAuditedPasswordResetSuccessful(result), false)
  assert.deepEqual(events[1]?.metadata, {
    provider: 'neon-auth',
    reasonCode: 'provider_timeout',
  })
  assert.deepEqual(telemetry[1], {
    requestId: 'request-provider-timeout',
    stage: 'provider_request_failed',
    reasonCode: 'provider_timeout',
  })
})

test('telemetria de reset aceita somente campos sanitizados', async () => {
  const telemetry: PasswordResetTelemetryEvent[] = []
  await executeAuditedPasswordReset({
    action: 'password_reset_requested',
    requestId: 'request-sanitized',
    writer: { append: async () => undefined },
    telemetry: { emit: (event) => telemetry.push(event) },
    execute: async () => ({ ok: true }),
    getOutcome: () => 'success',
  })

  const serialized = JSON.stringify(telemetry)
  for (const forbidden of [
    'pessoa@example.test',
    'senha',
    'token',
    'cookie',
    'secret',
  ]) {
    assert.equal(serialized.includes(forbidden), false)
  }
  assert.deepEqual(Object.keys(telemetry[0] ?? {}).sort(), [
    'requestId',
    'stage',
  ])
})
