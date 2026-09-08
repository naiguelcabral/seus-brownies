import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateLoginAttempt } from '../src/features/auth/login-attempts.server'
import { decideLoginAttempt } from '../src/features/auth/login-security'
import { createInMemoryAuthRateLimiter } from '../src/features/auth/auth-rate-limit'
import { protectPublicAuthAction } from '../src/features/auth/auth-rate-limit.server'

const expiry = new Date('2026-09-07T12:15:00.000Z')
const locked = { consecutiveFailures: 5, cooldownUntil: expiry }
const environment = {
  AUTH_LOGIN_HASH_PEPPER: 'synthetic-pepper',
  TURNSTILE_SECRET_KEY: 'synthetic-secret',
}

test('leituras independentes mantêm cooldown até o milissegundo anterior à expiração', async () => {
  for (const offset of [-1, 0, 1]) {
    for (let isolate = 0; isolate < 2; isolate += 1) {
      const snapshot = structuredClone(locked)
      const result = await evaluateLoginAttempt(
        { read: async () => snapshot },
        'synthetic-identity-hash',
        new Date(expiry.getTime() + offset),
      )
      assert.equal(result.decision.allowed, offset >= 0)
      assert.equal(result.decision.requiresChallenge, true)
      assert.deepEqual(snapshot, locked)
    }
  }
})

test('falha na leitura durável rejeita a avaliação em vez de autorizar', async () => {
  const failure = new Error('synthetic storage unavailable')
  await assert.rejects(
    evaluateLoginAttempt(
      { read: async () => Promise.reject(failure) },
      'synthetic-identity-hash',
      expiry,
    ),
    (error) => error === failure,
  )
})

test('nova falha após cooldown incrementa contador e reinicia os quinze minutos', () => {
  const decision = decideLoginAttempt({
    state: structuredClone(locked),
    succeeded: false,
    now: expiry,
    policy: { cooldownMs: 15 * 60 * 1000 },
  })
  assert.equal(decision.allowed, false)
  assert.equal(decision.requiresChallenge, true)
  assert.deepEqual(decision.nextState, {
    consecutiveFailures: 6,
    cooldownUntil: new Date('2026-09-07T12:30:00.000Z'),
  })
  assert.equal(locked.consecutiveFailures, 5)
})

test('sucesso depois do cooldown zera estado; próxima falha volta a um', () => {
  const success = decideLoginAttempt({
    state: structuredClone(locked),
    succeeded: true,
    now: expiry,
    policy: { cooldownMs: 15 * 60 * 1000 },
  })
  assert.deepEqual(success.nextState, {
    consecutiveFailures: 0,
    cooldownUntil: null,
  })
  const failure = decideLoginAttempt({
    state: success.nextState,
    succeeded: false,
    now: expiry,
    policy: { cooldownMs: 15 * 60 * 1000 },
  })
  assert.equal(failure.requiresChallenge, false)
  assert.deepEqual(failure.nextState, {
    consecutiveFailures: 1,
    cooldownUntil: null,
  })
})

test('desafio durável continua obrigatório com limitador novo e verificador em falha', async () => {
  for (const transportFailure of [false, true]) {
    let calls = 0
    const result = await protectPublicAuthAction(
      {
        scope: 'login',
        identifier: 'synthetic@example.invalid',
        turnstileToken: 'synthetic-token',
      },
      environment,
      {
        limiter: createInMemoryAuthRateLimiter(() => expiry.getTime()),
        verifyTurnstile: async () => {
          calls += 1
          if (transportFailure) throw new Error('synthetic-provider-detail')
          return false
        },
      },
      { forceChallenge: true },
    )
    assert.equal(calls, 1)
    assert.deepEqual(result, {
      allowed: false,
      requiresChallenge: true,
      retryAfterMs: 0,
    })
    assert.doesNotMatch(JSON.stringify(result), /synthetic|example/)
  }
})

test('desafio durável sem token ou secret bloqueia antes de chamar verificador', async () => {
  for (const withSecret of [false, true]) {
    for (const withToken of [false, true]) {
      if (withSecret && withToken) continue
      let calls = 0
      const result = await protectPublicAuthAction(
        {
          scope: 'login',
          identifier: 'synthetic@example.invalid',
          turnstileToken: withToken ? 'synthetic-token' : undefined,
        },
        {
          AUTH_LOGIN_HASH_PEPPER: environment.AUTH_LOGIN_HASH_PEPPER,
          TURNSTILE_SECRET_KEY: withSecret
            ? environment.TURNSTILE_SECRET_KEY
            : undefined,
        },
        {
          limiter: createInMemoryAuthRateLimiter(() => expiry.getTime()),
          verifyTurnstile: async () => {
            calls += 1
            return true
          },
        },
        { forceChallenge: true },
      )
      assert.equal(result.allowed, false)
      assert.equal(result.requiresChallenge, true)
      assert.equal(calls, 0)
    }
  }
})
