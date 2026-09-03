import assert from 'node:assert/strict'
import test from 'node:test'

import { passwordResetRequestResponse } from '../src/features/auth/external-contracts'

test('recuperação usa resposta genérica sem enumeração', () => {
  assert.doesNotMatch(
    passwordResetRequestResponse.message,
    /existe|não existe|cadastrad/i,
  )
})
