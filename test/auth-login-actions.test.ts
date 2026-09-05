import assert from 'node:assert/strict'
import test from 'node:test'

import {
  invalidLoginMessage,
  invalidOtpMessage,
  invalidSignUpMessage,
  otpSentMessage,
  resendEmailVerificationOtp,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signOutCurrentSession,
  unavailableLoginMessage,
  verifyEmailVerificationOtp,
} from '../src/features/auth/login-actions'
import type { NeonAuthCredentialsClient } from '../src/features/auth/login-actions'

function createAuthClient(): NeonAuthCredentialsClient {
  return {
    signIn: { email: async () => ({ error: null }) },
    signUp: { email: async () => ({ error: null }) },
    emailOtp: {
      sendVerificationOtp: async () => ({ error: null }),
      verifyEmail: async () => ({ error: null }),
    },
    signOut: async () => ({ error: null }),
  }
}

test('login inválido produz mensagem controlada', async () => {
  const result = await signInWithEmailPassword(
    {
      ...createAuthClient(),
      signIn: { email: async () => ({ error: { status: 401 } }) },
    },
    { email: 'invalido@example.test', password: 'senha-incorreta' },
  )

  assert.deepEqual(result, { ok: false, message: invalidLoginMessage })
})

test('login e logout bem-sucedidos não expõem dados de sessão', async () => {
  const auth = createAuthClient()

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
    ...createAuthClient(),
    signOut: async () => {
      throw new Error('network failure')
    },
  })

  assert.deepEqual(result, { ok: false, message: unavailableLoginMessage })
})

test('cadastro válido cria a identidade e solicita OTP de verificação', async () => {
  const calls: Array<unknown> = []
  const auth: NeonAuthCredentialsClient = {
    ...createAuthClient(),
    signUp: {
      email: async (input) => {
        calls.push(input)
        return { error: null }
      },
    },
    emailOtp: {
      ...createAuthClient().emailOtp,
      sendVerificationOtp: async (input) => {
        calls.push(input)
        return { error: null }
      },
    },
  }

  assert.deepEqual(
    await signUpWithEmailPassword(auth, {
      name: 'Pessoa Teste',
      email: 'user@example.test',
      password: 'senha-segura',
    }),
    { ok: true, message: otpSentMessage },
  )
  assert.deepEqual(calls, [
    {
      name: 'Pessoa Teste',
      email: 'user@example.test',
      password: 'senha-segura',
    },
    { email: 'user@example.test', type: 'email-verification' },
  ])
})

test('cadastro recusado mantém mensagem que não enumera contas', async () => {
  const result = await signUpWithEmailPassword(
    {
      ...createAuthClient(),
      signUp: { email: async () => ({ error: { status: 409 } }) },
    },
    {
      name: 'Pessoa Teste',
      email: 'user@example.test',
      password: 'senha-segura',
    },
  )

  assert.deepEqual(result, { ok: false, message: invalidSignUpMessage })
})

test('reenvio de OTP usa o mesmo retorno não enumerável', async () => {
  const calls: Array<unknown> = []
  const result = await resendEmailVerificationOtp(
    {
      ...createAuthClient(),
      emailOtp: {
        ...createAuthClient().emailOtp,
        sendVerificationOtp: async (input) => {
          calls.push(input)
          return { error: null }
        },
      },
    },
    { email: 'user@example.test' },
  )

  assert.deepEqual(result, { ok: true, message: otpSentMessage })
  assert.deepEqual(calls, [
    { email: 'user@example.test', type: 'email-verification' },
  ])
})

test('OTP inválido recebe mensagem controlada', async () => {
  const result = await verifyEmailVerificationOtp(
    {
      ...createAuthClient(),
      emailOtp: {
        ...createAuthClient().emailOtp,
        verifyEmail: async () => ({ error: { status: 400 } }),
      },
    },
    { email: 'user@example.test', otp: '000000' },
  )

  assert.deepEqual(result, { ok: false, message: invalidOtpMessage })
})

test('OTP válido é delegado ao Neon Auth para emitir a sessão', async () => {
  const calls: Array<unknown> = []
  const result = await verifyEmailVerificationOtp(
    {
      ...createAuthClient(),
      emailOtp: {
        ...createAuthClient().emailOtp,
        verifyEmail: async (input) => {
          calls.push(input)
          return { error: null }
        },
      },
    },
    { email: 'user@example.test', otp: '123456' },
  )

  assert.deepEqual(result, { ok: true })
  assert.deepEqual(calls, [{ email: 'user@example.test', otp: '123456' }])
})
