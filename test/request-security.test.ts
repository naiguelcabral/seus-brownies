import assert from 'node:assert/strict'
import test from 'node:test'
import { maxRequestBodyBytes } from '../src/lib/input-limits'
import {
  rejectExcessiveRequestBody,
  requestSecurityHeaders,
  secureResponse,
} from '../src/lib/request-security'

test('body budget accepts its exact boundary without consuming the original request', async () => {
  const body = 'x'.repeat(maxRequestBodyBytes)
  const request = new Request('https://app.example.test', {
    method: 'POST',
    body,
  })
  assert.equal(await rejectExcessiveRequestBody(request), null)
  assert.equal(request.bodyUsed, false)
  assert.equal((await request.text()).length, maxRequestBodyBytes)
})

test('body budget counts UTF-8 bytes and ignores a misleading smaller Content-Length', async () => {
  for (const headers of [{}, { 'content-length': '0' }]) {
    const request = new Request('https://app.example.test', {
      method: 'POST',
      body: 'é'.repeat(maxRequestBodyBytes / 2 + 1),
      headers,
    })
    const response = await rejectExcessiveRequestBody(request)
    assert.equal(response?.status, 413)
    assert.deepEqual(await response.json(), { error: 'payload_too_large' })
  }
})

test('body budget rejects declared excess and bodyless GET remains usable', async () => {
  const request = new Request('https://app.example.test', {
    method: 'POST',
    body: 'small',
    headers: { 'content-length': String(maxRequestBodyBytes + 1) },
  })
  assert.equal((await rejectExcessiveRequestBody(request))?.status, 413)
  assert.equal(
    await rejectExcessiveRequestBody(new Request('https://app.example.test')),
    null,
  )
})

test('streamed input without Content-Length is bounded and cancelled on excess', async () => {
  let cancelled = false
  const source = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(64 * 1024))
    },
    cancel() {
      cancelled = true
    },
  })
  // Node fetch requires the duplex extension for streaming request bodies.
  const init = { method: 'POST', body: source, duplex: 'half' }
  const request = new Request('https://app.example.test', init)
  assert.equal((await rejectExcessiveRequestBody(request))?.status, 413)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(cancelled, true)
})

test('interrupted request body fails before downstream deserialization', async () => {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new Error('private transport detail'))
    },
  })
  const init = { method: 'POST', body: source, duplex: 'half' }
  const request = new Request('https://app.example.test', init)
  const response = await rejectExcessiveRequestBody(request)
  assert.equal(response?.status, 400)
  assert.deepEqual(await response.json(), { error: 'invalid_request_body' })
})

test('security headers preserve redirects, cookies and streaming bodies', async () => {
  const original = new Response('body', {
    status: 302,
    headers: { location: '/login' },
  })
  original.headers.append('set-cookie', 'first=one; HttpOnly')
  original.headers.append('set-cookie', 'second=two; HttpOnly')
  const headers = requestSecurityHeaders(
    new Request('https://app.example.test'),
  )
  const secured = secureResponse(original, headers)
  assert.equal(secured.status, 302)
  assert.equal(secured.headers.get('location'), '/login')
  assert.deepEqual(
    secured.headers.getSetCookie(),
    original.headers.getSetCookie(),
  )
  assert.equal(await secured.text(), 'body')
  assert.equal(secured.headers.get('cache-control'), 'no-store')
  assert.equal(secured.headers.get('x-frame-options'), 'DENY')
  assert.equal(secured.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(secured.headers.get('referrer-policy'), 'no-referrer')
  assert.equal(
    secured.headers.get('permissions-policy'),
    'camera=(), microphone=(), geolocation=()',
  )
  assert.equal(
    (headers['Content-Security-Policy-Report-Only'] ?? '')
      .split('; ')
      .find((directive) => directive.startsWith('frame-src ')),
    'frame-src https://challenges.cloudflare.com',
  )
  assert.equal(secured.headers.get('content-security-policy'), null)
  assert.equal(
    secured.headers.get('strict-transport-security'),
    'max-age=31536000',
  )
  assert.equal(
    requestSecurityHeaders(new Request('http://localhost'))[
      'Strict-Transport-Security'
    ],
    undefined,
  )
})
