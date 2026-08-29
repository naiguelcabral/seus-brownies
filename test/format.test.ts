import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDateOnly, formatDateTime } from '../src/lib/format'

test('formata instantes no fuso de São Paulo de forma determinística', () => {
  assert.equal(formatDateTime('2026-08-29T13:06:00.000Z'), '29/08/2026, 10:06')
})

test('preserva o dia de campos date-only', () => {
  assert.equal(formatDateOnly('2026-08-29'), '29/08/2026')
})
