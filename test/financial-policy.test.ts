import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { financialEvents, financialPeriods, sales } from '../src/db/schema'
import {
  calculateCompensationAmount,
  canCorrectClosedFinancialPeriod,
  inventoryEffectForSaleLifecycle,
  normalizeSalesMix,
  summarizeFinancialEventEffects,
  summarizeFinancialIndicators,
} from '../src/features/finance/policy'
import {
  closeFinancialPeriodValues,
  correctFinancialEventValues,
  redeemStoreCreditValues,
} from '../src/features/finance/contracts'

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

test('snapshot de fechamento soma efeitos assinados sem ponto flutuante', () => {
  assert.deepEqual(
    summarizeFinancialEventEffects([
      { revenueEffect: '100.00', cashEffect: '90.00' },
      { revenueEffect: '-10.01', cashEffect: '-5.00' },
      { revenueEffect: '0.00', cashEffect: '0.01' },
    ]),
    { netRevenue: '89.99', cashFlow: '85.01', eventCount: 3 },
  )
})

test('contratos exigem mês canônico e correção monetária assinada', () => {
  assert.equal(
    closeFinancialPeriodValues.safeParse({
      periodMonth: '2026-09-01',
      notes: 'Fechamento conferido',
    }).success,
    true,
  )
  assert.equal(
    closeFinancialPeriodValues.safeParse({
      periodMonth: '2026-09-11',
      notes: 'Fechamento conferido',
    }).success,
    false,
  )
  assert.equal(
    correctFinancialEventValues.safeParse({
      correctsEventId: 1,
      effect: 'revenue',
      deltaAmount: '-0.01',
      occurredOn: '2026-09-11',
      reason: 'Correção de centavo',
      reference: 'CORR-1',
    }).success,
    true,
  )
  assert.equal(
    correctFinancialEventValues.safeParse({
      correctsEventId: 1,
      effect: 'cash',
      deltaAmount: '0.00',
      occurredOn: '2026-09-11',
      reason: 'Sem efeito',
      reference: 'CORR-2',
    }).success,
    false,
  )
  assert.equal(
    redeemStoreCreditValues.safeParse({
      issuanceEventId: 1,
      amount: '2.50',
      occurredOn: '2026-09-14',
      reason: 'Uso parcial do saldo',
      reference: 'CREDIT-1-1',
    }).success,
    true,
  )
  assert.equal(
    redeemStoreCreditValues.safeParse({
      issuanceEventId: 1,
      amount: '0.00',
      occurredOn: '2026-09-14',
      reason: 'Sem consumo',
      reference: 'CREDIT-1-2',
    }).success,
    false,
  )
})

test('compensações parciais fecham o total sem exceder o item entregue', () => {
  assert.equal(
    calculateCompensationAmount({
      itemAmount: '10.00',
      itemQuantity: '3.000',
      priorCompensatedAmount: '0.00',
      priorCompensatedQuantity: '0.000',
      requestedQuantity: '1.000',
    }),
    '3.33',
  )
  assert.equal(
    calculateCompensationAmount({
      itemAmount: '10.00',
      itemQuantity: '3.000',
      priorCompensatedAmount: '6.67',
      priorCompensatedQuantity: '2.000',
      requestedQuantity: '1.000',
    }),
    '3.33',
  )
  assert.throws(
    () =>
      calculateCompensationAmount({
        itemAmount: '10.00',
        itemQuantity: '3.000',
        priorCompensatedAmount: '6.67',
        priorCompensatedQuantity: '2.000',
        requestedQuantity: '2.000',
      }),
    /excede o item entregue/,
  )
})

test('schema financeiro separa entrega, competência, caixa e fechamento', () => {
  assert.equal(sales.deliveredAt.name, 'delivered_at')
  assert.equal(financialEvents.revenueEffect.name, 'revenue_effect')
  assert.equal(financialEvents.cashEffect.name, 'cash_effect')
  assert.equal(financialEvents.settlesEventId.name, 'settles_event_id')
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
  const quantity = await readFile(
    new URL('../drizzle/0025_talented_darwin.sql', import.meta.url),
    'utf8',
  )
  const settlements = await readFile(
    new URL('../drizzle/0026_shiny_edwin_jarvis.sql', import.meta.url),
    'utf8',
  )
  assert.match(foundation, /CREATE TABLE "financial_events"/)
  assert.match(foundation, /financial_events_immutable/)
  assert.match(foundation, /financial_periods_closure_check/)
  assert.match(effects, /ADD COLUMN "revenue_effect"/)
  assert.match(effects, /ADD COLUMN "cash_effect"/)
  assert.match(quantity, /ADD COLUMN "quantity"/)
  assert.match(settlements, /ADD COLUMN "settles_event_id"/)
  assert.match(settlements, /financial_events_settlement_fk/)
  assert.match(settlements, /financial_events_settlement_check/)
  assert.match(settlements, /revenue_effect = 0 AND cash_effect = 0/)
  assert.doesNotMatch(
    `${foundation}\n${effects}\n${quantity}\n${settlements}`,
    /DROP|TRUNCATE|DELETE FROM/i,
  )
})

test('writers G2 registram entrega e compensação sem restaurar estoque pós-entrega', async () => {
  const source = await readFile(
    new URL('../src/features/finance/functions.ts', import.meta.url),
    'utf8',
  )
  const compensation = source.slice(
    source.indexOf('export async function persistDeliveredSaleCompensation'),
  )
  assert.match(source, /type: 'sale_revenue'/)
  assert.match(source, /type: 'cash_receipt'/)
  assert.match(source, /type: 'store_credit_redeemed'/)
  assert.match(source, /revenueEffect: '0\.00',[\s\S]*?cashEffect: '0\.00'/)
  assert.match(compensation, /type:[\s\S]*?'cash_refund'/)
  assert.match(compensation, /'store_credit_issued'/)
  assert.doesNotMatch(compensation, /stockMovements|inventoryCostReversals/)
  assert.match(compensation, /appendOperationalAudit/)
  assert.match(source, /pg_advisory_xact_lock/)
  assert.match(source, /financial_period\.close/)
  assert.match(source, /financial_event\.correct/)
  assert.match(source, /canCorrectClosedFinancialPeriod/)
})

test('venda paga registra caixa no mesmo writer transacional', async () => {
  const source = await readFile(
    new URL('../src/features/operations/functions.ts', import.meta.url),
    'utf8',
  )
  const saleWriter = source.slice(
    source.indexOf('export const createSale'),
    source.indexOf('const saleHistoryValues'),
  )
  assert.match(saleWriter, /appendPaidSaleCashReceipt/)
})
