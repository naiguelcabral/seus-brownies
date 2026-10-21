import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateSettlement,
  readSettlement,
} from '../src/features/finance/settlement'
import { calculateManagerialProfit } from '../src/features/finance/managerial-profit'
import { decimalCost, exactCost } from '../src/lib/exact-cost'

const fees = {
  debitBps: 143,
  creditBps: 336,
  pixFixedCents: 49,
  effectiveOn: '2026-10-18',
}
test('um pagamento Pix de vários produtos desconta 49 centavos uma única vez', () => {
  const result = calculateSettlement('pix', '30.00', '2026-10-18', fees)
  assert.equal(result.net, '29.51')
  assert.equal(result.fee, '0.49')
  assert.equal(result.gross, '30.00')
  assert.equal(
    calculateSettlement('debit', '100.00', '2026-10-18', fees).net,
    '98.57',
  )
  assert.equal(
    calculateSettlement('credit', '100.00', '2026-10-18', fees).net,
    '96.64',
  )
  assert.equal(
    calculateSettlement('cash', '100.00', '2026-10-18', null).fee,
    '0.00',
  )
})
test('tarifa ausente, futura, maior que pagamento ou snapshot alterado falham', () => {
  assert.throws(
    () => calculateSettlement('pix', '30', '2026-10-18', null),
    /tarifa/,
  )
  assert.throws(
    () => calculateSettlement('credit', '30', '2026-10-17', fees),
    /tarifa/,
  )
  assert.throws(
    () => calculateSettlement('pix', '0.40', '2026-10-18', fees),
    /excede/,
  )
  assert.throws(
    () =>
      readSettlement({
        ...calculateSettlement('pix', '30', '2026-10-18', fees),
        fee: '0.98',
      }),
    /inconsistentes/,
  )
})
test('lucro conjunto não desconta novamente mão de obra/energia dos lotes nem orçamento fixo', () => {
  const result = calculateManagerialProfit({
    netRevenue: '1000.00',
    exactCogs: decimalCost('400'),
    reconciled: true,
    goal: '10000',
    receipts: [{ paymentFee: '3.36' }],
    expenses: [
      { amount: '150', classification: 'production' },
      { amount: '88', classification: 'fixed' },
      { amount: '10', classification: 'variable' },
    ],
  })
  assert.equal(result.managerialProfit, '498.64')
  assert.equal(result.productionPayments, '150.00')
  assert.equal(result.remainingToGoal, '9501.36')
})
test('não declarar lucro com despesas não classificadas, taxa ausente ou cobertura FIFO incompleta', () => {
  const base = {
    netRevenue: '100',
    exactCogs: exactCost(0n),
    reconciled: true,
    goal: '10000',
    receipts: [],
    expenses: [],
  }
  assert.equal(
    calculateManagerialProfit({
      ...base,
      expenses: [{ amount: '5', classification: null }],
    }).managerialProfit,
    null,
  )
  assert.equal(
    calculateManagerialProfit({ ...base, receipts: [{ paymentFee: null }] })
      .available,
    false,
  )
  assert.equal(
    calculateManagerialProfit({ ...base, reconciled: false }).available,
    false,
  )
  assert.equal(
    calculateManagerialProfit({ ...base, exactCogs: exactCost(1n, 3n) })
      .managerialProfit,
    '99.67',
  )
})
