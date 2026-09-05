import assert from 'node:assert/strict'
import test from 'node:test'

import { getTurnstileChallengeState } from '../src/features/auth/turnstile-client'

test('sem site key o desafio permanece bloqueado e não renderiza widget', () => {
  assert.deepEqual(getTurnstileChallengeState(true, undefined), {
    requiresChallenge: true,
    canRenderWidget: false,
  })
})

test('site key pública habilita somente a renderização do desafio exigido', () => {
  assert.deepEqual(getTurnstileChallengeState(true, 'public-site-key'), {
    requiresChallenge: true,
    canRenderWidget: true,
  })
  assert.deepEqual(getTurnstileChallengeState(false, 'public-site-key'), {
    requiresChallenge: false,
    canRenderWidget: false,
  })
})
