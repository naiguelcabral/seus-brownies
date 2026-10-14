import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthAuditTelemetry } from '../src/features/auth/auth-audit-telemetry.server'
import { createPasswordResetTelemetry } from '../src/features/auth/password-reset-telemetry.server'
import type { PasswordResetTelemetryEvent } from '../src/features/auth/password-reset-telemetry.server'

const requestId = '12345678-1234-4321-abcd-123456789abc'

test('audit log is structured and excludes extra runtime fields', (t) => {
  const records: string[] = []
  t.mock.method(console, 'warn', (record: string) => records.push(record))
  const input = {
    requestId,
    action: 'login' as const,
    outcome: 'failure' as const,
    stage: 'persistence_failed' as const,
    authorization: 'SYNTHETIC_SECRET',
    cookie: 'SYNTHETIC_COOKIE',
    error: new Error('SYNTHETIC_PROVIDER_RESPONSE'),
  }
  createAuthAuditTelemetry().emit(input)
  assert.deepEqual(JSON.parse(records[0]), {
    event: 'auth.audit',
    level: 'warn',
    requestId,
    action: 'login',
    outcome: 'failure',
    stage: 'persistence_failed',
  })
  assert.doesNotMatch(records.join(''), /SYNTHETIC/)
})

test('password reset log preserves correlation and allowlisted reason only', (t) => {
  const records: string[] = []
  t.mock.method(console, 'info', (record: string) => records.push(record))
  const input = {
    requestId,
    stage: 'provider_request_failed' as const,
    reasonCode: 'provider_timeout' as const,
    email: 'synthetic@example.invalid',
  }
  createPasswordResetTelemetry().emit(input)
  assert.deepEqual(JSON.parse(records[0]), {
    event: 'auth.password-reset',
    level: 'info',
    requestId,
    stage: 'provider_request_failed',
    reasonCode: 'provider_timeout',
  })
})

test('invalid correlation, reason and stage cannot carry arbitrary content', (t) => {
  const records: string[] = []
  t.mock.method(console, 'info', (record: string) => records.push(record))
  const telemetry = createPasswordResetTelemetry()
  telemetry.emit({
    requestId: 'SYNTHETIC_TOKEN\nforged log',
    stage: 'completed',
    reasonCode: 'SYNTHETIC_REASON',
  } as unknown as PasswordResetTelemetryEvent)
  assert.deepEqual(JSON.parse(records[0]), {
    event: 'auth.password-reset',
    level: 'info',
    requestId: 'invalid_request_id',
    stage: 'completed',
  })
  telemetry.emit({
    requestId,
    stage: 'SYNTHETIC_STAGE',
  } as unknown as PasswordResetTelemetryEvent)
  assert.equal(records.length, 1)
  assert.doesNotMatch(records.join(''), /SYNTHETIC|forged/)
})
