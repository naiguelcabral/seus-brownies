import assert from 'node:assert/strict'
import test from 'node:test'

import {
  accessDeniedLoginMessage,
  emailVerificationRequiredMessage,
  invalidLoginMessage,
  invalidPasswordResetMessage,
  invalidOtpMessage,
  otpSentMessage,
  passwordResetRequestMessage,
  requestPasswordReset,
  resendEmailVerificationOtp,
  resetPasswordWithToken,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signOutCurrentSession,
  unavailableLoginMessage,
  verifyEmailVerificationOtp,
} from '../src/features/auth/login-actions'
import type { NeonAuthCredentialsClient } from '../src/features/auth/login-actions'
import type { AuthAuditInput } from '../src/features/auth/audit'

function createAuthClient() {
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

function createPasswordResetClient() {
  return {
    requestPasswordReset: async () => ({ error: null }),
    resetPassword: async () => ({ error: null }),
  }
}

function createAuditContext(events: Array<AuthAuditInput>) {
  return {
    requestId: 'request-id-local-001',
    writer: {
      append: async (event: AuthAuditInput) => {
        events.push(event)
      },
    },
  }
}

test('login inválido produz mensagem controlada', async () => {
  const events: Array<AuthAuditInput> = []
  const result = await signInWithEmailPassword(
    {
      ...createAuthClient(),
      signIn: { email: async () => ({ error: { status: 401 } }) },
    },
    { email: 'invalido@example.test', password: 'senha-incorreta' },
    createAuditContext(events),
  )

  assert.deepEqual(result, { ok: false, message: invalidLoginMessage })
  assert.deepEqual(events, [
    {
      action: 'login',
      outcome: 'failure',
      targetType: 'identity',
      requestId: 'request-id-local-001',
      metadata: { reasonCode: 'provider_rejected' },
    },
  ])
  assert.doesNotMatch(
    JSON.stringify(events),
    /invalido@example\.test|senha-incorreta|token|cookie/i,
  )
})

test('login e logout bem-sucedidos não expõem dados de sessão', async () => {
  const auth = createAuthClient()
  const events: Array<AuthAuditInput> = []

  assert.deepEqual(
    await signInWithEmailPassword(
      auth,
      {
        email: 'user@example.test',
        password: 'senha-valida',
      },
      createAuditContext(events),
    ),
    { ok: true },
  )
  assert.deepEqual(
    await signOutCurrentSession(auth, createAuditContext(events)),
    { ok: true },
  )
  assert.deepEqual(events, [
    {
      action: 'login',
      outcome: 'success',
      targetType: 'identity',
      requestId: 'request-id-local-001',
      metadata: null,
    },
    {
      action: 'logout',
      outcome: 'success',
      targetType: 'session',
      requestId: 'request-id-local-001',
      metadata: null,
    },
  ])
})

test('acesso negado após autenticação tem mensagem orientativa sem dados da sessão', () => {
  assert.match(accessDeniedLoginMessage, /conta foi autenticada/i)
  assert.doesNotMatch(accessDeniedLoginMessage, /token|cookie|sessão/i)
})

test('e-mail não verificado pede confirmação sem expor dados da sessão', () => {
  assert.match(emailVerificationRequiredMessage, /Verifique seu e-mail/i)
  assert.doesNotMatch(emailVerificationRequiredMessage, /token|cookie|sessão/i)
})

test('falha de transporte no logout recebe mensagem controlada', async () => {
  const events: Array<AuthAuditInput> = []
  const result = await signOutCurrentSession(
    {
      ...createAuthClient(),
      signOut: async () => {
        throw new Error('network failure')
      },
    },
    createAuditContext(events),
  )

  assert.deepEqual(result, { ok: false, message: unavailableLoginMessage })
  assert.deepEqual(events, [
    {
      action: 'logout',
      outcome: 'failure',
      targetType: 'session',
      requestId: 'request-id-local-001',
      metadata: { reasonCode: 'provider_unavailable' },
    },
  ])
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

test('cadastro de conta existente segue o mesmo retorno e OTP de conta nova', async () => {
  const calls: Array<unknown> = []
  const auth: NeonAuthCredentialsClient = {
    ...createAuthClient(),
    signUp: { email: async () => ({ error: { status: 409 } }) },
    emailOtp: {
      ...createAuthClient().emailOtp,
      sendVerificationOtp: async (input) => {
        calls.push(input)
        return { error: null }
      },
    },
  }
  const result = await signUpWithEmailPassword(auth, {
    name: 'Pessoa Teste',
    email: 'user@example.test',
    password: 'senha-segura',
  })

  assert.deepEqual(result, { ok: true, message: otpSentMessage })
  assert.deepEqual(calls, [
    { email: 'user@example.test', type: 'email-verification' },
  ])
})

test('falhas do provedor no cadastro preservam a mesma resposta e fluxo opacos', async () => {
  const result = await signUpWithEmailPassword(
    {
      ...createAuthClient(),
      signUp: {
        email: async () => {
          throw new Error('provider unavailable')
        },
      },
    },
    {
      name: 'Pessoa Teste',
      email: 'user@example.test',
      password: 'senha-segura',
    },
  )

  assert.deepEqual(result, { ok: true, message: otpSentMessage })
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
  const events: Array<AuthAuditInput> = []
  const result = await verifyEmailVerificationOtp(
    {
      ...createAuthClient(),
      emailOtp: {
        ...createAuthClient().emailOtp,
        verifyEmail: async () => ({ error: { status: 400 } }),
      },
    },
    { email: 'user@example.test', otp: '000000' },
    createAuditContext(events),
  )

  assert.deepEqual(result, { ok: false, message: invalidOtpMessage })
  assert.deepEqual(events, [
    {
      action: 'email_verification',
      outcome: 'failure',
      targetType: 'identity',
      requestId: 'request-id-local-001',
      metadata: { reasonCode: 'provider_rejected' },
    },
  ])
})

test('OTP válido é delegado ao Neon Auth para emitir a sessão', async () => {
  const calls: Array<unknown> = []
  const events: Array<AuthAuditInput> = []
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
    createAuditContext(events),
  )

  assert.deepEqual(result, { ok: true })
  assert.deepEqual(calls, [{ email: 'user@example.test', otp: '123456' }])
  assert.deepEqual(events, [
    {
      action: 'email_verification',
      outcome: 'success',
      targetType: 'identity',
      requestId: 'request-id-local-001',
      metadata: null,
    },
  ])
})

test('falha do gravador não altera uma negação fail-closed de login', async () => {
  const result = await signInWithEmailPassword(
    {
      ...createAuthClient(),
      signIn: { email: async () => ({ error: { status: 401 } }) },
    },
    { email: 'invalido@example.test', password: 'senha-incorreta' },
    {
      requestId: 'request-id-local-002',
      writer: {
        append: async () => {
          throw new Error('audit persistence unavailable')
        },
      },
    },
  )

  assert.deepEqual(result, { ok: false, message: invalidLoginMessage })
})

test('solicitação de recuperação sempre devolve mensagem não enumerável', async () => {
  const input = {
    email: 'user@example.test',
    redirectTo: 'http://localhost:3000/login/redefinir-senha',
  }

  assert.deepEqual(
    await requestPasswordReset(createPasswordResetClient(), input),
    { ok: true, message: passwordResetRequestMessage },
  )
  assert.deepEqual(
    await requestPasswordReset(
      {
        ...createPasswordResetClient(),
        requestPasswordReset: async () => ({ error: { status: 404 } }),
      },
      input,
    ),
    { ok: false, message: passwordResetRequestMessage },
  )
})

test('conclusão delega token e senha sem expor detalhes do provedor', async () => {
  const calls: Array<unknown> = []
  const input = { newPassword: 'uma-senha-segura', token: 'reset-token' }
  const result = await resetPasswordWithToken(
    {
      ...createPasswordResetClient(),
      resetPassword: async (value) => {
        calls.push(value)
        return { error: null }
      },
    },
    input,
  )

  assert.deepEqual(result, { ok: true })
  assert.deepEqual(calls, [input])
  assert.deepEqual(
    await resetPasswordWithToken(
      {
        ...createPasswordResetClient(),
        resetPassword: async () => ({ error: { status: 400 } }),
      },
      input,
    ),
    { ok: false, message: invalidPasswordResetMessage },
  )
})
