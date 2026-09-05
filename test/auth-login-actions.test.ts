import assert from 'node:assert/strict'
import test from 'node:test'

import {
  invalidLoginMessage,
  signInWithEmailPassword,
  signOutCurrentSession,
  unavailableLoginMessage,
} from '../src/features/auth/login-actions'

test('login inválido produz mensagem controlada', async () => {
  const result = await signInWithEmailPassword(
    {
      signIn: { email: async () => ({ error: { status: 401 } }) },
      signOut: async () => ({ error: null }),
    },
    { email: 'invalido@example.test', password: 'senha-incorreta' },
  )

  assert.deepEqual(result, { ok: false, message: invalidLoginMessage })
})

test('login e logout bem-sucedidos não expõem dados de sessão', async () => {
  const auth = {
    signIn: { email: async () => ({ error: null }) },
    signOut: async () => ({ error: null }),
  }

  assert.deepEqual(
    await signInWithEmailPassword(auth, {
      email: 'user@example.test',
      password: 'senha-valida',
    }),
    { ok: true },
  )
  assert.deepEqual(await signOutCurrentSession(auth), { ok: true })
})

test('falha de transporte no logout recebe mensagem controlada', async () => {
  const result = await signOutCurrentSession({
    signIn: { email: async () => ({ error: null }) },
    signOut: async () => {
      throw new Error('network failure')
    },
  })

  assert.deepEqual(result, { ok: false, message: unavailableLoginMessage })
})
