import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { handleWahaWebhook } from '../src/features/whatsapp/waha-webhook.server'
import type { AcceptedWahaMessage } from '../src/features/whatsapp/waha-webhook.server'

const origin = 'https://cacau-v1-piloto.naiguelcabral.workers.dev'
const secret = 'synthetic-test-key-32-characters-long'
const env = {
  WAHA_PILOT_ENABLED: '1',
  PASSWORD_RESET_REDIRECT_ORIGIN: origin,
  WAHA_WEBHOOK_HMAC_KEY: secret,
  WAHA_PILOT_SESSION: 'test',
  WAHA_PILOT_PARTICIPANTS: JSON.stringify([
    { phone: '+15550101234', authUserId: 'person-a', active: true },
    { phone: '+15550105678', authUserId: 'person-b', active: true },
  ]),
}
const payload = {
  event: 'message',
  session: 'test',
  payload: {
    id: 'message-1',
    from: '15550101234@c.us',
    fromMe: false,
    hasMedia: false,
    body: 'estoque',
  },
}
function request(
  value: unknown,
  overrides: Record<string, string> = {},
  url = `${origin}/api/whatsapp/waha`,
) {
  const raw = JSON.stringify(value)
  return new Request(url, {
    method: 'POST',
    body: raw,
    headers: {
      'x-webhook-hmac-algorithm': 'sha512',
      'x-webhook-hmac': createHmac('sha512', secret).update(raw).digest('hex'),
      ...overrides,
    },
  })
}
test('authenticated message uses existing active identity and is idempotent', async () => {
  const records = new Map<string, AcceptedWahaMessage>()
  const deps = {
    isActiveUser: async (id: string) => id === 'person-a',
    record: async (item: AcceptedWahaMessage) => {
      const old = records.get(item.id)
      if (old)
        return old.fingerprint === item.fingerprint
          ? ('duplicate' as const)
          : ('conflict' as const)
      records.set(item.id, item)
      return 'new' as const
    },
  }
  const first = await handleWahaWebhook(request(payload), env, deps)
  assert.equal(first.status, 202)
  assert.equal((await first.json()).state, 'received')
  assert.equal(records.get('message-1')?.actor, 'person-a')
  const duplicate = await handleWahaWebhook(request(payload), env, deps)
  assert.equal((await duplicate.json()).state, 'duplicate')
  assert.equal(
    (
      await handleWahaWebhook(
        request({
          ...payload,
          payload: { ...payload.payload, body: 'alterado' },
        }),
        env,
        deps,
      )
    ).status,
    409,
  )
  assert.equal(records.size, 1)
})
test('rejects unauthenticated, unknown, inactive, group and unavailable configurations', async () => {
  let writes = 0
  const deps = {
    isActiveUser: async () => false,
    record: async () => {
      writes++
      return 'new' as const
    },
  }
  assert.equal(
    (
      await handleWahaWebhook(
        request(payload),
        { ...env, WAHA_PILOT_ENABLED: '0' },
        deps,
      )
    ).status,
    404,
  )
  assert.equal(
    (
      await handleWahaWebhook(
        request(payload, {}, 'https://example.test/api/whatsapp/waha'),
        env,
        deps,
      )
    ).status,
    404,
  )
  assert.equal(
    (
      await handleWahaWebhook(
        request(payload),
        { ...env, WAHA_PILOT_PARTICIPANTS: '[]' },
        deps,
      )
    ).status,
    503,
  )
  assert.equal(
    (
      await handleWahaWebhook(
        request(payload, { 'x-webhook-hmac': '0'.repeat(128) }),
        env,
        deps,
      )
    ).status,
    401,
  )
  assert.equal(
    (await handleWahaWebhook(request(payload), env, deps)).status,
    403,
  )
  assert.equal(
    (
      await handleWahaWebhook(
        request({
          ...payload,
          payload: { ...payload.payload, from: '15550101234@g.us' },
        }),
        env,
        deps,
      )
    ).status,
    400,
  )
  assert.equal(
    (
      await handleWahaWebhook(
        request({ ...payload, payload: { ...payload.payload, fromMe: true } }),
        env,
        deps,
      )
    ).status,
    400,
  )
  assert.equal(
    (
      await handleWahaWebhook(
        request({
          ...payload,
          payload: { ...payload.payload, from: '15550109999@c.us' },
        }),
        env,
        deps,
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await handleWahaWebhook(
        request({
          ...payload,
          payload: { ...payload.payload, body: 'x'.repeat(17000) },
        }),
        env,
        deps,
      )
    ).status,
    413,
  )
  assert.equal(writes, 0)
})
