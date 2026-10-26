import assert from 'node:assert/strict'
import test from 'node:test'
import { hashAuthAuditSubject } from '../src/features/auth/audit-subject.server'
import { hashAuthIdentity } from '../src/features/auth/auth-rate-limit.server'
import { createAuthAuditEvent } from '../src/features/auth/audit'
import type { AuthAuditInput } from '../src/features/auth/audit'
import {
  recordBlockedLogin,
  signInWithEmailPassword,
} from '../src/features/auth/login-actions'
import type { NeonAuthCredentialsClient } from '../src/features/auth/login-actions'
import { executeAuditedPasswordReset } from '../src/features/auth/password-reset-audit'

function loginClient(result: {
  error: unknown | null
  data?: unknown
}): NeonAuthCredentialsClient {
  const unused = async () => ({ error: null })
  return {
    signIn: { email: async () => result },
    signUp: { email: unused },
    emailOtp: { sendVerificationOtp: unused, verifyEmail: unused },
    signOut: unused,
  }
}

test('audit subject uses normalized keyed identity, separate from limiter keys and verified actors', async () => {
  const subjectHash = await hashAuthAuditSubject(
    ' User@Example.test ',
    'synthetic-pepper',
  )
  assert.match(subjectHash ?? '', /^[a-f0-9]{64}$/)
  assert.equal(
    subjectHash,
    await hashAuthAuditSubject('user@example.test', 'synthetic-pepper'),
  )
  assert.notEqual(
    subjectHash,
    await hashAuthIdentity('login', 'user@example.test', 'synthetic-pepper'),
  )
  assert.notEqual(
    subjectHash,
    await hashAuthAuditSubject('user@example.test', 'other-pepper'),
  )
  assert.equal(
    await hashAuthAuditSubject('user@example.test', undefined),
    undefined,
  )
  const events: AuthAuditInput[] = []
  const audit = {
    requestId: 'synthetic-request',
    subjectHash,
    writer: {
      append: async (event: AuthAuditInput) => {
        events.push(event)
      },
    },
  }
  await recordBlockedLogin(audit, 'login_cooldown')
  await signInWithEmailPassword(
    loginClient({ error: { message: 'synthetic rejection' } }),
    { email: 'user@example.test', password: 'synthetic-password' },
    audit,
  )
  await executeAuditedPasswordReset({
    action: 'password_reset_requested',
    subjectHash,
    writer: audit.writer,
    execute: async () => ({ ok: true }),
    getOutcome: () => 'success',
  })
  assert.equal(events.length, 4)
  for (const event of events) {
    assert.equal(event.metadata?.subjectHash, subjectHash)
    assert.equal(event.actorAuthUserId, undefined)
    assert.equal(event.targetId, undefined)
  }
  assert.equal(events[0]?.outcome, 'blocked')
  assert.equal(events[1]?.outcome, 'failure')
  assert.ok(!JSON.stringify(events).includes('user@example.test'))
  assert.ok(!JSON.stringify(events).includes('synthetic-password'))
})

test('audit rejects raw identifiers and malformed hashes; successful login retains trusted actor', async () => {
  for (const subjectHash of [
    'user@example.test',
    'a'.repeat(63),
    'a'.repeat(64) + '\n',
    'A'.repeat(64),
  ]) {
    assert.equal(
      createAuthAuditEvent({
        action: 'login',
        outcome: 'failure',
        metadata: { subjectHash },
      }).metadata?.subjectHash,
      undefined,
    )
  }
  const events: AuthAuditInput[] = []
  const subjectHash = 'a'.repeat(64)
  await signInWithEmailPassword(
    loginClient({
      error: null,
      data: { user: { id: 'verified-provider-user' } },
    }),
    { email: 'user@example.test', password: 'synthetic-password' },
    {
      requestId: 'synthetic-request',
      subjectHash,
      writer: {
        append: async (event) => {
          events.push(event)
        },
      },
    },
  )
  const event = events[0]
  assert.ok(event)
  assert.equal(event.actorAuthUserId, 'verified-provider-user')
  assert.equal(event.targetId, 'verified-provider-user')
  assert.equal(event.metadata?.subjectHash, subjectHash)
})
