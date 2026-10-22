import assert from 'node:assert/strict'
import test from 'node:test'
import {
  businessDate,
  businessDayEnd,
  businessDayStart,
  businessMonth,
} from '../src/lib/business-date'

test('data operacional permanece em Brasília na virada UTC do dia e do mês', () => {
  assert.equal(businessDate(new Date('2026-10-19T01:30:00Z')), '2026-10-18')
  assert.equal(businessDate(new Date('2026-11-01T01:30:00Z')), '2026-10-31')
  assert.equal(businessDate(new Date('2026-11-01T03:00:00Z')), '2026-11-01')
})

test('limites de dia operacional usam a meia-noite de Brasília', () => {
  assert.equal(
    businessDayStart('2026-10-31').toISOString(),
    '2026-10-31T03:00:00.000Z',
  )
  assert.equal(
    businessDayEnd('2026-10-31').toISOString(),
    '2026-11-01T03:00:00.000Z',
  )
  assert.equal(
    businessDayEnd('2024-12-31').toISOString(),
    '2025-01-01T03:00:00.000Z',
  )
  assert.throws(() => businessDayStart('2026-13-01'), /Data inválida/)
})

test('venda noturna fica no dia e no mês de Brasília', () => {
  const start = businessDayStart('2026-10-01')
  const end = businessDayEnd('2026-10-31')
  const included = (instant: string) => {
    const soldAt = new Date(instant)
    return soldAt >= start && soldAt < end
  }
  assert.equal(included('2026-10-31T20:59:00-03:00'), true)
  assert.equal(included('2026-10-31T21:00:00-03:00'), true)
  assert.equal(included('2026-10-31T23:59:59-03:00'), true)
  assert.equal(included('2026-11-01T00:00:00-03:00'), false)
  assert.equal(included('2026-10-01T00:00:00-03:00'), true)
  assert.equal(included('2026-09-30T23:59:59-03:00'), false)
})

test('mês padrão dos relatórios segue Brasília na virada UTC', () => {
  assert.deepEqual(businessMonth(new Date('2026-11-01T01:30:00Z')), {
    start: '2026-10-01',
    end: '2026-10-31',
  })
  assert.deepEqual(businessMonth(new Date('2026-11-01T03:00:00Z')), {
    start: '2026-11-01',
    end: '2026-11-30',
  })
  assert.deepEqual(businessMonth(new Date('2028-02-15T12:00:00Z')), {
    start: '2028-02-01',
    end: '2028-02-29',
  })
})
