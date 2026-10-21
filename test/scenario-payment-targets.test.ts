import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculatePaymentTargets,
  calculatePixTarget,
} from '../src/features/scenarios/payment-targets'

const draft = {
  name: 'Meta conjunta',
  effectiveOn: '2026-10-18',
  monthlyProfitGoal: '10000.00',
  fixedMonthlyCosts: '2288.00',
  salesDaysPerMonth: 20,
  weeksPerMonth: '4.00',
  minimumMarginRate: '0.7000',
  feeTaxReserveRate: '0.0000',
  mix: [
    {
      productId: 1,
      originalWeight: '1',
      plannedUnitPrice: '10.00',
      plannedUnitCost: '2.000',
    },
  ],
}
const products = [
  { id: 1, name: 'Brownie', type: 'finished_product', isActive: true },
]
const fees = {
  debitBps: 143,
  creditBps: 336,
  pixFixedCents: 49,
  effectiveOn: '2026-10-18',
}
test('meta conjunta após taxas é calculada por meio, sem fabricar uma média', () => {
  const rows = calculatePaymentTargets(draft, products, fees)
  assert.equal(rows.length, 2)
  for (const row of rows) assert.ok(Number(row.profit) >= 10000)
  assert.ok(
    Number(rows.find((row) => row.method === 'Crédito')?.targetRevenue) >
      Number(rows.find((row) => row.method === 'Débito')?.targetRevenue),
  )
})
test('meta Pix usa quantidade explícita de pagamentos e conserva objetivo após tarifa fixa', () => {
  const result = calculatePixTarget(draft, products, fees, '100')
  assert.equal(result.fee, '49.00')
  assert.ok(Number(result.profit) >= 10000)
  assert.throws(() => calculatePixTarget(draft, products, fees, ''))
  assert.throws(() => calculatePixTarget(draft, products, fees, '1.5'))
})
