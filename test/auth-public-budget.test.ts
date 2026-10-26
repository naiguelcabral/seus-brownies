import assert from 'node:assert/strict'
import test from 'node:test'
import {
  publicAuthRequestAllowed,
  trustedClientAddress,
} from '../src/features/auth/public-request-budget.server'

const environment = {
  AUTH_RATE_LIMITER_REQUIRED: 'true',
  AUTH_LOGIN_HASH_PEPPER: 'synthetic-pepper',
}
function edgeRequest(ip = '2001:db8::1') {
  const request = new Request('https://app.example.test', {
    headers: { 'CF-Connecting-IP': ip },
  })
  Object.defineProperty(request, 'cf', { value: { colo: 'TEST' } })
  return request
}

test('raw headers, forwarded addresses and malformed IPs cannot establish a trusted origin', () => {
  assert.equal(
    trustedClientAddress(
      new Request('https://app.example.test', {
        headers: {
          'CF-Connecting-IP': '192.0.2.1',
          'X-Forwarded-For': '192.0.2.2',
        },
      }),
    ),
    undefined,
  )
  for (const ip of [
    '',
    'client.example.test',
    '192.0.2.1,192.0.2.2',
    '2001:db8:::1',
  ])
    assert.equal(trustedClientAddress(edgeRequest(ip)), undefined)
  assert.equal(trustedClientAddress(edgeRequest('192.0.2.1')), '192.0.2.1')
})

test('mandatory missing origin, pepper, bindings or binding errors fail closed', async () => {
  const pass = { limit: async () => ({ success: true }) }
  assert.equal(
    await publicAuthRequestAllowed(
      new Request('https://app.example.test'),
      environment,
      async () => ({ origin: pass, aggregate: pass }),
    ),
    false,
  )
  assert.equal(
    await publicAuthRequestAllowed(edgeRequest(), {
      AUTH_RATE_LIMITER_REQUIRED: 'true',
    }),
    false,
  )
  for (const bindings of [{}, { origin: pass }, { aggregate: pass }])
    assert.equal(
      await publicAuthRequestAllowed(
        edgeRequest(),
        environment,
        async () => bindings,
      ),
      false,
    )
  assert.equal(
    await publicAuthRequestAllowed(edgeRequest(), environment, async () => {
      throw new Error('synthetic provider outage')
    }),
    false,
  )
})

test('all auth surfaces share aggregate and origin keys, without retaining the raw address', async () => {
  const origins: string[] = []
  const aggregate: string[] = []
  const bindings = {
    aggregate: {
      limit: async ({ key }: { key: string }) => {
        aggregate.push(key)
        return { success: true }
      },
    },
    origin: {
      limit: async ({ key }: { key: string }) => {
        origins.push(key)
        return { success: true }
      },
    },
  }
  for (let i = 0; i < 2; i++)
    assert.equal(
      await publicAuthRequestAllowed(
        edgeRequest(),
        environment,
        async () => bindings,
      ),
      true,
    )
  assert.deepEqual(aggregate, ['public-auth:v1', 'public-auth:v1'])
  assert.equal(origins[0], origins[1])
  assert.match(origins[0] ?? '', /^network:v1:[a-f0-9]{64}$/)
  assert.ok(!JSON.stringify(origins).includes('2001:db8'))
  await publicAuthRequestAllowed(
    edgeRequest('192.0.2.3'),
    environment,
    async () => bindings,
  )
  assert.notEqual(origins[0], origins[2])
})

test('budget exhaustion and exceptions deny independently of an identity or CAPTCHA', async () => {
  let calls = 0
  const pass = {
    limit: async () => {
      calls++
      return { success: true }
    },
  }
  const deny = { limit: async () => ({ success: false }) }
  assert.equal(
    await publicAuthRequestAllowed(edgeRequest(), environment, async () => ({
      origin: pass,
      aggregate: deny,
    })),
    false,
  )
  assert.equal(calls, 0)
  assert.equal(
    await publicAuthRequestAllowed(edgeRequest(), environment, async () => ({
      origin: deny,
      aggregate: pass,
    })),
    false,
  )
  assert.equal(
    await publicAuthRequestAllowed(edgeRequest(), environment, async () => ({
      origin: {
        limit: async () => {
          throw new Error('synthetic')
        },
      },
      aggregate: pass,
    })),
    false,
  )
  assert.equal(
    await publicAuthRequestAllowed(new Request('http://localhost'), {}),
    true,
  )
})
