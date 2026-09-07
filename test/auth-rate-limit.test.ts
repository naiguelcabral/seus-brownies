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

test('DEV sem pepper permite todas as ações públicas sem desafio', async () => {
  for (const scope of [
    'login',
    'sign-up',
    'verification-otp',
    'password-reset',
  ] as const) {
    assert.deepEqual(
      await protectPublicAuthAction(
        { scope, email: 'admin@example.test' },
        {},
        { isDevelopment: true },
      ),
      { allowed: true, requiresChallenge: false },
    )
  }
})

test('produção sem pepper falha fechado para todas as ações públicas', async () => {
  for (const scope of [
    'login',
    'sign-up',
    'verification-otp',
    'password-reset',
  ] as const) {
    assert.deepEqual(
      await protectPublicAuthAction(
        { scope, email: 'admin@example.test' },
        {},
        { isDevelopment: false },
      ),
      { allowed: false, requiresChallenge: false },
    )
  }
})

test('DEV com pepper e abaixo do limite permite sem invocar Turnstile', async () => {
  let turnstileCalls = 0
  const result = await protectPublicAuthAction(
    { scope: 'password-reset', email: 'admin@example.test' },
    { AUTH_LOGIN_HASH_PEPPER: 'pepper-only-for-test' },
    {
      isDevelopment: true,
      limiter: createInMemoryAuthRateLimiter(),
      verifyTurnstile: async () => {
        turnstileCalls += 1
        return true
      },
    },
  )

  assert.equal(result.allowed, true)
  assert.equal(result.requiresChallenge, false)
  assert.equal(turnstileCalls, 0)
})

test('desafio não requerido não invoca Turnstile em DEV nem produção', async () => {
  for (const isDevelopment of [true, false]) {
    let turnstileCalls = 0
    const result = await protectPublicAuthAction(
      { scope: 'login', email: 'admin@example.test' },
      { AUTH_LOGIN_HASH_PEPPER: 'pepper-only-for-test' },
      {
        isDevelopment,
        limiter: createInMemoryAuthRateLimiter(),
        verifyTurnstile: async () => {
          turnstileCalls += 1
          return true
        },
      },
    )

    assert.equal(result.allowed, true)
    assert.equal(result.requiresChallenge, false)
    assert.equal(turnstileCalls, 0)
  }
})

test('desafio requerido sem secret ou token falha fechado sem invocar Turnstile', async () => {
  for (const input of [{}, { TURNSTILE_SECRET_KEY: 'turnstile-test-key' }]) {
    const limiter = createInMemoryAuthRateLimiter()
    const email = 'admin@example.test'
    const environment = {
      AUTH_LOGIN_HASH_PEPPER: 'pepper-only-for-test',
      ...input,
    }
    let turnstileCalls = 0

    for (
      let attempt = 0;
      attempt < authRateLimitPolicies.login.limit;
      attempt += 1
    ) {
      await protectPublicAuthAction({ scope: 'login', email }, environment, {
        limiter,
        verifyTurnstile: async () => {
          turnstileCalls += 1
          return true
        },
      })
    }

    const blocked = await protectPublicAuthAction(
      { scope: 'login', email },
      environment,
      {
        limiter,
        verifyTurnstile: async () => {
          turnstileCalls += 1
          return true
        },
      },
    )

    assert.equal(blocked.allowed, false)
    assert.equal(blocked.requiresChallenge, true)
    assert.equal(turnstileCalls, 0)
  }
})

test('desafio durável forçado exige token válido e rejeita token reutilizado', async () => {
  const environment = {
    AUTH_LOGIN_HASH_PEPPER: 'pepper-only-for-test',
    TURNSTILE_SECRET_KEY: 'turnstile-test-key',
  }
  const limiter = createInMemoryAuthRateLimiter()
  const consumedTokens = new Set<string>()
  const dependencies = {
    limiter,
    verifyTurnstile: async ({
      token,
    }: {
      secretKey: string
      token: string
    }) => {
      if (token !== 'valid-test-token' || consumedTokens.has(token))
        return false
      consumedTokens.add(token)
      return true
    },
  }
  const options = { forceChallenge: true }

  const missingToken = await protectPublicAuthAction(
    { scope: 'login', email: 'admin@example.test' },
    environment,
    dependencies,
    options,
  )
  assert.deepEqual(missingToken, {
    allowed: false,
    requiresChallenge: true,
    retryAfterMs: 0,
  })

  const validToken = await protectPublicAuthAction(
    {
      scope: 'login',
      email: 'admin@example.test',
      turnstileToken: 'valid-test-token',
    },
    environment,
    dependencies,
    options,
  )
  assert.equal(validToken.allowed, true)
  assert.equal(validToken.requiresChallenge, true)

  const replay = await protectPublicAuthAction(
    {
      scope: 'login',
      email: 'admin@example.test',
      turnstileToken: 'valid-test-token',
    },
    environment,
    dependencies,
    options,
  )
  assert.equal(replay.allowed, false)
  assert.equal(replay.requiresChallenge, true)
})
