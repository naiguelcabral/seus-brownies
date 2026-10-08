import assert from 'node:assert/strict'
import test from 'node:test'

import {
  compareOperationalTotals,
  previousEqualLengthPeriod,
} from '../src/features/reports/period-comparison'

test('período anterior é adjacente e tem mesma duração em UTC', () => {
  assert.deepEqual(previousEqualLengthPeriod('2026-10-01', '2026-10-07'), {
    start: '2026-09-24',
    end: '2026-09-30',
  })
  assert.deepEqual(previousEqualLengthPeriod('2024-03-01', '2024-03-01'), {
    start: '2024-02-29',
    end: '2024-02-29',
  })
  assert.throws(
    () => previousEqualLengthPeriod('2026-10-07', '2026-10-01'),
    /Período inválido/,
  )
})

test('diferenças de faturamento, volume e ticket preservam centavos e milésimos', () => {
  assert.deepEqual(
    compareOperationalTotals(
      {
        revenue: '9007199254740993.13',
        units: '9007199254740993.125',
        ticketAverage: '13.34',
      },
      {
        revenue: '9007199254740995.12',
        units: '9007199254740992.875',
        ticketAverage: '14.01',
      },
    ),
    {
      revenue: {
        current: '9007199254740993.13',
        previous: '9007199254740995.12',
        difference: '-1.99',
      },
      units: {
        current: '9007199254740993.125',
        previous: '9007199254740992.875',
        difference: '0.250',
      },
      ticketAverage: {
        current: '13.34',
        previous: '14.01',
        difference: '-0.67',
      },
    },
  )
})

test('ausência de vendas não inventa ticket nem diferença de ticket', () => {
  const result = compareOperationalTotals(
    { revenue: '0.00', units: '0.000', ticketAverage: null },
    { revenue: '12.00', units: '2.000', ticketAverage: '6.00' },
  )
  assert.deepEqual(result.ticketAverage, {
    current: null,
    previous: '6.00',
    difference: null,
  })
  assert.equal(result.revenue.difference, '-12.00')
  assert.equal(result.units.difference, '-2.000')
})

test('indicador monetário ou quantitativo inválido não vira zero', () => {
  assert.throws(
    () =>
      compareOperationalTotals(
        { revenue: '1.000', units: '1.000', ticketAverage: null },
        { revenue: '0.00', units: '0.000', ticketAverage: null },
      ),
    /Indicador operacional inválido/,
  )
})
