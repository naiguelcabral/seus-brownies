import assert from 'node:assert/strict'
import test from 'node:test'
import { NEON_AUTH_SESSION_COOKIE_NAME } from '@neondatabase/neon-js/auth/server'

import {
  createTanStackNeonAuthServer,
  readTanStackNeonSession,
} from '../src/features/auth/neon-tanstack-adapter.server'
import { createSessionProviderLogger } from '../src/features/auth/session-provider-telemetry.server'
import {
  AuthSessionUnavailableError,
  createNeonSessionResolver,
} from '../src/features/auth/neon-adapter'

function fixture(cookie: string | (() => string)) {
  const bindings = {
    getRequest: () =>
      new Request('https://app.example.invalid/login', {
        headers: { cookie: typeof cookie === 'function' ? cookie() : cookie },
      }),
    appendSetCookie: () => assert.fail('No cookie expected'),
  }
  const auth = createTanStackNeonAuthServer(
    {
      baseUrl: 'https://auth.example.invalid/auth/',
      cookieSecret: 'synthetic-cookie-secret-at-least-32-characters',
    },
    bindings,
  )
  return { getSession: () => readTanStackNeonSession(auth, bindings) }
}

test('visitors without an exact nonempty token do not call Auth, even during an outage', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    assert.fail('Anonymous session lookup must stay local')
  })
  for (const cookie of [
    '',
    'theme=light',
    `${NEON_AUTH_SESSION_COOKIE_NAME}=`,
    `other_${NEON_AUTH_SESSION_COOKIE_NAME}=synthetic`,
    `${NEON_AUTH_SESSION_COOKIE_NAME}.extra=synthetic`,
    '__Secure-neon-auth.local.session_data=stale-synthetic',
  ]) {
    assert.deepEqual(await fixture(cookie).getSession(), {
      data: null,
      error: null,
    })
  }
})

test('a present token still resolves identity and access afresh without retaining a previous user', async (t) => {
  let calls = 0
  let reads = 0
  let active = true
  let cookie = `${NEON_AUTH_SESSION_COOKIE_NAME}=synthetic-token`
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1
    return Response.json({
      user: {
        id: 'synthetic-user',
        email: 'synthetic@example.invalid',
        emailVerified: true,
      },
    })
  })
  const resolve = createNeonSessionResolver(
    fixture(() => cookie),
    async () => {
      reads += 1
      return { role: 'manager', isActive: active }
    },
  )
  assert.equal((await resolve()).principal?.role, 'manager')
  active = false
  assert.equal((await resolve()).principal, null)
  cookie = ''
  assert.deepEqual(await resolve(), { user: null, principal: null })
  assert.equal(calls, 2)
  assert.equal(reads, 2)
})

test('transport failure remains closed and emits only the SDK stable network code', async (t) => {
  const logged: unknown[][] = []
  t.mock.method(console, 'warn', (...args: unknown[]) => logged.push(args))
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('fetch failed: synthetic-private-detail')
  })
  const resolve = createNeonSessionResolver(
    fixture(`${NEON_AUTH_SESSION_COOKIE_NAME}=synthetic-token`),
    async () => assert.fail('Transport failure cannot authorize a lookup'),
  )
  await assert.rejects(resolve, AuthSessionUnavailableError)
  assert.deepEqual(
    logged.map((args) => JSON.parse(String(args[0]))),
    [
      {
        event: 'auth.session.provider',
        stage: 'transport_error',
        status: null,
        code: 'NETWORK_ERROR',
      },
    ],
  )
  assert.doesNotMatch(JSON.stringify(logged), /synthetic|example|token|Cookie/)
})

test('a token is checked upstream and an outage never becomes an anonymous or allowed session', async (t) => {
  const logged: unknown[][] = []
  t.mock.method(console, 'warn', (...args: unknown[]) => logged.push(args))
  let status = 429
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1
    return Response.json(
      { message: 'synthetic-private-provider-detail' },
      { status },
    )
  })
  const auth = fixture(`${NEON_AUTH_SESSION_COOKIE_NAME}=synthetic-token`)
  const resolve = createNeonSessionResolver(auth, async () => {
    assert.fail('Provider failure cannot authorize a database lookup')
  })
  for (status of [429, 503]) {
    await assert.rejects(resolve, AuthSessionUnavailableError)
  }
  status = 401
  assert.deepEqual(await resolve(), { user: null, principal: null })
  assert.equal(calls, 3)
  assert.deepEqual(
    logged.map((args) => JSON.parse(String(args[0]))),
    [429, 503].map((code) => ({
      event: 'auth.session.provider',
      stage: 'http_error',
      status: code,
      code: null,
    })),
  )
  assert.doesNotMatch(JSON.stringify(logged), /synthetic|example|token|Cookie/)
})

test('session logging excludes arbitrary metadata and unrelated auth operations', (t) => {
  const logged: unknown[][] = []
  t.mock.method(console, 'warn', (...args: unknown[]) => logged.push(args))
  const logger = createSessionProviderLogger()
  const metadata = {
    component: 'server-api',
    path: '/private/get-session',
    code: 'NETWORK_TIMEOUT',
    host: 'synthetic-private-host',
    detail: 'synthetic-private-detail',
    err: new Error('synthetic-private-error'),
    cookie: 'synthetic-private-cookie',
  }
  logger.warn('synthetic-private-message', metadata)
  logger.error('synthetic-private-message', {
    ...metadata,
    code: 'synthetic-private-code',
    status: Infinity,
  })
  logger.info('synthetic-private-message', {
    ...metadata,
    path: '/sign-in/email',
  })
  assert.deepEqual(
    logged.map((args) => JSON.parse(String(args[0]))),
    [
      {
        event: 'auth.session.provider',
        stage: 'transport_error',
        status: null,
        code: 'NETWORK_TIMEOUT',
      },
      {
        event: 'auth.session.provider',
        stage: 'unexpected',
        status: null,
        code: null,
      },
    ],
  )
  assert.doesNotMatch(JSON.stringify(logged), /synthetic|private|cookie|host/)
})
