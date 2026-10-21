import assert from 'node:assert/strict'
import test from 'node:test'

const modulePath = '../scripts/check-hml-availability.mjs'
const { checkHmlAvailability } = await import(modulePath)
const origin = 'https://cacau-v1-hml.naiguelcabral.workers.dev'

test('availability uses fixed public GETs without following redirects or storing credentials', async () => {
  const requested: string[] = []
  const result = await checkHmlAvailability(
    async (url: string, options: RequestInit) => {
      requested.push(url)
      assert.equal(options.method, 'GET')
      assert.equal(options.redirect, 'manual')
      assert.equal(options.credentials, 'omit')
      assert.ok(options.signal instanceof AbortSignal)
      return url.endsWith('/login')
        ? new Response('<html></html>', {
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        : new Response(null, { status: 302, headers: { location: '/login' } })
    },
  )
  assert.deepEqual(requested, [origin + '/', origin + '/login'])
  assert.equal(result.status, 'AVAILABLE')
  assert.equal(result.authentication_validated, false)
  assert.equal(result.database_validated, false)
  assert.equal(result.alert_delivery_configured, false)
})

test('availability rejects an external redirect and never returns its Location', async () => {
  const result = await checkHmlAvailability(
    async () =>
      new Response(null, {
        status: 302,
        headers: {
          location: 'https://external-fixture.invalid/?token=synthetic-private',
        },
      }),
  )
  assert.equal(result.status, 'UNAVAILABLE')
  assert.doesNotMatch(
    JSON.stringify(result),
    /external-fixture|synthetic-private|token=/,
  )
})

test('availability rejects wrong login media and transient failure without exposing exceptions', async () => {
  for (const invalid of [
    () =>
      new Response('{}', { headers: { 'content-type': 'application/json' } }),
    () => new Response('down', { status: 503 }),
    () => {
      throw new Error('synthetic-private-network-detail')
    },
  ]) {
    const result = await checkHmlAvailability(async () => invalid())
    assert.equal(result.status, 'UNAVAILABLE')
    assert.doesNotMatch(
      JSON.stringify(result),
      /synthetic-private|network-detail/,
    )
  }
})
