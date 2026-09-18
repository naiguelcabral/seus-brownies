import assert from 'node:assert/strict'
import test from 'node:test'

import { createCloudflareTurnstileVerifier } from '../src/features/auth/turnstile-adapter.server'

test('Turnstile usa segredo somente no corpo server-side e normaliza falha', async () => {
  let requestBody = ''
  const verifier = createCloudflareTurnstileVerifier({
    secretKey: 'test-secret',
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
    fetch: async () => new Response('indisponível', { status: 200 }),
  })

  assert.deepEqual(await verifier.verify({ token: 'browser-token' }), {
    success: false,
    reasonCode: 'provider_invalid_response',
  })
})
