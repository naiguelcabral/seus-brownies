import assert from 'node:assert/strict'
import test from 'node:test'
import { businessDate } from '../src/lib/business-date'

test('data operacional permanece em Brasília na virada UTC do dia e do mês', () => {
  assert.equal(businessDate(new Date('2026-10-19T01:30:00Z')), '2026-10-18')
  assert.equal(businessDate(new Date('2026-11-01T01:30:00Z')), '2026-10-31')
  assert.equal(businessDate(new Date('2026-11-01T03:00:00Z')), '2026-11-01')
})
