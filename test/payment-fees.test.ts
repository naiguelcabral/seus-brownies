import assert from 'node:assert/strict'
import test from 'node:test'
import {
  estimatePaymentFees,
  paymentFeeSchedule,
  parseFeePercent,
  parseFixedFee,
} from '../src/features/finance/payment-fees'

const schedule = paymentFeeSchedule.parse({
  debitBps: 143,
  creditBps: 336,
  pixFixedCents: 49,
  effectiveOn: '2026-10-18',
})
test('taxas por meio preservam Pix fixo por pagamento, sem média ou quantidade de produtos', () => {
  for (const amount of ['6.00', '30.00', '100.00']) {
    const rows = estimatePaymentFees(schedule, amount, '1')
    assert.equal(rows.find((row) => row.method === 'Pix')?.fee, '0.49')
  }
  assert.equal(
    estimatePaymentFees(schedule, '100.00', '2').find(
      (row) => row.method === 'Pix',
    )?.fee,
    '0.98',
  )
  assert.equal(
    estimatePaymentFees(schedule, '100.00', '2').find(
      (row) => row.method === 'Crédito',
    )?.fee,
    '3.36',
  )
  assert.equal(
    estimatePaymentFees(schedule, '100.00', '2').find(
      (row) => row.method === 'Débito',
    )?.fee,
    '1.43',
  )
})
test('parâmetros não arredondam silenciosamente entrada financeira inválida', () => {
  assert.equal(parseFeePercent('1,43'), 143)
  assert.equal(parseFixedFee('0,49'), 49)
  for (const value of ['1.439', '-1', '101', 'NaN'])
    assert.throws(() => parseFeePercent(value))
  assert.throws(() => estimatePaymentFees(schedule, '100', '1.5'))
  assert.throws(() => estimatePaymentFees(schedule, '-100', '1'))
})
