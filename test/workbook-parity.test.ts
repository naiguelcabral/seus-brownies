import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { managementSettingsValues } from '../src/features/management/settings'
import {
  allocateReportedRevenue,
  classifyRevenueDifference,
} from '../src/features/operations/revenue-audit'
import { summarizeSalesMetrics } from '../src/features/reports/sales-metrics'
import { calculateSalesLocationPage } from '../src/features/locations/pagination'
import { managementSettings, saleItems, sales } from '../src/db/schema'

const validSettings = {
  monthlyProfitGoal: '10000,00',
  fixedMonthlyCosts: '2200,00',
  salesDaysPerMonth: 20,
  weeksPerMonth: '4,00',
  normalRevenueTolerance: '0,0300',
  criticalRevenueTolerance: '0,0800',
  minimumProductMargin: '0,7000',
  feeTaxReserveRate: '0,0000',
}

test('valida parâmetros exatos e ordena as tolerâncias de receita', () => {
  assert.equal(managementSettingsValues.safeParse(validSettings).success, true)
  assert.equal(
    managementSettingsValues.safeParse({
      ...validSettings,
      criticalRevenueTolerance: '0,0200',
    }).success,
    false,
  )
  assert.equal(
    managementSettingsValues.safeParse({
      ...validSettings,
      salesDaysPerMonth: 32,
    }).success,
    false,
  )
})

test('classifica limites normal, atenção e crítico sem ponto flutuante', () => {
  const classify = (reportedCents: bigint) =>
    classifyRevenueDifference({
      reportedCents,
      calculatedCents: 10_000n,
      normalTolerance: 300n,
      criticalTolerance: 800n,
    })
  assert.deepEqual(classify(9_700n), {
    differenceCents: -300n,
    status: 'normal',
  })
  assert.equal(classify(9_699n).status, 'attention')
  assert.equal(classify(9_200n).status, 'attention')
  assert.equal(classify(9_199n).status, 'critical')
  assert.equal(classify(10_801n).status, 'critical')
})

test('rateia faturamento informado e fecha o centavo residual', () => {
  assert.deepEqual(allocateReportedRevenue([3_333n, 6_667n], 9_401n), [
    3_133n,
    6_268n,
  ])
  assert.deepEqual(allocateReportedRevenue([500n, 500n, 500n], 1n), [
    1n,
    0n,
    0n,
  ])
  assert.deepEqual(allocateReportedRevenue([500n], 0n), [0n])
})

test('resume ticket, preço médio, auditoria e local com valores exatos', () => {
  const result = summarizeSalesMetrics(
    [
      {
        saleId: 1,
        locationId: 7,
        locationName: 'Evento',
        amount: '94.01',
        reportedAmount: '94.01',
        calculatedAmount: '100.00',
        auditStatus: 'attention',
      },
      {
        saleId: 2,
        locationId: 7,
        locationName: 'Evento',
        amount: '5.99',
        reportedAmount: null,
        calculatedAmount: null,
        auditStatus: null,
      },
    ],
    [
      { saleId: 1, quantity: '8.000' },
      { saleId: 2, quantity: '2.000' },
    ],
  )
  assert.equal(result.total.revenue, '100.00')
  assert.equal(result.total.ticketAverage, '50.00')
  assert.equal(result.total.averageUnitPrice, '10.00')
  assert.equal(result.total.audit.difference, '-5.99')
  assert.equal(result.total.audit.differenceRate, '-0.0599')
  assert.equal(result.total.audit.auditedEvents, 1)
  assert.equal(result.byLocation[0].units, '10.000')
})

test('paginação de locais limita a página solicitada', () => {
  assert.deepEqual(calculateSalesLocationPage(9, 21), {
    page: 2,
    pageSize: 20,
    totalPages: 2,
    offset: 20,
  })
})

test('schema e migration de paridade são aditivos e preservam histórico', async () => {
  assert.equal(managementSettings.monthlyProfitGoal.name, 'monthly_profit_goal')
  assert.equal(sales.adjustmentKind.name, 'adjustment_kind')
  assert.equal(saleItems.reportedAmount.name, 'reported_amount')
  const migration = await readFile(
    new URL('../drizzle/0019_short_ulik.sql', import.meta.url),
    'utf8',
  )
  assert.match(migration, /CREATE TABLE "management_settings"/)
  assert.match(migration, /VALUES \(1, 1, '10000\.00'/)
  assert.match(migration, /sale_items.*reported_amount/s)
  assert.doesNotMatch(migration, /DROP|TRUNCATE|DELETE FROM/i)
})

test('venda inclui local, auditoria e ajuste na mesma operação idempotente', async () => {
  const source = await readFile(
    new URL('../src/features/operations/functions.ts', import.meta.url),
    'utf8',
  )
  const saleWriter = source.slice(
    source.indexOf('export const createSale'),
    source.indexOf('const saleHistoryValues'),
  )
  assert.match(saleWriter, /locationId: data\.locationId/)
  assert.match(saleWriter, /reportedAmount: centsToMoney\(reportedCents\)/)
  assert.match(saleWriter, /calculatedAmount: centsToMoney\(subtotal\)/)
  assert.match(saleWriter, /classifyRevenueDifference/)
  assert.match(saleWriter, /allocateReportedRevenue/)
  assert.match(saleWriter, /adjustmentKind: data\.adjustmentKind/)
  assert.match(saleWriter, /onConflictDoNothing/)
  assert.match(saleWriter, /appendOperationalAudit/)
})

test('relatórios usam receita informada alocada sem sobrescrever o preço de tabela', async () => {
  const source = await readFile(
    new URL('../src/features/reports/functions.ts', import.meta.url),
    'utf8',
  )
  assert.match(
    source,
    /saleItemRevenue:[\s\S]*?coalesce\(\$\{saleItems\.reportedAmount\}, \$\{saleItems\.totalAmount\}\)/,
  )
  assert.match(
    source,
    /productName: saleItems\.productName[\s\S]*?coalesce\(\$\{saleItems\.reportedAmount\}, \$\{saleItems\.totalAmount\}\)/,
  )
})
