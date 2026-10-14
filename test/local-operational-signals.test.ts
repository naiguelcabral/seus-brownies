import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createLocalSignalTracker,
  evaluateLocalReadiness,
} from '../src/features/operations/local-signals'
import type { LocalSignal } from '../src/features/operations/local-signals'

const healthy = {
  application: 'available',
  database: 'available',
  audit: 'available',
  rateLimiter: 'available',
}

test('readiness desconhecido não vira saudável e falha prevalece sobre desconhecido', () => {
  assert.equal(evaluateLocalReadiness({}).status, 'unknown')
  assert.equal(evaluateLocalReadiness(healthy).status, 'ready')
  assert.equal(
    evaluateLocalReadiness({ database: 'unavailable' }).status,
    'not-ready',
  )
  const malicious = {
    ...healthy,
    database: 'synthetic-private-value',
    extra: 'synthetic-secret',
  }
  const result = evaluateLocalReadiness(malicious)
  assert.equal(result.status, 'unknown')
  assert.doesNotMatch(JSON.stringify(result), /private|secret|extra/)
})

test('hook local emite mudança de componente e recuperação sem repetir observação', async () => {
  const events: LocalSignal[] = []
  const track = createLocalSignalTracker((event) => {
    events.push(event)
  })
  assert.equal((await track(healthy)).delivery, 'delivered')
  assert.equal((await track(healthy)).delivery, 'unchanged')
  await track({ ...healthy, database: 'unavailable' })
  await track({ ...healthy, database: 'unavailable', audit: 'unavailable' })
  await track(healthy)
  assert.deepEqual(
    events.map((event) => event.status),
    ['ready', 'not-ready', 'not-ready', 'ready'],
  )
  assert.equal(events.at(-1)?.previous, 'not-ready')
})

test('falha do hook é sanitizada e permite repetir a entrega', async () => {
  let calls = 0
  const track = createLocalSignalTracker(() => {
    calls++
    if (calls === 1) throw new Error('synthetic-private-provider-error')
  })
  const failure = await track(healthy)
  assert.equal(failure.delivery, 'failed')
  assert.doesNotMatch(JSON.stringify(failure), /private|provider|error/)
  assert.equal((await track(healthy)).delivery, 'delivered')
  assert.equal(calls, 2)
})

test('mutação pelo consumidor não corrompe o estado retido', async () => {
  const track = createLocalSignalTracker((event) => {
    event.checks[0].state = 'unavailable'
  })
  const result = await track(healthy)
  assert.equal(result.readiness.checks[0].state, 'available')
  assert.equal((await track(healthy)).delivery, 'unchanged')
})
