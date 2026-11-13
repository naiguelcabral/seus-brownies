import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allowWahaRequest } from '../src/features/whatsapp/waha-budget.server'

test('webhook budget requires trusted origin and both isolated rate limiters', async () => {
  const request = new Request('https://example.test/api/whatsapp/waha', {
    method: 'POST',
    headers: { 'CF-Connecting-IP': '192.0.2.8' },
  })
  const keys: string[] = []
  const allowed = {
    limit: async ({ key }: { key: string }) => {
      keys.push(key)
      return { success: true }
    },
  }
  const resolve = async () => ({ origin: allowed, aggregate: allowed })
  assert.equal(
    await allowWahaRequest(
      request,
      { AUTH_LOGIN_HASH_PEPPER: 'synthetic-pepper' },
      resolve,
    ),
    false,
  )
  Object.defineProperty(request, 'cf', { value: {} })
  assert.equal(await allowWahaRequest(request, {}, resolve), false)
  assert.equal(
    await allowWahaRequest(
      request,
      { AUTH_LOGIN_HASH_PEPPER: 'synthetic-pepper' },
      resolve,
    ),
    true,
  )
  assert.equal(keys[0], 'waha:aggregate:v1')
  assert.match(keys[1] ?? '', /^waha:network:v1:[a-f0-9]{64}$/)
  assert.ok(!keys.some((key) => key.includes('192.0.2.8')))
  const denied = { limit: async () => ({ success: false }) }
  assert.equal(
    await allowWahaRequest(
      request,
      { AUTH_LOGIN_HASH_PEPPER: 'synthetic-pepper' },
      async () => ({ origin: allowed, aggregate: denied }),
    ),
    false,
  )
  assert.equal(
    await allowWahaRequest(
      request,
      { AUTH_LOGIN_HASH_PEPPER: 'synthetic-pepper' },
      async () => ({ origin: denied, aggregate: allowed }),
    ),
    false,
  )
  assert.equal(
    await allowWahaRequest(
      request,
      { AUTH_LOGIN_HASH_PEPPER: 'synthetic-pepper' },
      async () => ({}),
    ),
    false,
  )
  assert.equal(
    await allowWahaRequest(
      request,
      { AUTH_LOGIN_HASH_PEPPER: 'synthetic-pepper' },
      async () => {
        throw new Error('offline')
      },
    ),
    false,
  )
})
