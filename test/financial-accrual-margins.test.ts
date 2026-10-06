import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { summarizeAccrualMargins } from '../src/features/finance/accrual-margins'

const sales = [{ id: 1, locationId: 7, locationName: 'Feira Central' }]
const saleItems = [
  {
    id: 11,
    saleId: 1,
    productId: 3,
    productName: 'Brownie',
    revenue: '60.00',
  },
  {
    id: 12,
    saleId: 1,
    productId: 4,
    productName: 'Cookie',
    revenue: '40.00',
  },
]
const allocations = [
  {
    id: 101,
    saleItemId: 11,
    productionBatchId: 18,
    quantity: '2.000',
    allocatedCost: '20.00',
  },
  {
    id: 102,
    saleItemId: 11,
    productionBatchId: null,
    quantity: '1.000',
    allocatedCost: '10.00',
  },
  {
    id: 103,
    saleItemId: 12,
    productionBatchId: 19,
    quantity: '1.000',
    allocatedCost: '15.00',
  },
]

test('competência soma CMV uma vez e mantém origem sem lote reconciliada', () => {
  const result = summarizeAccrualMargins({
    events: [
      {
        id: 1,
        type: 'sale_revenue',
        saleId: 1,
        saleItemId: null,
        revenueEffect: '100.00',
      },
      {
        id: 2,
        type: 'cash_refund',
        saleId: 1,
        saleItemId: 11,
        revenueEffect: '-20.00',
      },
    ],
    sales,
    saleItems,
    allocations,
  })

  assert.deepEqual(
    {
      netRevenue: result.netRevenue,
      cogs: result.cogs,
      grossMargin: result.grossMargin,
      unattributedRevenue: result.unattributedRevenue,
      reconciled: result.reconciled,
    },
    {
      netRevenue: '80.00',
      cogs: '45.00',
      grossMargin: '35.00',
      unattributedRevenue: '0.00',
      reconciled: true,
    },
  )
  assert.deepEqual(result.byProduct, [
    {
      productId: 3,
      productName: 'Brownie',
      revenue: '40.00',
      cogs: '30.00',
      grossMargin: '10.00',
    },
    {
      productId: 4,
      productName: 'Cookie',
      revenue: '40.00',
      cogs: '15.00',
      grossMargin: '25.00',
    },
  ])
  assert.deepEqual(result.byBatch, [
    {
      productionBatchId: 18,
      revenue: '26.67',
      cogs: '20.00',
      grossMargin: '6.67',
    },
    {
      productionBatchId: 19,
      revenue: '40.00',
      cogs: '15.00',
      grossMargin: '25.00',
    },
    {
      productionBatchId: null,
      revenue: '13.33',
      cogs: '10.00',
      grossMargin: '3.33',
    },
  ])
  assert.deepEqual(result.byLocation, [
    {
      locationId: 7,
      locationName: 'Feira Central',
      revenue: '80.00',
      cogs: '45.00',
      grossMargin: '35.00',
    },
  ])
})

test('compensação posterior reduz só a receita do próprio período', () => {
  const result = summarizeAccrualMargins({
    events: [
      {
        id: 2,
        type: 'store_credit_issued',
        saleId: 1,
        saleItemId: 11,
        revenueEffect: '-20.00',
      },
    ],
    sales,
    saleItems,
    allocations,
  })

  assert.equal(result.netRevenue, '-20.00')
  assert.equal(result.cogs, '0.00')
  assert.equal(result.grossMargin, '-20.00')
  assert.deepEqual(result.byProduct[0], {
    productId: 3,
    productName: 'Brownie',
    revenue: '-20.00',
    cogs: '0.00',
    grossMargin: '-20.00',
  })
  assert.equal(result.byLocation[0]?.cogs, '0.00')
})

test('correção no nível da venda é rateada por receita e fecha em centavos', () => {
  const result = summarizeAccrualMargins({
    events: [
      {
        id: 1,
        type: 'sale_revenue',
        saleId: 1,
        saleItemId: null,
        revenueEffect: '100.00',
      },
      {
        id: 3,
        type: 'revenue_correction',
        saleId: 1,
        saleItemId: null,
        revenueEffect: '-10.00',
      },
    ],
    sales,
    saleItems,
    allocations,
  })

  assert.equal(result.netRevenue, '90.00')
  assert.equal(result.cogs, '45.00')
  assert.deepEqual(
    result.byProduct.map((item) => item.revenue),
    ['54.00', '36.00'],
  )
  assert.equal(
    result.byBatch.reduce(
      (sum, item) => sum + BigInt(item.revenue.replace('.', '')),
      0n,
    ),
    9_000n,
  )
})

test('fato sem venda fica explícito e entrega duplicada falha fechada', () => {
  const unattributed = summarizeAccrualMargins({
    events: [
      {
        id: 9,
        type: 'revenue_correction',
        saleId: null,
        saleItemId: null,
        revenueEffect: '-3.00',
      },
    ],
    sales: [],
    saleItems: [],
    allocations: [],
  })
  assert.equal(unattributed.unattributedRevenue, '-3.00')
  assert.equal(unattributed.reconciled, true)

  assert.throws(
    () =>
      summarizeAccrualMargins({
        events: [
          {
            id: 1,
            type: 'sale_revenue',
            saleId: 1,
            saleItemId: null,
            revenueEffect: '100.00',
          },
          {
            id: 2,
            type: 'sale_revenue',
            saleId: 1,
            saleItemId: null,
            revenueEffect: '100.00',
          },
        ],
        sales,
        saleItems,
        allocations,
      }),
    /mais de um fato de receita/,
  )
})

test('reconciliação cobre simultaneamente produto, lote e local', () => {
  const result = summarizeAccrualMargins({
    events: [
      {
        id: 1,
        type: 'sale_revenue',
        saleId: 1,
        saleItemId: null,
        revenueEffect: '100.00',
      },
    ],
    sales,
    saleItems,
    allocations,
  })

  const sum = (
    rows: Array<{ revenue: string; cogs: string }>,
    field: 'revenue' | 'cogs',
  ) =>
    rows.reduce((total, row) => total + BigInt(row[field].replace('.', '')), 0n)
  for (const dimension of [
    result.byProduct,
    result.byBatch,
    result.byLocation,
  ]) {
    assert.equal(sum(dimension, 'revenue'), 10_000n)
    assert.equal(sum(dimension, 'cogs'), 4_500n)
  }
  assert.equal(result.reconciled, true)
})

test('consulta de margem usa competência e alocações sem reversão pós-entrega', async () => {
  const source = await readFile(
    new URL('../src/features/finance/functions.ts', import.meta.url),
    'utf8',
  )
  const start = source.indexOf('async function loadAccrualMargins')
  const end = source.indexOf('function signedMoneyToCents', start)
  const query = source.slice(start, end)

  assert.match(query, /financialEvents\.competenceDate/)
  assert.match(query, /inventoryCostAllocations\.allocatedCost/)
  assert.match(query, /productionBatchOutputs\.productionBatchId/)
  assert.doesNotMatch(query, /sales\.soldAt|inventoryCostReversals/)
})
