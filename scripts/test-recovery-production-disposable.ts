// Fixed synthetic PostgreSQL 17 fixture. Never reads environment files or connects to Neon.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import * as schema from '../src/db/schema'
import {
  persistSalePayment,
  persistSaleDelivery,
  loadManagerialOverview,
} from '../src/features/finance/functions'
import {
  persistSale,
  persistPurchase,
} from '../src/features/operations/functions'
import { persistProductionBatchCompletion } from '../src/features/production/functions'
import {
  decimalCost,
  sumCosts,
  scaleCost,
  addCosts,
} from '../src/lib/exact-cost'
import { requireFirst } from '../src/lib/required-value'

assert.deepEqual(process.argv.slice(2), ['--ack-disposable-postgres17'])
const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 5439,
  user: 'recovery_fixture',
  password: 'synthetic-recovery-only',
  database: 'cacau_recovery',
  max: 4,
})
const db = drizzle(pool, { schema })
try {
  const identity = (
    await pool.query(
      "select current_database() as db,current_user as actor,current_setting('server_version_num')::int as version",
    )
  ).rows[0]
  assert.equal(identity.db, 'cacau_recovery')
  assert.equal(identity.actor, 'recovery_fixture')
  assert.ok(identity.version >= 170000 && identity.version < 180000)
  assert.equal(
    Number(
      (
        await pool.query(
          "select count(*) from pg_tables where schemaname='public'",
        )
      ).rows[0].count,
    ),
    0,
    'Requires an empty disposable database; never cleans existing data',
  )
  const ddl = execFileSync(
    './node_modules/.bin/drizzle-kit',
    ['export', '--schema=./src/db/schema.ts', '--dialect=postgresql'],
    { encoding: 'utf8', env: { PATH: process.env.PATH } },
  )
  await pool.query(ddl)
  const inputProducts = await db
    .insert(schema.products)
    .values([
      { sku: 'TEST-BASE', name: 'Base fixture', type: 'ingredient', unit: 'g' },
      {
        sku: 'TEST-COVER',
        name: 'Cobertura fixture',
        type: 'ingredient',
        unit: 'g',
      },
      {
        sku: 'TEST-PACK',
        name: 'Embalagem fixture',
        type: 'packaging',
        unit: 'unit',
      },
      {
        sku: 'TEST-LABEL',
        name: 'Adesivo fixture',
        type: 'packaging',
        unit: 'unit',
      },
    ])
    .returning()
  const main = requireFirst(
    await db
      .insert(schema.products)
      .values({
        sku: 'PROD015',
        name: 'Brownie fixture',
        type: 'finished_product',
        unit: 'unit',
        salePrice: '6.00',
      })
      .returning(),
  )
  const edge = requireFirst(
    await db
      .insert(schema.products)
      .values({
        sku: 'PROD002',
        name: 'Bordinhas',
        type: 'finished_product',
        unit: 'unit',
        salePrice: '6.00',
      })
      .returning(),
  )
  const get = (sku: string) =>
    requireFirst(inputProducts.filter((row) => row.sku === sku))
  await persistPurchase(
    db,
    {
      idempotencyKey: randomUUID(),
      supplierName: 'Synthetic fixture',
      purchasedAt: '2026-10-18',
      items: [
        {
          productId: get('TEST-BASE').id,
          quantity: '0.850',
          purchaseUnit: 'kg',
          totalAmount: '8.50',
        },
        {
          productId: get('TEST-COVER').id,
          quantity: '2.400',
          purchaseUnit: 'kg',
          totalAmount: '96.00',
        },
        {
          productId: get('TEST-PACK').id,
          quantity: '49.000',
          totalAmount: '5.39',
        },
        {
          productId: get('TEST-LABEL').id,
          quantity: '49.000',
          totalAmount: '7.84',
        },
      ],
    },
    'synthetic-test-actor',
  )
  const recipe = requireFirst(
    await db
      .insert(schema.recipeVersions)
      .values({
        sourceId: 'RECOVERY-TEST',
        sourceHash: 'a'.repeat(64),
        name: 'Recovery fixture',
        version: 2,
        status: 'active',
        sourcePayload: {
          recovery: {
            mode: 'weighed',
            bakedWeightGrams: '850.000',
            packWeightGrams: '100.000',
            operationalInput: 'batch_totals',
          },
        },
      })
      .returning(),
  )
  await db.insert(schema.recipeItems).values({
    sourceKey: 'fixture-item',
    sourceHash: 'b'.repeat(64),
    recipeVersionId: recipe.id,
    productId: get('TEST-BASE').id,
    quantity: '850.000',
    unit: 'g',
    sourceName: 'Base fixture',
    sourcePayload: {},
  })
  for (const type of ['energy', 'labor'] as const) {
    await db.insert(schema.recipeOperationalRequirements).values({
      sourceKey: `fixture-${type}`,
      sourceHash: (type === 'energy' ? 'c' : 'd').repeat(64),
      recipeVersionId: recipe.id,
      type,
      quantity: '1.000',
      unit: 'batch',
      sourcePayload: {},
    })
    await db.insert(schema.operationalCostRates).values({
      type,
      sourceId: `fixture-rate-${type}`,
      sourceHash: (type === 'energy' ? '7' : '8').repeat(64),
      unit: 'batch',
      unitAmount: '999.00',
      effectiveFrom: '2026-10-01',
      sourcePayload: {
        test: 'historical rate must not override explicit actual totals',
      },
    })
  }
  for (const [i, product] of [main, edge].entries()) {
    const profile = requireFirst(
      await db
        .insert(schema.productionProfiles)
        .values({
          sourceId: `fixture-profile-${i}`,
          sourceHash: (i === 0 ? 'e' : 'f').repeat(64),
          recipeVersionId: recipe.id,
          productId: product.id,
          expectedYield: i === 0 ? '48.000' : '0.000',
          packagingProductId: get('TEST-PACK').id,
          packagingQuantity: '1.000',
          sourcePayload: {},
        })
        .returning(),
    )
    await db.insert(schema.productionProfileComponents).values({
      sourceId: `fixture-label-${i}`,
      sourceHash: (i === 0 ? '1' : '2').repeat(64),
      productionProfileId: profile.id,
      productId: get('TEST-LABEL').id,
      role: 'packaging',
      quantity: '1.000',
      unit: 'unit',
      sourcePayload: {},
    })
    if (i === 0)
      await db.insert(schema.productionProfileComponents).values({
        sourceId: 'fixture-cover',
        sourceHash: '3'.repeat(64),
        productionProfileId: profile.id,
        productId: get('TEST-COVER').id,
        role: 'coating',
        quantity: '50.000',
        unit: 'g',
        sourcePayload: {},
      })
  }
  async function draft() {
    const batch = requireFirst(
      await db
        .insert(schema.productionBatches)
        .values({
          recipeVersionId: recipe.id,
          status: 'draft',
          plannedFor: '2026-10-18',
          recipeMultiplier: '1.000',
          sourcePayload: {
            bordinhasWeightGrams: '100.000',
            operationalAmounts: { energy: '0.85', labor: '150.00' },
            losses: [],
          },
        })
        .returning(),
    )
    await db.insert(schema.productionBatchOutputs).values([
      {
        sourceKey: `fixture-main-${batch.id}`,
        sourceHash: `main-${batch.id}`,
        productionBatchId: batch.id,
        productId: main.id,
        role: 'primary',
        unit: 'unit',
        plannedQuantity: '48.000',
      },
      {
        sourceKey: `fixture-edge-${batch.id}`,
        sourceHash: `edge-${batch.id}`,
        productionBatchId: batch.id,
        productId: edge.id,
        role: 'co_product',
        unit: 'unit',
        plannedQuantity: '1.000',
      },
    ])
    return batch
  }
  const batch = await draft()
  const completed = await persistProductionBatchCompletion(
    db,
    { id: batch.id },
    'disposable-test',
  )
  assert.equal(completed.totalCost, '268.58')
  const layers = await db.select().from(schema.inventoryCostLayers)
  const produced = layers.filter((row) => row.productionBatchOutputId !== null)
  assert.equal(produced.length, 2)
  assert.deepEqual(
    sumCosts(produced.map((row) => row.exactOriginalCost ?? decimalCost('0'))),
    decimalCost('268.58'),
  )
  const edges = requireFirst(
    produced.filter((row) => row.productId === edge.id),
  )
  assert.deepEqual(
    edges.exactOriginalCost,
    addCosts(scaleCost(decimalCost('159.35'), 100n, 850n), decimalCost('0.27')),
  )
  const actualCosts = await db.select().from(schema.operationalCosts)
  assert.equal(
    actualCosts.find((row) => row.type === 'labor')?.amount,
    '150.00',
  )
  assert.equal(actualCosts.find((row) => row.type === 'labor')?.unit, 'batch')
  assert.equal(
    actualCosts.find((row) => row.type === 'labor')?.operationalRateId,
    null,
  )
  const movementCount = Number(
    (await pool.query('select count(*) from stock_movements')).rows[0].count,
  )
  await assert.rejects(
    persistProductionBatchCompletion(db, { id: batch.id }, 'disposable-test'),
    /rascunho/,
  )
  const insufficient = await draft()
  await assert.rejects(
    persistProductionBatchCompletion(
      db,
      { id: insufficient.id },
      'disposable-test',
    ),
    /Estoque insuficiente/,
  )
  assert.equal(
    Number(
      (await pool.query('select count(*) from stock_movements')).rows[0].count,
    ),
    movementCount,
  )
  assert.equal(
    requireFirst(
      await db
        .select()
        .from(schema.productionBatches)
        .where(eq(schema.productionBatches.id, insufficient.id)),
    ).status,
    'draft',
  )
  assert.equal((await db.select().from(schema.operationalCosts)).length, 2)
  // Full synthetic financial flow: no shared/HML data is used.
  await db.insert(schema.managementSettings).values({
    id: 1,
    salesDaysPerMonth: 20,
    weeksPerMonth: '4.00',
    normalRevenueTolerance: '0.0300',
    criticalRevenueTolerance: '0.0800',
    minimumProductMargin: '0.7000',
    feeTaxReserveRate: '0.0000',
    paymentFees: {
      debitBps: 143,
      creditBps: 336,
      pixFixedCents: 49,
      effectiveOn: '2026-10-18',
    },
    fixedMonthlyCosts: '2288.00',
    monthlyProfitGoal: '10000.00',
  })
  const location = requireFirst(
    await db
      .insert(schema.salesLocations)
      .values({ name: 'Synthetic counter', isActive: true })
      .returning(),
  )
  const sale = await persistSale(
    db,
    {
      idempotencyKey: randomUUID(),
      locationId: location.id,
      status: 'confirmed',
      reportedAmount: '12.00',
      adjustmentKind: 'none',
      items: [{ productId: main.id, quantity: '2.000' }],
    },
    'synthetic-test-actor',
  )
  const paymentDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const beforePaymentStock = await db.select().from(schema.stockMovements)
  const payment = {
    saleId: sale.id,
    method: 'pix' as const,
    occurredOn: paymentDate,
    reference: randomUUID(),
  }
  const [firstReceipt, replayedReceipt] = await Promise.all([
    persistSalePayment(db, payment, 'synthetic-test-actor'),
    persistSalePayment(db, payment, 'synthetic-test-actor'),
  ])
  assert.equal(firstReceipt.replayed, false)
  assert.equal(replayedReceipt.replayed, true)
  await assert.rejects(
    persistSalePayment(
      db,
      { ...payment, method: 'credit' },
      'synthetic-test-actor',
    ),
    /referência|diferente|conflito|payload/i,
  )
  await assert.rejects(
    persistSalePayment(
      db,
      { ...payment, reference: randomUUID() },
      'synthetic-test-actor',
    ),
    /ainda não paga/,
  )
  await persistSaleDelivery(
    db,
    { saleId: sale.id, deliveredOn: paymentDate },
    'synthetic-test-actor',
  )
  const receipts = (await db.select().from(schema.financialEvents)).filter(
    (row) => row.type === 'cash_receipt',
  )
  assert.equal(receipts.length, 1)
  const receipt = requireFirst(receipts)
  assert.equal(receipt.amount, '12.00')
  assert.equal(receipt.cashEffect, '11.51')
  assert.equal(receipt.paymentFee, '0.49')
  assert.equal(
    (await db.select().from(schema.stockMovements)).length,
    beforePaymentStock.length,
    'receipt/delivery cannot issue another stock movement',
  )
  // New tariffs must not rewrite a settled payment, even when delivery is retried.
  await db
    .update(schema.managementSettings)
    .set({
      paymentFees: {
        debitBps: 999,
        creditBps: 999,
        pixFixedCents: 999,
        effectiveOn: '2026-10-18',
      },
    })
    .where(eq(schema.managementSettings.id, 1))
  assert.equal(
    (await persistSalePayment(db, payment, 'synthetic-test-actor')).replayed,
    true,
  )
  await db.insert(schema.expenses).values([
    {
      description: 'Synthetic production day',
      category: 'Labor',
      classification: 'production',
      amount: '150.00',
      occurredAt: paymentDate,
    },
    {
      description: 'Synthetic MEI',
      category: 'MEI',
      classification: 'fixed',
      amount: '88.00',
      occurredAt: paymentDate,
    },
  ])
  const overview = await loadManagerialOverview(
    db,
    `${paymentDate.slice(0, 7)}-01`,
  )
  assert.equal(overview.available, true)
  assert.equal(overview.paymentFees, '0.49')
  assert.equal(overview.productionPayments, '150.00')
  assert.equal(overview.fixedExpenses, '88.00')
  assert.deepEqual(
    overview.exactProfit,
    addCosts(
      decimalCost('12.00'),
      scaleCost(
        addCosts(
          decimalCost('88.49'),
          scaleCost(
            produced.find((row) => row.productId === main.id)
              ?.exactOriginalCost ?? decimalCost('0'),
            2n,
            48n,
          ),
        ),
        -1n,
      ),
    ),
  )
  const directPaid = await persistSale(
    db,
    {
      idempotencyKey: randomUUID(),
      locationId: location.id,
      status: 'paid',
      paymentMethod: 'cash',
      reportedAmount: '6.00',
      adjustmentKind: 'none',
      items: [{ productId: main.id, quantity: '1.000' }],
    },
    'synthetic-test-actor',
  )
  assert.ok(directPaid.id)
  await db
    .insert(schema.financialPeriods)
    .values({ periodMonth: `${paymentDate.slice(0, 7)}-01`, status: 'closed' })
  const unpaid = requireFirst(
    await db
      .insert(schema.sales)
      .values({
        status: 'confirmed',
        subtotalAmount: '6.00',
        totalAmount: '6.00',
      })
      .returning(),
  )
  const factsBeforeRejected = (await db.select().from(schema.financialEvents))
    .length
  await assert.rejects(
    persistSalePayment(
      db,
      {
        saleId: unpaid.id,
        method: 'cash',
        occurredOn: paymentDate,
        reference: randomUUID(),
      },
      'synthetic-test-actor',
    ),
    /fechado/,
  )
  assert.equal(
    (await db.select().from(schema.financialEvents)).length,
    factsBeforeRejected,
  )
  assert.equal(
    (
      await db.select().from(schema.sales).where(eq(schema.sales.id, unpaid.id))
    )[0]?.status,
    'confirmed',
  )
  console.log(
    'PASS: full purchase-production-sale-delivery-payment FIFO flow, concurrent payment replay, immutable tariff snapshot, one Pix fee for multiple products, no duplicate stock or double production expense, closed-period rollback.',
  )
  console.log(
    'PASS: PostgreSQL 17 production consumes physical materials, retains exact per-output FIFO costs, uses actual batch totals, rejects replay and rolls back insufficient stock.',
  )
} finally {
  await pool.end()
}
