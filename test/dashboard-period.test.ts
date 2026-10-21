import assert from 'node:assert/strict'
import test from 'node:test'
import { dashboardMonth } from '../src/features/dashboard/period'

test('dashboard usa o mês de Brasília mesmo quando UTC já virou o mês', () => {
  assert.deepEqual(dashboardMonth(new Date('2026-11-01T02:59:59Z')), {
    start: '2026-10-01',
    end: '2026-11-01',
  })
  assert.deepEqual(dashboardMonth(new Date('2026-11-01T03:00:00Z')), {
    start: '2026-11-01',
    end: '2026-12-01',
  })
})
test('limites mensais do dashboard cobrem virada de ano e fevereiro bissexto', () => {
  assert.deepEqual(dashboardMonth(new Date('2026-12-31T12:00:00Z')), {
    start: '2026-12-01',
    end: '2027-01-01',
  })
  assert.deepEqual(dashboardMonth(new Date('2028-02-29T12:00:00Z')), {
    start: '2028-02-01',
    end: '2028-03-01',
  })
})
