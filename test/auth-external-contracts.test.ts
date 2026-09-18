import assert from 'node:assert/strict'
import test from 'node:test'

import { passwordResetRequestResponse } from '../src/features/auth/external-contracts'
import { passwordResetRequestMessage } from '../src/features/auth/login-actions'

test('recuperação usa resposta genérica sem enumeração', () => {
  assert.doesNotMatch(
    passwordResetRequestResponse.message,
    /existe|não existe|cadastrad/i,
  )
})

test('a mensagem usada pelo servidor coincide com o contrato externo', () => {
  assert.equal(
    passwordResetRequestMessage,
    passwordResetRequestResponse.message,
  )
})
