import assert from 'node:assert/strict'
import test from 'node:test'

import {
  decideLoginAttempt,
  maxConsecutiveLoginFailures,
} from '../src/features/auth/login-security'
import type { LoginAttemptState } from '../src/features/auth/login-security'
import {
  evaluateLoginAttempt,
  isLoginAttemptAllowed,
} from '../src/features/auth/login-attempts.server'

const now = new Date('2026-09-03T12:00:00.000Z')
const policy = { cooldownMs: 15 * 60 * 1000 }

test('quinta falha exige desafio e inicia cooldown durável', () => {
  let state: LoginAttemptState | null = null
  for (let failure = 1; failure <= maxConsecutiveLoginFailures; failure += 1) {
    const decision = decideLoginAttempt({
      state,
      succeeded: false,
      now,
      policy,
    })
    state = decision.nextState
    assert.equal(
      decision.requiresChallenge,
      failure === maxConsecutiveLoginFailures,
    )
  }
  assert.ok(state)
  assert.equal(state.cooldownUntil?.toISOString(), '2026-09-03T12:15:00.000Z')
})

test('cooldown bloqueia inclusive tentativa correta até expirar e sucesso zera contador', () => {
  const locked = {
    consecutiveFailures: 5,
    cooldownUntil: new Date('2026-09-03T12:15:00.000Z'),
  }
  assert.equal(
    decideLoginAttempt({ state: locked, succeeded: true, now, policy }).allowed,
    false,
  )
  const afterExpiry = decideLoginAttempt({
    state: locked,
    succeeded: true,
    now: new Date('2026-09-03T12:15:00.000Z'),
    policy,
  })
  assert.deepEqual(afterExpiry.nextState, {
    consecutiveFailures: 0,
    cooldownUntil: null,
  })
})

test('verificação prévia bloqueia tentativa durante cooldown sem modificar o estado', async () => {
  const state = {
    consecutiveFailures: maxConsecutiveLoginFailures,
    cooldownUntil: new Date('2026-09-03T12:15:00.000Z'),
  }
  const store = { read: async () => state }

  assert.equal(await isLoginAttemptAllowed(store, 'opaque-id', now), false)
  assert.equal(
    await isLoginAttemptAllowed(
      store,
      'opaque-id',
      new Date('2026-09-03T12:15:00.000Z'),
    ),
    true,
  )
})

test('avaliação do cooldown preserva o sinal de desafio para o handler', async () => {
  const state = {
    consecutiveFailures: maxConsecutiveLoginFailures,
    cooldownUntil: new Date('2026-09-03T12:15:00.000Z'),
  }
  const attempt = await evaluateLoginAttempt(
    { read: async () => state },
    'opaque-id',
    now,
  )

  assert.equal(attempt.decision.allowed, false)
  assert.equal(attempt.decision.requiresChallenge, true)
  assert.equal(attempt.state, state)
})

test('cooldown expirado libera a tentativa somente com desafio obrigatório', async () => {
  const state = {
    consecutiveFailures: maxConsecutiveLoginFailures,
    cooldownUntil: new Date('2026-09-03T12:15:00.000Z'),
  }
  const attempt = await evaluateLoginAttempt(
    { read: async () => state },
    'opaque-id',
    new Date('2026-09-03T12:15:00.000Z'),
  )

  assert.equal(attempt.decision.allowed, true)
  assert.equal(attempt.decision.requiresChallenge, true)
  assert.equal(attempt.state, state)
})

test('leituras concorrentes antes do provedor observam o mesmo contador', async () => {
  const state = { consecutiveFailures: 4, cooldownUntil: null }
  let releaseReads = () => {}
  const readsReleased = new Promise<void>((resolve) => {
    releaseReads = resolve
  })
  let reads = 0
  const store = {
    read: async () => {
      reads += 1
      if (reads === 2) releaseReads()
      await readsReleased
      return state
    },
  }

  const decisions = await Promise.all([
    evaluateLoginAttempt(store, 'opaque-id', now),
    evaluateLoginAttempt(store, 'opaque-id', now),
  ])

  assert.deepEqual(
    decisions.map(({ decision }) => decision.allowed),
    [true, true],
  )
  assert.deepEqual(
    decisions.map(({ decision }) => decision.requiresChallenge),
    [false, false],
  )
})
