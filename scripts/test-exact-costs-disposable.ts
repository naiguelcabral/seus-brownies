import { requireDefined } from '../src/lib/required-value'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import * as schema from '../src/db/schema'
import { persistPurchase } from '../src/features/operations/functions'
import { persistProductionBatchCompletion } from '../src/features/production/functions'
import {
  decimalCost,
  sumCosts,
  costOrDecimal,
  exactCost,
} from '../src/lib/exact-cost'
import { calculateExactInventoryState } from '../src/features/production/calculations'

if (!process.argv.includes('--ack-disposable-postgres17'))
  throw new Error('Exige reconhecimento de PostgreSQL 17 descartável.')

// Fixed synthetic destination; never resolves environment files or a Neon connection.
const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 5437,
  user: 'exact_cost_fixture',
  password: 'synthetic-exact-cost-fixture',
  database: 'cacau_exact_costs',
  max: 1,
})
const db = drizzle(pool, { schema })
try {
  const identity = (
    await pool.query(
      "select current_database() as db, current_user as actor, current_setting('server_version_num')::int as version",
    )
  ).rows[0]
  assert.equal(identity.db, 'cacau_exact_costs')
  assert.equal(identity.actor, 'exact_cost_fixture')
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
    'Exige banco descartável vazio; não apaga dados para repetir.',
  )

  // Exercise additive SQL and preservation independently of the frozen historical chain.
  await pool.query('BEGIN')
  await pool.query(
    'CREATE SCHEMA exact_migration_fixture; SET LOCAL search_path TO exact_migration_fixture',
  )
  const tables = [
    'inventory_cost_allocations',
    'inventory_cost_layers',
    'inventory_cost_reversals',
    'production_batch_consumptions',
    'production_batch_outputs',
    'production_batches',
    'stock_movements',
    'operational_costs',
  ]
  for (const table of tables)
    await pool.query(
      `CREATE TABLE ${table}(id integer primary key, sentinel text); INSERT INTO ${table} VALUES(1, 'preserved')`,
    )
  for (const file of [
    '0029_exact_costs.sql',
    '0030_exact_operational_cost.sql',
  ])
    await pool.query(
      readFileSync(
        new URL(`../drizzle/pending-exact-costs/${file}`, import.meta.url),
        'utf8',
      ).replaceAll('--> statement-breakpoint', '\n'),
    )
  for (const table of tables)
    assert.equal(
      (await pool.query(`SELECT sentinel FROM ${table} WHERE id=1`)).rows[0]
        .sentinel,
      'preserved',
    )
  await pool.query('ROLLBACK')

  const ddl = execFileSync(
    './node_modules/.bin/drizzle-kit',
    ['export', '--schema=./src/db/schema.ts', '--dialect=postgresql'],
    { encoding: 'utf8', env: { PATH: process.env.PATH } },
  )
  await pool.query(ddl)
  const [ingredient, brownie, bordinhas] = await db
    .insert(schema.products)
    .values([
      {
        name: 'Farinha fixture',
        sku: 'ING-FIXTURE',
        type: 'ingredient',
        unit: 'g',
      },
      {
        name: 'Brownie fixture',
        sku: 'PROD003',
        type: 'finished_product',
        unit: 'unit',
        salePrice: '10.00',
      },
      {
        name: 'Bordinhas',
        sku: 'PROD002',
        type: 'finished_product',
        unit: 'unit',
        salePrice: '5.00',
      },
    ])
    .returning()
  assert.ok(ingredient && brownie && bordinhas)
  const purchase = {
    idempotencyKey: randomUUID(),
    supplierName: 'Fornecedor fixture',
    purchasedAt: '2026-10-18',
    items: [
      {
        productId: ingredient.id,
        quantity: '1.000',
        purchaseUnit: 'kg' as const,
        totalAmount: '12.50',
      },
    ],
  }
  const first = await persistPurchase(db, purchase, 'fixture-actor')
  assert.equal(first.replayed, false)
  assert.equal(
    (await persistPurchase(db, purchase, 'fixture-actor')).replayed,
    true,
  )
  await assert.rejects(
    persistPurchase(
      db,
      {
        ...purchase,
        items: [{ ...requireDefined(purchase.items[0]), totalAmount: '12.51' }],
      },
      'fixture-actor',
    ),
  )
  assert.equal((await db.select().from(schema.purchases)).length, 1)
  const initial = await db.select().from(schema.stockMovements)
  assert.equal(initial[0]?.quantityDelta, '1000.000')
  assert.deepEqual(requireDefined(initial[0]).exactCost, decimalCost('12.50'))

  const hash = 'f'.repeat(64)
  const [recipe] = await db
    .insert(schema.recipeVersions)
    .values({
      sourceId: 'fixture',
      sourceHash: hash,
      name: 'Base fixture',
      version: 1,
      status: 'active',
      sourcePayload: {},
    })
    .returning()
  assert.ok(recipe)
  await db.insert(schema.recipeItems).values({
    sourceKey: 'fixture',
    sourceHash: hash,
    recipeVersionId: recipe.id,
    productId: ingredient.id,
    sourceName: 'Farinha fixture',
    quantity: '250.000',
    unit: 'g',
    sourcePayload: {},
  })
  for (const [index, product] of [brownie, bordinhas].entries())
    await db.insert(schema.productionProfiles).values({
      sourceId: `fixture-${index}`,
      sourceHash: String(index).repeat(64),
      recipeVersionId: recipe.id,
      productId: product.id,
      expectedYield: index ? '12.000' : '24.000',
      sourcePayload: {},
    })
  for (const type of ['energy', 'labor'] as const) {
    await db.insert(schema.recipeOperationalRequirements).values({
      sourceKey: type,
      sourceHash: type === 'energy' ? 'e'.repeat(64) : 'a'.repeat(64),
      recipeVersionId: recipe.id,
      type,
      quantity: '1.000',
      unit: type === 'energy' ? 'kwh' : 'hour',
      sourcePayload: {},
    })
    await db.insert(schema.operationalCostRates).values({
      sourceId: type,
      sourceHash: type === 'energy' ? 'e'.repeat(64) : 'a'.repeat(64),
      type,
      unit: type === 'energy' ? 'kwh' : 'hour',
      unitAmount: '0.00',
      effectiveFrom: '2026-10-01',
      sourcePayload: {},
    })
  }
  const recipeId = recipe.id
  const brownieId = brownie.id
  const bordinhasId = bordinhas.id
  async function draft() {
    const [batch] = await db
      .insert(schema.productionBatches)
      .values({
        status: 'draft',
        recipeVersionId: recipeId,
        plannedFor: '2026-10-18',
        recipeMultiplier: '1.000',
        sourcePayload: {},
      })
      .returning()
    assert.ok(batch)
    await db.insert(schema.productionBatchOutputs).values([
      {
        productionBatchId: batch.id,
        productId: brownieId,
        role: 'primary',
        plannedQuantity: '12.000',
        unit: 'unit',
      },
      {
        productionBatchId: batch.id,
        productId: bordinhasId,
        role: 'co_product',
        plannedQuantity: '6.000',
        unit: 'unit',
      },
    ])
    return batch
  }
  for (let index = 0; index < 4; index++) {
    const batch = await draft()
    await persistProductionBatchCompletion(db, { id: batch.id })
    await assert.rejects(persistProductionBatchCompletion(db, { id: batch.id }))
  }
  const consumptions = await db
    .select()
    .from(schema.productionBatchConsumptions)
  assert.equal(consumptions.length, 4)
  for (const row of consumptions)
    assert.deepEqual(row.exactCost, decimalCost('3.125'))
  assert.deepEqual(
    sumCosts(
      consumptions.map((row) =>
        costOrDecimal(row.exactCost, row.totalCost ?? '0'),
      ),
    ),
    decimalCost('12.50'),
  )
  const stock = await db
    .select()
    .from(schema.stockMovements)
    .where(eq(schema.stockMovements.productId, ingredient.id))
    .orderBy(schema.stockMovements.occurredAt, schema.stockMovements.id)
  assert.deepEqual(calculateExactInventoryState(stock), {
    quantity: 0n,
    value: exactCost(0n),
  })
  const layers = await db.select().from(schema.inventoryCostLayers)
  assert.deepEqual(
    sumCosts(
      layers.map((layer) =>
        costOrDecimal(layer.exactOriginalCost, layer.originalCost),
      ),
    ),
    decimalCost('12.50'),
  )

  // Force a late audit failure: the header, item and incoming movement must all roll back.
  await pool.query(
    `CREATE FUNCTION public.reject_fixture_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture audit failure'; END $$; CREATE TRIGGER reject_fixture_audit BEFORE INSERT ON operational_audit_events FOR EACH ROW WHEN (NEW.reason = 'fixture-force-audit-failure') EXECUTE FUNCTION public.reject_fixture_audit()`,
  )
  const failedPurchase = {
    ...purchase,
    idempotencyKey: randomUUID(),
    notes: 'fixture-force-audit-failure',
  }
  await assert.rejects(persistPurchase(db, failedPurchase, 'fixture-actor'))
  assert.equal((await db.select().from(schema.purchases)).length, 1)
  assert.equal((await db.select().from(schema.stockMovements)).length, 13)
  // Reuse only the rolled-back fixture reference, proving that no receipt was consumed.
  await persistPurchase(
    db,
    { ...failedPurchase, notes: 'fixture recovered' },
    'fixture-actor',
  )
  const batch = await draft()
  await pool.query(
    'ALTER TABLE inventory_cost_layers ADD CONSTRAINT fixture_late_failure CHECK (false) NOT VALID',
  )
  await assert.rejects(persistProductionBatchCompletion(db, { id: batch.id }))
  assert.equal(
    (await db.select().from(schema.productionBatchConsumptions)).length,
    4,
  )
  assert.equal(
    (
      await db
        .select()
        .from(schema.productionBatches)
        .where(eq(schema.productionBatches.id, batch.id))
    )[0]?.status,
    'draft',
  )
  console.log(
    'PASS: additive migrations/preservation; exact kg total; replay/conflict; four partial consumptions; output/FIFO conservation; late purchase audit rollback; late production rollback.',
  )
} finally {
  await pool.end()
}
