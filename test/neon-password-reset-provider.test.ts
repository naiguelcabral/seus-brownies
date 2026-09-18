import assert from 'node:assert/strict'
import test from 'node:test'

import { requestNeonPasswordReset } from '../src/features/auth/neon-password-reset-provider.server'
import type { PasswordResetFetch } from '../src/features/auth/neon-password-reset-provider.server'

const config = {
  baseUrl: 'https://auth.example.test',
  cookieSecret: 'x'.repeat(32),
}

const input = {
  email: 'pessoa@example.test',
  redirectTo: 'http://localhost:3000/login/redefinir-senha',
}

function bindings() {
  return {
    getRequest: () =>
      new Request('http://localhost:3000/login', {
        headers: {
          cookie: 'neon-auth-session=opaque',
          origin: 'http://localhost:3000',
        },
      }),
  }
}

test('reset direto preserva o contexto do SDK e aceita resposta do provider', async () => {
  const requests: RequestInit[] = []
  const result = await requestNeonPasswordReset(config, input, {
    bindings: bindings(),
    fetch: async (_url, init) => {
      requests.push(init ?? {})
      return new Response(null, { status: 200 })
    },
  })

  assert.deepEqual(result, { ok: true, reasonCode: 'provider_success' })
  const request = requests[0]
  assert.ok(request)
  assert.equal(request.method, 'POST')
  assert.equal(request.headers instanceof Headers, false)
  assert.deepEqual(request.headers, {
    Cookie: 'neon-auth-session=opaque',
    Origin: 'http://localhost:3000',
    'Content-Type': 'application/json',
    'x-neon-auth-proxy': 'tanstack-start',
  })
  assert.ok(request.signal)
})

test('reset direto classifica resposta HTTP do provider como failure', async () => {
  const result = await requestNeonPasswordReset(config, input, {
    bindings: bindings(),
    fetch: async () => new Response(null, { status: 503 }),
  })

  assert.deepEqual(result, { ok: false, reasonCode: 'provider_http_error' })
})

test('reset direto classifica falha de rede do provider como failure', async () => {
  const result = await requestNeonPasswordReset(config, input, {
    bindings: bindings(),
    fetch: async () => Promise.reject(new TypeError('network unavailable')),
  })

  assert.deepEqual(result, { ok: false, reasonCode: 'provider_network_error' })
})

test('timeout aborta o fetch e não deixa operação upstream pendente', async () => {
  let aborted = false
  let upstreamSettled = false
  const fetchThatWaitsForAbort: PasswordResetFetch = async (_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal
      assert.ok(signal)
      signal.addEventListener(
        'abort',
        () => {
          aborted = true
          upstreamSettled = true
          reject(signal.reason)
        },
        { once: true },
      )
    })

  const result = await requestNeonPasswordReset(config, input, {
    bindings: bindings(),
    fetch: fetchThatWaitsForAbort,
    timeoutMs: 1,
  })

  assert.deepEqual(result, { ok: false, reasonCode: 'provider_timeout' })
  assert.equal(aborted, true)
  assert.equal(upstreamSettled, true)
})
