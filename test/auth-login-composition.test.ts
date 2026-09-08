import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileFunction } from 'node:vm'
import ts from 'typescript'

import { createInMemoryAuthRateLimiter } from '../src/features/auth/auth-rate-limit'
import {
  hashAuthIdentity,
  protectPublicAuthAction,
} from '../src/features/auth/auth-rate-limit.server'
import { evaluateLoginAttempt } from '../src/features/auth/login-attempts.server'
import { decideLoginAttempt } from '../src/features/auth/login-security'
import {
  invalidLoginMessage,
  signInWithEmailPassword,
  unavailableLoginMessage,
} from '../src/features/auth/login-actions'
import type { AuthAuditInput } from '../src/features/auth/audit'
import type { LoginAttemptStore } from '../src/features/auth/login-attempts.server'
import type { LoginAttemptState } from '../src/features/auth/login-security'
import type { NeonAuthCredentialsClient } from '../src/features/auth/login-actions'

// Execute the actual callback, without importing runtime configuration or
// replacing its control flow. This is not a TanStack transport/cookie test.
const source = ts.createSourceFile(
  'functions.ts',
  readFileSync(
    new URL('../src/features/auth/functions.ts', import.meta.url),
    'utf8',
  ),
  ts.ScriptTarget.Latest,
  true,
)
const declarations = source.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => statement.declarationList.declarations)
const declaration = declarations.find(
  (candidate) => candidate.name.getText(source) === 'loginWithEmailPassword',
)
assert.ok(declaration?.initializer)
assert.ok(ts.isCallExpression(declaration.initializer))
assert.ok(ts.isPropertyAccessExpression(declaration.initializer.expression))
assert.equal(declaration.initializer.expression.name.text, 'handler')
const callback = declaration.initializer.arguments[0]
assert.ok(ts.isArrowFunction(callback))
const callbackJs = ts.transpileModule(
  `const loginCallback = (${callback.getText(source)})`,
  {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  },
).outputText

const now = new Date('2026-09-07T12:15:00.000Z')
const input = {
  email: 'composition@example.invalid',
  password: 'synthetic-password',
  turnstileToken: 'synthetic-token',
}
const environment = {
  AUTH_LOGIN_HASH_PEPPER: 'synthetic-pepper',
  TURNSTILE_SECRET_KEY: 'synthetic-secret',
}
const storageFailure = new Error('synthetic-storage-private-detail')

function harness(options: {
  state?: LoginAttemptState
  readFails?: boolean
  recordFails?: boolean
  provider?: 'success' | 'rejected' | 'unavailable'
  validToken?: boolean
}) {
  const calls: Array<string> = []
  const events: Array<AuthAuditInput> = []
  const records: Array<{ identity: string; succeeded: boolean }> = []
  const session = { issued: false }
  const store: LoginAttemptStore = {
    read: async () => {
      calls.push('read')
      if (options.readFails) throw storageFailure
      return options.state ?? null
    },
    record: async (identity, succeeded) => {
      calls.push('record')
      records.push({ identity, succeeded })
      if (options.recordFails) throw storageFailure
    },
  }
  const unexpected = async (): Promise<never> => {
    assert.fail('unrelated provider operation')
  }
  const auth: NeonAuthCredentialsClient = {
    signIn: {
      email: async (credentials) => {
        calls.push('provider')
        assert.deepEqual(credentials, {
          email: input.email,
          password: input.password,
        })
        if (options.provider === 'unavailable') {
          throw new Error('synthetic-provider-private-detail')
        }
        if (options.provider === 'rejected') {
          return { error: { message: 'synthetic-provider-private-detail' } }
        }
        session.issued = true
        return { error: null }
      },
    },
    signUp: { email: unexpected },
    emailOtp: {
      sendVerificationOtp: unexpected,
      verifyEmail: unexpected,
    },
    signOut: unexpected,
  }
  const limiter = createInMemoryAuthRateLimiter(() => now.getTime())
  const bindings = {
    process: { env: environment },
    Date: class extends Date {
      constructor() {
        super(now.getTime())
      }
    },
    createDatabaseLoginAttemptStore: () => store,
    hashAuthIdentity,
    evaluateLoginAttempt: (value: LoginAttemptStore, identity: string) =>
      evaluateLoginAttempt(value, identity, now),
    decideLoginAttempt,
    getPublicAuthProtection: async (
      scope: 'login',
      data: typeof input,
      protectionOptions: { forceChallenge: boolean },
    ) => {
      calls.push('protection')
      return protectPublicAuthAction(
        { scope, ...data },
        environment,
        {
          limiter,
          verifyTurnstile: async () => {
            calls.push('verify')
            return options.validToken === true
          },
        },
        protectionOptions,
      )
    },
    createConfiguredNeonAuthServer: () => auth,
    signInWithEmailPassword,
    getAuthActionAuditContext: async () => ({
      requestId: 'synthetic-request',
      writer: {
        append: async (event: AuthAuditInput) => {
          calls.push('audit')
          events.push(event)
        },
      },
    }),
    invalidLoginMessage,
    unavailableLoginMessage,
  }
  const handler = compileFunction(
    `${callbackJs}\nreturn loginCallback`,
    Object.keys(bindings),
  )(...Object.values(bindings)) as (args: { data: typeof input }) => Promise<{
    ok: boolean
    message?: string
    requiresChallenge?: boolean
  }>
  return {
    run: () => handler({ data: input }),
    calls,
    events,
    records,
    session,
  }
}

test('composição: cooldown ativo e leitura em falha não chegam à proteção ou provedor', async () => {
  const locked = harness({
    state: {
      consecutiveFailures: 5,
      cooldownUntil: new Date(now.getTime() + 1),
    },
    validToken: true,
  })
  assert.deepEqual(await locked.run(), {
    ok: false,
    message: invalidLoginMessage,
    requiresChallenge: true,
  })
  assert.deepEqual(locked.calls, ['read'])
  const failed = harness({ readFails: true })
  await assert.rejects(failed.run(), (error) => error === storageFailure)
  assert.deepEqual(failed.calls, ['read'])
  assert.equal(failed.session.issued, false)
})

test('composição: quinta falha sinaliza desafio após provedor, auditoria e gravação', async () => {
  const fixture = harness({
    state: { consecutiveFailures: 4, cooldownUntil: null },
    provider: 'rejected',
  })
  assert.deepEqual(await fixture.run(), {
    ok: false,
    message: invalidLoginMessage,
    requiresChallenge: true,
  })
  assert.deepEqual(fixture.calls, [
    'read',
    'protection',
    'provider',
    'audit',
    'record',
  ])
  assert.deepEqual(fixture.records, [
    {
      identity: await hashAuthIdentity(
        'login',
        input.email,
        environment.AUTH_LOGIN_HASH_PEPPER,
      ),
      succeeded: false,
    },
  ])
  assert.doesNotMatch(
    JSON.stringify(fixture.events),
    /composition@|synthetic-password|synthetic-token|private-detail/,
  )
})

test('composição: cooldown expirado verifica token antes de chamar provedor', async () => {
  for (const validToken of [false, true]) {
    const fixture = harness({
      state: { consecutiveFailures: 5, cooldownUntil: now },
      validToken,
    })
    assert.deepEqual(
      await fixture.run(),
      validToken
        ? { ok: true }
        : {
            ok: false,
            message: invalidLoginMessage,
            requiresChallenge: true,
          },
    )
    assert.deepEqual(
      fixture.calls,
      validToken
        ? ['read', 'protection', 'verify', 'provider', 'audit', 'record']
        : ['read', 'protection', 'verify'],
    )
    assert.equal(fixture.session.issued, validToken)
  }
})

test('composição: falha de record propaga erro mesmo após sucesso e sessão sintética emitida', async () => {
  const fixture = harness({ recordFails: true })
  await assert.rejects(fixture.run(), (error) => error === storageFailure)
  assert.deepEqual(fixture.calls, [
    'read',
    'protection',
    'provider',
    'audit',
    'record',
  ])
  assert.equal(fixture.session.issued, true)
  assert.equal(fixture.records[0].succeeded, true)
  assert.equal(fixture.events[0].outcome, 'success')
  // Characterization, not approval of session policy or proof of transport sanitization.
})

test('composição: falha de record após credencial rejeitada impede retorno controlado', async () => {
  const fixture = harness({ provider: 'rejected', recordFails: true })
  await assert.rejects(fixture.run(), (error) => error === storageFailure)
  assert.deepEqual(fixture.calls, [
    'read',
    'protection',
    'provider',
    'audit',
    'record',
  ])
  assert.equal(fixture.session.issued, false)
  assert.equal(fixture.records[0].succeeded, false)
  assert.equal(fixture.events[0].outcome, 'failure')
})

test('composição: provedor indisponível tem resposta sanitizada e não grava contador', async () => {
  const fixture = harness({ provider: 'unavailable', recordFails: true })
  const result = await fixture.run()
  assert.deepEqual(result, { ok: false, message: unavailableLoginMessage })
  assert.deepEqual(fixture.calls, ['read', 'protection', 'provider', 'audit'])
  assert.deepEqual(fixture.records, [])
  assert.doesNotMatch(
    JSON.stringify({ result, events: fixture.events }),
    /composition@|synthetic-password|synthetic-token|private-detail/,
  )
})
