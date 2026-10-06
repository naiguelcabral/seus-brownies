import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateStoreCreditBalance,
  summarizeStoreCreditLedger,
} from '../src/features/finance/store-credits'

test('resgates parciais consomem apenas o saldo exato do crédito', () => {
  assert.deepEqual(
    calculateStoreCreditBalance({
      issuedAmount: '10.00',
      redeemedAmounts: ['3.33', '1.67'],
      requestedAmount: '2.25',
    }),
    {
      issued: '10.00',
      redeemed: '5.00',
      available: '5.00',
      remainingAfterRequest: '2.75',
    },
  )
})

test('resgate acima do saldo falha fechado', () => {
  assert.throws(
    () =>
      calculateStoreCreditBalance({
        issuedAmount: '10.00',
        redeemedAmounts: ['9.99'],
        requestedAmount: '0.02',
      }),
    /excede o saldo disponível/,
  )
})

test('ledger liga resgates à emissão e omite créditos esgotados', () => {
  const occurredAt = new Date('2026-09-14T12:00:00Z')
  const result = summarizeStoreCreditLedger([
    {
      id: 1,
      type: 'store_credit_issued',
      settlesEventId: null,
      saleId: 4,
      saleItemId: 8,
      amount: '10.00',
      occurredAt,
      reason: 'Compensação',
    },
    {
      id: 2,
      type: 'store_credit_redeemed',
      settlesEventId: 1,
      saleId: 4,
      saleItemId: 8,
      amount: '4.00',
      occurredAt,
      reason: 'Uso parcial',
    },
    {
      id: 3,
      type: 'store_credit_issued',
      settlesEventId: null,
      saleId: 5,
      saleItemId: 9,
      amount: '2.00',
      occurredAt,
      reason: 'Compensação',
    },
    {
      id: 4,
      type: 'store_credit_redeemed',
      settlesEventId: 3,
      saleId: 5,
      saleItemId: 9,
      amount: '2.00',
      occurredAt,
      reason: 'Uso integral',
    },
  ])

  assert.equal(result.totalAvailable, '6.00')
  assert.deepEqual(result.credits, [
    {
      eventId: 1,
      saleId: 4,
      saleItemId: 8,
      occurredAt,
      reason: 'Compensação',
      issued: '10.00',
      redeemed: '4.00',
      available: '6.00',
      remainingAfterRequest: '6.00',
    },
  ])
})

test('ledger rejeita resgate sem emissão válida', () => {
  assert.throws(
    () =>
      summarizeStoreCreditLedger([
        {
          id: 2,
          type: 'store_credit_redeemed',
          settlesEventId: 99,
          saleId: null,
          saleItemId: null,
          amount: '1.00',
          occurredAt: new Date('2026-09-14T12:00:00Z'),
          reason: 'Inválido',
        },
      ]),
    /emissão de crédito inválida/,
  )
})
