import assert from 'node:assert/strict'
import test from 'node:test'
import { convertKilogramPurchase } from '../src/features/operations/purchase-units'
import { calculateUnitCostMillisTotal } from '../src/features/operations/calculations'
import { calculateInventoryState } from '../src/features/production/calculations'

test('kg purchases preserve fractional quantities and exact inventory value', () => {
  const converted = convertKilogramPurchase('g', 1_250n, 12_500n)
  assert.equal(converted.quantity, '1250.000')
  const total = calculateUnitCostMillisTotal(12_500n, 1_250n)
  assert.equal(total, 1563n)
  const state = calculateInventoryState([
    {
      quantityDelta: converted.quantity,
      unitCost: '0.013',
      allocatedCost: '15.63',
    },
  ])
  assert.equal(state.quantity, 1_250_000n)
  assert.equal(state.valueCents, total)
})

test('minimum kg quantity is one gram; no floating point rounding', () => {
  assert.equal(convertKilogramPurchase('g', 1n, 1_990n).quantity, '1.000')
  assert.equal(
    convertKilogramPurchase('g', 1_000n, 12_500n).unitCostMillis,
    13n,
  )
})

test('incompatible units, invalid values, overflow and unsupported source precision fail', () => {
  for (const unit of ['unit', 'kg', 'ml', 'm']) {
    assert.throws(() => convertKilogramPurchase(unit, 1_000n, 10_000n))
  }
  assert.throws(() => convertKilogramPurchase('g', 0n, 10_000n))
  assert.throws(() => convertKilogramPurchase('g', 1_000n, -1n))
  assert.throws(() => convertKilogramPurchase('g', 1_000n, 12_501n))
  assert.throws(() => convertKilogramPurchase('g', 1_000_000_000n, 10_000n))
})
