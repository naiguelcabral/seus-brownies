import assert from 'node:assert/strict'
import test from 'node:test'

import { createCloudflareTurnstileVerifier } from '../src/features/auth/turnstile-adapter.server'

test('Turnstile usa segredo somente no corpo server-side e normaliza falha', async () => {
  let requestBody = ''
  const verifier = createCloudflareTurnstileVerifier({
    secretKey: 'test-secret',
    expectedHostname: 'app.example.test',
    expectedAction: 'login',
    fetch: async (_input, init) => {
      requestBody = String(init?.body)
      return Response.json({
        success: false,
        'error-codes': ['invalid-input-response'],
      })
    },
  })

  assert.deepEqual(await verifier.verify({ token: 'browser-token' }), {
    success: false,
    reasonCode: 'invalid-input-response',
  })
  assert.match(requestBody, /secret=test-secret/)
  assert.match(requestBody, /response=browser-token/)
})

test('Turnstile não aceita sucesso no JSON quando o HTTP do provedor falha', async () => {
  const verifier = createCloudflareTurnstileVerifier({
    secretKey: 'test-secret',
    expectedHostname: 'app.example.test',
    expectedAction: 'login',
    fetch: async () => Response.json({ success: true }, { status: 503 }),
  })

  assert.deepEqual(await verifier.verify({ token: 'browser-token' }), {
    success: false,
    reasonCode: 'provider_http_error',
  })
})

test('Turnstile falha fechado quando a resposta do provedor não é JSON', async () => {
  const verifier = createCloudflareTurnstileVerifier({
    secretKey: 'test-secret',
    expectedHostname: 'app.example.test',
    expectedAction: 'login',
    fetch: async () => new Response('indisponível', { status: 200 }),
  })

  assert.deepEqual(await verifier.verify({ token: 'browser-token' }), {
    success: false,
    reasonCode: 'provider_invalid_response',
  })
})

test('Turnstile request carries a bounded abort signal', async () => {
  const verifier = createCloudflareTurnstileVerifier({
    secretKey: 'test-secret',
    expectedHostname: 'app.example.test',
    expectedAction: 'login',
    timeoutMs: 20,
    fetch: async (_input, init) => {
      const signal = init?.signal
      assert.ok(signal)
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 1000)
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            resolve()
          },
          { once: true },
        )
      })
      signal.throwIfAborted()
      return Response.json({ success: true })
    },
  })
  await assert.rejects(verifier.verify({ token: 'browser-token' }), {
    name: 'TimeoutError',
  })
})

test('Turnstile accepts only the exact deployment hostname and auth action', async () => {
  for (const [result, expected] of [
    [
      { success: true, hostname: 'app.example.test', action: 'login' },
      { success: true },
    ],
    [
      {
        success: true,
        hostname: 'app.example.test.evil.test',
        action: 'login',
      },
      { success: false, reasonCode: 'hostname_mismatch' },
    ],
    [
      { success: true, hostname: 'localhost', action: 'login' },
      { success: false, reasonCode: 'hostname_mismatch' },
    ],
    [
      { success: true, hostname: 'app.example.test', action: 'password-reset' },
      { success: false, reasonCode: 'action_mismatch' },
    ],
    [
      { success: true, hostname: 'app.example.test' },
      { success: false, reasonCode: 'action_mismatch' },
    ],
    [null, { success: false, reasonCode: 'provider_invalid_response' }],
    [
      { success: false, 'error-codes': 'sensitive-untrusted-value' },
      { success: false, reasonCode: 'provider_rejected' },
    ],
  ] as const) {
    const verifier = createCloudflareTurnstileVerifier({
      secretKey: 'synthetic',
      expectedHostname: 'app.example.test',
      expectedAction: 'login',
      fetch: async () => Response.json(result),
    })
    assert.deepEqual(
      await verifier.verify({ token: 'synthetic-token' }),
      expected,
    )
  }
})

test('invalid verification configuration and overlong tokens make no provider request', async () => {
  let calls = 0
  const verifier = createCloudflareTurnstileVerifier({
    secretKey: 'synthetic',
    expectedHostname: '',
    expectedAction: 'login',
    fetch: async () => {
      calls++
      return Response.json({ success: true })
    },
  })
  assert.equal((await verifier.verify({ token: 'synthetic' })).success, false)
  assert.equal(
    (await verifier.verify({ token: 'x'.repeat(2049) })).success,
    false,
  )
  assert.equal(calls, 0)
})
