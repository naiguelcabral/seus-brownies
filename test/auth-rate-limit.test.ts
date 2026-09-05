import assert from 'node:assert/strict'
import test from 'node:test'

import {
  authRateLimitPolicies,
  createInMemoryAuthRateLimiter,
} from '../src/features/auth/auth-rate-limit'
import {
  hashAuthIdentity,
  protectPublicAuthAction,
} from '../src/features/auth/auth-rate-limit.server'

test('limite público bloqueia após a cota e pede desafio sem reter identidade bruta', () => {
  let now = 0
  const limiter = createInMemoryAuthRateLimiter(() => now)
  const policy = authRateLimitPolicies['password-reset']

  for (let attempt = 0; attempt < policy.limit; attempt += 1) {
    assert.equal(limiter.consume('password-reset', 'opaque-id').allowed, true)
  }

  const blocked = limiter.consume('password-reset', 'opaque-id')
  assert.deepEqual(blocked, {
    allowed: false,
    requiresChallenge: true,
    retryAfterMs: policy.windowMs,
  })

  now += policy.windowMs
  assert.equal(limiter.consume('password-reset', 'opaque-id').allowed, true)
})

test('hash HMAC muda por escopo e não contém o e-mail', async () => {
  const email = 'admin@example.test'
  const pepper = 'pepper-only-for-test'
  const loginHash = await hashAuthIdentity('login', email, pepper)
  const resetHash = await hashAuthIdentity('password-reset', email, pepper)

  assert.match(loginHash, /^[a-f0-9]{64}$/)
  assert.notEqual(loginHash, resetHash)
  assert.doesNotMatch(loginHash, /admin|example/i)
})

test('ambiente não local sem pepper falha fechado para ação pública', async () => {
  assert.deepEqual(
    await protectPublicAuthAction(
      { scope: 'login', email: 'admin@example.test' },
      { NODE_ENV: 'production' },
    ),
    { allowed: false, requiresChallenge: false },
  )
})

test('desenvolvimento local permanece utilizável sem secret de desenvolvimento', async () => {
  assert.deepEqual(
    await protectPublicAuthAction(
      { scope: 'login', email: 'admin@example.test' },
      { NODE_ENV: 'development' },
    ),
    { allowed: true, requiresChallenge: false },
  )
})
