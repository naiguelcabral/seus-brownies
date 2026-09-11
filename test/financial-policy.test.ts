import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { financialEvents, financialPeriods, sales } from '../src/db/schema'
import {
  canCorrectClosedFinancialPeriod,
  inventoryEffectForSaleLifecycle,
  normalizeSalesMix,
  summarizeFinancialIndicators,
} from '../src/features/finance/policy'

test('separa competência, margens, lucro gerencial e caixa sem duplicar custo direto', () => {
  assert.deepEqual(
    summarizeFinancialIndicators({
      grossRevenue: ['100.00'],
      refunds: ['10.00'],
      storeCreditsIssued: ['5.00'],
      cogs: ['30.00'],
      variableExpenses: ['4.00'],
      fixedCosts: ['20.00'],
      feeTaxReserve: ['1.00'],
      cashReceipts: ['100.00'],
      cashRefunds: ['10.00'],
      cashPayments: ['50.00'],
    }),
    {
      grossRevenue: '100.00',
      refunds: '10.00',
      storeCreditsIssued: '5.00',
      netRevenue: '85.00',
      cogs: '30.00',
      grossMargin: '55.00',
      contributionMargin: '51.00',
      managerialProfit: '30.00',
      cashFlow: '40.00',
    },
  )
})

test('normaliza mix de 103% para 100% preservando pesos e resíduo exato', () => {
  const result = normalizeSalesMix([
    { productId: 3, weight: '0.35' },
    { productId: 1, weight: '0.33' },
    { productId: 2, weight: '0.35' },
  ])
  assert.deepEqual(result, [
    { productId: 1, weight: '0.3204' },
    { productId: 2, weight: '0.3398' },
    { productId: 3, weight: '0.3398' },
  ])
  assert.equal(
    result.reduce((sum, row) => sum + BigInt(row.weight.replace('.', '')), 0n),
    10_000n,
  )
})

test('cancelamento e devolução respeitam a fronteira da entrega', () => {
  assert.equal(
    inventoryEffectForSaleLifecycle({
      event: 'cancellation',
      deliveredAt: null,
    }),
    'restore_fifo',
  )
  assert.equal(
    inventoryEffectForSaleLifecycle({
      event: 'return',
      deliveredAt: new Date('2026-09-11T12:00:00Z'),
    }),
    'no_vendable_stock_return',
  )
  assert.throws(
    () =>
      inventoryEffectForSaleLifecycle({
        event: 'cancellation',
        deliveredAt: new Date('2026-09-11T12:00:00Z'),
      }),
    /Venda entregue deve usar devolução/,
  )
})

test('somente Dono pode corrigir período financeiro fechado', () => {
  assert.equal(canCorrectClosedFinancialPeriod('owner'), true)
  assert.equal(canCorrectClosedFinancialPeriod('manager'), false)
  assert.equal(canCorrectClosedFinancialPeriod('admin'), false)
})

test('schema financeiro separa entrega, competência, caixa e fechamento', () => {
  assert.equal(sales.deliveredAt.name, 'delivered_at')
  assert.equal(financialEvents.revenueEffect.name, 'revenue_effect')
  assert.equal(financialEvents.cashEffect.name, 'cash_effect')
  assert.equal(financialPeriods.closureSnapshot.name, 'closure_snapshot')
})

test('migrations financeiras são aditivas e tornam eventos imutáveis', async () => {
  const foundation = await readFile(
    new URL('../drizzle/0023_strange_union_jack.sql', import.meta.url),
    'utf8',
  )
  const effects = await readFile(
    new URL('../drizzle/0024_brainy_doorman.sql', import.meta.url),
    'utf8',
  )
  assert.match(foundation, /CREATE TABLE "financial_events"/)
  assert.match(foundation, /financial_events_immutable/)
  assert.match(foundation, /financial_periods_closure_check/)
  assert.match(effects, /ADD COLUMN "revenue_effect"/)
  assert.match(effects, /ADD COLUMN "cash_effect"/)
  assert.doesNotMatch(`${foundation}\n${effects}`, /DROP|TRUNCATE|DELETE FROM/i)
})
