// Production/stock only. Fixed disposable PostgreSQL; never connects to Neon.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  openSync,
  closeSync,
  readFileSync,
  fstatSync,
  realpathSync,
  constants,
} from 'node:fs'
import { basename } from 'node:path'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import * as schema from '../src/db/schema'
import { persistProductionBatchCompletion } from '../src/features/production/functions'
import {
  persistPositiveInventoryAdjustment,
  persistNegativeInventoryEvent,
} from '../src/features/inventory/lifecycle-writers'
import { readPilotWorkbookCosts } from '../src/features/production/pilot-workbook-costs'
import { addCosts, scaleCost, displayCostMoney } from '../src/lib/exact-cost'
import { requireFirst, requireDefined } from '../src/lib/required-value'
import { quantityToThousandths } from '../src/features/production/calculations'

assert.equal(process.argv[2], '--ack-disposable-postgres17')
assert.ok(process.argv.length === 3 || process.argv.length === 4)
const referenceFile = process.argv[3]
function mustQuantity(value: string) {
  const parsed = quantityToThousandths(value)
  assert.ok(parsed !== null)
  return parsed
}
const specifications = [
  ['INS001', 'g', '500.000', '1', '100'],
  ['INS002', 'ml', '215.000', '1', '50'],
  ['INS003', 'g', '300.000', '3', '100'],
  ['INS004', 'g', '240.000', '1', '25'],
  ['INS005', 'm', '0.800', '1', '2'],
  ['INS006', 'unit', '24.000', '1', '10'],
  ['INS009', 'unit', '24.000', '1', '5'],
  ['INS013', 'g', '480.000', '1', '20'],
  ['HIS-OVOS-GRANDES', 'unit', '8.000', '3', '10'],
] as const
const synthetic = {
  schemaVersion: 1,
  workbookSha256: 'b'.repeat(64),
  costs: Object.fromEntries(
    specifications.map(([sku, unit, , numerator, denominator]) => [
      sku,
      { unit, unitCost: { numerator, denominator }, source: 'Synthetic!A1:E9' },
    ]),
  ),
  operationalPerRecipe: {
    energy: {
      unit: 'batch',
      unitCost: { numerator: '3', denominator: '2' },
      source: 'Synthetic!F1',
    },
    labor: {
      unit: 'batch',
      unitCost: { numerator: '10', denominator: '1' },
      source: 'Synthetic!F2',
    },
  },
}
function readReference(path: string) {
  const resolved = realpathSync(path)
  assert.ok(!/^\.env(?:\.|$)/i.test(basename(resolved)))
  const fd = openSync(resolved, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const info = fstatSync(fd)
    assert.ok(info.isFile() && info.size <= 64_000)
    const text = readFileSync(fd, 'utf8')
    assert.ok(Buffer.byteLength(text) <= 64_000)
    return text
  } finally {
    closeSync(fd)
  }
}
const keys = [
  'PILOT_STOCK_POLICY',
  'PILOT_WORKBOOK_COSTS',
  'PASSWORD_RESET_REDIRECT_ORIGIN',
] as const
const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 5442,
  user: 'pilot_stock_fixture',
  password: 'synthetic-pilot-stock-only',
  database: 'cacau_pilot_stock_fixture',
  max: 4,
})
const db = drizzle(pool, { schema })
try {
  const identity = (
    await pool.query(
      "select current_database() db,current_user actor,current_setting('server_version_num')::int version",
    )
  ).rows[0]
  assert.equal(identity.db, 'cacau_pilot_stock_fixture')
  assert.equal(identity.actor, 'pilot_stock_fixture')
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
    'Requires an empty disposable database; never clears data',
  )
  const ddl = execFileSync(
    './node_modules/.bin/drizzle-kit',
    ['export', '--schema=./src/db/schema.ts', '--dialect=postgresql'],
    { encoding: 'utf8', env: { PATH: process.env.PATH } },
  )
  await pool.query(ddl)
  process.env.PILOT_STOCK_POLICY = 'workbook_negative'
  process.env.PASSWORD_RESET_REDIRECT_ORIGIN =
    'https://cacau-v1-piloto.naiguelcabral.workers.dev'
  process.env.PILOT_WORKBOOK_COSTS = referenceFile
    ? readReference(referenceFile)
    : JSON.stringify(synthetic)
  const policy = readPilotWorkbookCosts(process.env)
  assert.ok(policy)
  const policyText = process.env.PILOT_WORKBOOK_COSTS
  const material = await db
    .insert(schema.products)
    .values(
      specifications.map(([sku, unit]) => ({
        sku,
        name: `Fixture ${sku}`,
        type:
          unit === 'm' || sku === 'INS006' || sku === 'INS009'
            ? ('packaging' as const)
            : ('ingredient' as const),
        unit,
      })),
    )
    .returning()
  const product = (sku: string) =>
    requireDefined(material.find((row) => row.sku === sku))
  const finished = requireFirst(
    await db
      .insert(schema.products)
      .values({
        sku: 'PROD003',
        name: 'Fixture brownie 24',
        type: 'finished_product',
        unit: 'unit',
        salePrice: '1.00',
      })
      .returning(),
  )
  const edge = requireFirst(
    await db
      .insert(schema.products)
      .values({
        sku: 'PROD002',
        name: 'Fixture bordinhas',
        type: 'finished_product',
        unit: 'unit',
        salePrice: '1.00',
      })
      .returning(),
  )
  const recipe = requireFirst(
    await db
      .insert(schema.recipeVersions)
      .values({
        sourceId: 'QA-PILOT-STOCK-RECIPE',
        sourceHash: '1'.repeat(64),
        name: 'Fixture 24 units',
        version: 1,
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
  const base = [
    ['INS001', '500.000'],
    ['INS002', '200.000'],
    ['INS002', '15.000'],
    ['INS003', '300.000'],
    ['INS004', '240.000'],
    ['INS005', '0.800'],
    ['HIS-OVOS-GRANDES', '8.000'],
  ] as const
  await db.insert(schema.recipeItems).values(
    base.map(([sku, quantity], index) => ({
      sourceKey: `QA-PILOT-STOCK-ITEM-${index}`,
      sourceHash: `fixture-item-${index}`,
      recipeVersionId: recipe.id,
      productId: product(sku).id,
      sourceName: sku,
      quantity,
      unit: product(sku).unit,
      sourcePayload: {},
    })),
  )
  for (const type of ['energy', 'labor'] as const) {
    await db.insert(schema.recipeOperationalRequirements).values({
      sourceKey: `QA-PILOT-STOCK-${type}`,
      sourceHash: `fixture-${type}`,
      recipeVersionId: recipe.id,
      type,
      quantity: '1.000',
      unit: 'batch',
      sourcePayload: {},
    })
    await db.insert(schema.operationalCostRates).values({
      sourceId: `QA-PILOT-STOCK-RATE-${type}`,
      sourceHash: `fixture-rate-${type}`,
      type,
      unit: 'batch',
      unitAmount: '999.00',
      effectiveFrom: '2026-01-01',
      sourcePayload: {},
    })
  }
  const profile = requireFirst(
    await db
      .insert(schema.productionProfiles)
      .values({
        sourceId: 'QA-PILOT-STOCK-MAIN',
        sourceHash: '2'.repeat(64),
        recipeVersionId: recipe.id,
        productId: finished.id,
        expectedYield: '24.000',
        packagingProductId: product('INS009').id,
        packagingQuantity: '1.000',
        sourcePayload: {},
      })
      .returning(),
  )
  await db.insert(schema.productionProfiles).values({
    sourceId: 'QA-PILOT-STOCK-EDGE',
    sourceHash: '3'.repeat(64),
    recipeVersionId: recipe.id,
    productId: edge.id,
    expectedYield: '0.000',
    sourcePayload: {},
  })
  await db.insert(schema.productionProfileComponents).values([
    {
      sourceId: 'QA-PILOT-STOCK-LABEL',
      sourceHash: '4'.repeat(64),
      productionProfileId: profile.id,
      productId: product('INS006').id,
      role: 'packaging',
      quantity: '1.000',
      unit: 'unit',
      sourcePayload: {},
    },
    {
      sourceId: 'QA-PILOT-STOCK-FILLING',
      sourceHash: '5'.repeat(64),
      productionProfileId: profile.id,
      productId: product('INS013').id,
      role: 'filling',
      quantity: '20.000',
      unit: 'g',
      sourcePayload: {},
    },
  ])
  const expected = specifications.reduce(
    (sum, [sku, , quantity]) =>
      addCosts(
        sum,
        scaleCost(
          requireDefined(policy.costs[sku]).unitCost,
          mustQuantity(quantity),
          1_000n,
        ),
      ),
    addCosts(
      policy.operationalPerRecipe.energy.unitCost,
      policy.operationalPerRecipe.labor.unitCost,
    ),
  )
  if (!referenceFile) assert.equal(displayCostMoney(expected), '73.40')
  const actor = 'qa-pilot-stock-owner'
  async function draft() {
    const batch = requireFirst(
      await db
        .insert(schema.productionBatches)
        .values({
          recipeVersionId: recipe.id,
          status: 'draft',
          plannedFor: '2026-10-30',
          recipeMultiplier: '1.000',
          notes: 'Synthetic local production and stock only',
          sourcePayload: { bordinhasWeightGrams: '0', losses: [] },
        })
        .returning(),
    )
    await db.insert(schema.productionBatchOutputs).values({
      productionBatchId: batch.id,
      productId: finished.id,
      role: 'primary',
      unit: 'unit',
      plannedQuantity: '24.000',
    })
    return batch
  }
  const counts = async () =>
    (
      await pool.query(
        'select (select count(*) from stock_movements)::int movements,(select count(*) from production_batch_consumptions)::int consumptions,(select count(*) from inventory_cost_layers)::int layers,(select count(*) from operational_costs)::int costs,(select count(*) from operational_audit_events)::int audit',
      )
    ).rows[0]
  const balance = async (id: number) =>
    mustQuantity(
      (
        await pool.query(
          'select coalesce(sum(quantity_delta),0)::text balance from stock_movements where product_id=$1',
          [id],
        )
      ).rows[0].balance,
    )
  const first = await draft()
  const concurrent = await Promise.allSettled([
    persistProductionBatchCompletion(db, { id: first.id }, actor),
    persistProductionBatchCompletion(db, { id: first.id }, actor),
  ])
  assert.equal(
    concurrent.filter((result) => result.status === 'fulfilled').length,
    1,
  )
  const rejection = concurrent.find((result) => result.status === 'rejected')
  assert.ok(
    rejection?.status === 'rejected' &&
      /rascunho/.test(String(rejection.reason)),
  )
  const second = await draft()
  await persistProductionBatchCompletion(db, { id: second.id }, actor)
  for (const batch of [first, second]) {
    const saved = requireFirst(
      await db
        .select()
        .from(schema.productionBatches)
        .where(eq(schema.productionBatches.id, batch.id)),
    )
    assert.equal(saved.status, 'completed')
    assert.equal(saved.actualQuantity, '24.000')
    assert.deepEqual(saved.exactCost, expected)
    const output = requireFirst(
      await db
        .select()
        .from(schema.productionBatchOutputs)
        .where(eq(schema.productionBatchOutputs.productionBatchId, batch.id)),
    )
    assert.equal(output.actualQuantity, '24.000')
    assert.deepEqual(output.exactCost, expected)
  }
  assert.deepEqual(await counts(), {
    movements: 20,
    consumptions: 18,
    layers: 2,
    costs: 4,
    audit: 2,
  })
  assert.equal(await balance(finished.id), 48_000n)
  for (const [sku, , quantity] of specifications)
    assert.equal(await balance(product(sku).id), -2n * mustQuantity(quantity))
  const beforeReplay = await counts()
  await assert.rejects(
    persistProductionBatchCompletion(db, { id: first.id }, actor),
    /rascunho/,
  )
  assert.deepEqual(await counts(), beforeReplay)
  const flour = product('INS004')
  await Promise.all([
    persistNegativeInventoryEvent(
      db,
      {
        productId: flour.id,
        quantity: '10',
        reason: 'Synthetic loss on negative stock',
        reference: 'QA-PILOT-STOCK-LOSS',
      },
      'loss',
      actor,
    ),
    persistNegativeInventoryEvent(
      db,
      {
        productId: flour.id,
        quantity: '5',
        reason: 'Synthetic negative adjustment',
        reference: 'QA-PILOT-STOCK-NEG',
      },
      'adjustment_negative',
      actor,
    ),
  ])
  assert.equal(await balance(flour.id), -495_000n)
  const pack = product('INS009')
  const packCost = scaleCost(requireDefined(policy.costs.INS009).unitCost, 50n)
  const receipt = await persistPositiveInventoryAdjustment(
    db,
    {
      productId: pack.id,
      quantity: '50',
      totalCost: displayCostMoney(packCost),
      reason: 'Synthetic receipt covering deficit',
      reference: 'QA-PILOT-STOCK-POS',
      originReference: 'Synthetic local fixture',
    },
    actor,
  )
  assert.equal(await balance(pack.id), 2_000n)
  const loss = await persistNegativeInventoryEvent(
    db,
    {
      productId: pack.id,
      quantity: '3',
      reason: 'Synthetic partially covered loss',
      reference: 'QA-PILOT-STOCK-PARTIAL',
    },
    'loss',
    actor,
  )
  assert.equal(await balance(pack.id), -1_000n)
  assert.equal(
    requireFirst(
      await db
        .select()
        .from(schema.inventoryCostLayers)
        .where(eq(schema.inventoryCostLayers.id, receipt.layerId)),
    ).remainingQuantity,
    '48.000',
  )
  assert.equal(
    (
      await pool.query(
        'select sum(quantity)::text quantity from inventory_cost_allocations where outgoing_stock_movement_id=$1',
        [loss.movementId],
      )
    ).rows[0].quantity,
    '2.000',
  )
  const fraction = await persistNegativeInventoryEvent(
    db,
    {
      productId: flour.id,
      quantity: '0.001',
      reason: 'Synthetic fractional loss',
      reference: 'QA-PILOT-STOCK-FRACTION',
    },
    'loss',
    actor,
  )
  assert.deepEqual(
    requireFirst(
      await db
        .select()
        .from(schema.stockMovements)
        .where(eq(schema.stockMovements.id, fraction.movementId)),
    ).exactCost,
    scaleCost(requireDefined(policy.costs.INS004).unitCost, 1n, 1_000n),
  )
  assert.equal(await balance(flour.id), -495_001n)
  const beforeDuplicate = await counts()
  await assert.rejects(
    persistNegativeInventoryEvent(
      db,
      {
        productId: flour.id,
        quantity: '10',
        reason: 'Synthetic replay',
        reference: 'QA-PILOT-STOCK-LOSS',
      },
      'loss',
      actor,
    ),
    /já registrado/,
  )
  await assert.rejects(
    persistPositiveInventoryAdjustment(
      db,
      {
        productId: pack.id,
        quantity: '50',
        totalCost: displayCostMoney(packCost),
        reason: 'Synthetic replay',
        reference: 'QA-PILOT-STOCK-POS',
        originReference: 'Synthetic local fixture',
      },
      actor,
    ),
    /já registrado/,
  )
  assert.deepEqual(await counts(), beforeDuplicate)
  const failed = await draft()
  const stable = await counts()
  process.env.PILOT_WORKBOOK_COSTS = JSON.stringify({ ...policy, costs: {} })
  await assert.rejects(
    persistProductionBatchCompletion(db, { id: failed.id }, actor),
    /Custo do workbook ausente/,
  )
  assert.deepEqual(await counts(), stable)
  process.env.PILOT_WORKBOOK_COSTS = policyText
  await pool.query(
    "create function qa_reject_audit() returns trigger language plpgsql as $$ begin if new.actor_auth_user_id='qa-force-audit-fail' then raise exception 'synthetic audit failure'; end if; return new; end $$",
  )
  await pool.query(
    'create trigger qa_reject_audit before insert on operational_audit_events for each row execute function qa_reject_audit()',
  )
  await assert.rejects(
    persistProductionBatchCompletion(
      db,
      { id: failed.id },
      'qa-force-audit-fail',
    ),
    (error: unknown) =>
      error instanceof Error &&
      error.cause instanceof Error &&
      error.cause.message === 'synthetic audit failure',
  )
  assert.deepEqual(await counts(), stable)
  assert.equal(
    requireFirst(
      await db
        .select()
        .from(schema.productionBatches)
        .where(eq(schema.productionBatches.id, failed.id)),
    ).status,
    'draft',
  )
  const rolledBackOutput = requireFirst(
    await db
      .select()
      .from(schema.productionBatchOutputs)
      .where(eq(schema.productionBatchOutputs.productionBatchId, failed.id)),
  )
  assert.equal(rolledBackOutput.plannedQuantity, '24.000')
  assert.equal(rolledBackOutput.actualQuantity, null)
  assert.equal(rolledBackOutput.exactCost, null)
  process.env.PASSWORD_RESET_REDIRECT_ORIGIN = 'https://example.test'
  await assert.rejects(
    persistProductionBatchCompletion(db, { id: failed.id }, actor),
    /Informe os valores totais reais de energia e mão de obra/,
  )
  await db
    .update(schema.productionBatches)
    .set({
      sourcePayload: {
        bordinhasWeightGrams: '0',
        losses: [],
        operationalAmounts: { energy: '0', labor: '0' },
      },
    })
    .where(eq(schema.productionBatches.id, failed.id))
  await assert.rejects(
    persistProductionBatchCompletion(db, { id: failed.id }, actor),
    /Estoque insuficiente|Valor do estoque inconsistente/,
  )
  assert.deepEqual(await counts(), stable)
  assert.equal(
    (await pool.query('select count(*)::int count from sales')).rows[0].count,
    0,
  )
  assert.equal(
    (await pool.query('select count(*)::int count from financial_events'))
      .rows[0].count,
    0,
  )
  assert.equal(
    (
      await pool.query(
        'select count(*)::int count from operational_audit_events where actor_auth_user_id<>$1 or actor_auth_user_id is null',
        [actor],
      )
    ).rows[0].count,
    0,
  )
  console.log(
    JSON.stringify({
      passed: true,
      scope: 'isolated-production-stock-only',
      reference: referenceFile ? 'private-workbook' : 'synthetic',
      workbookSha256: policy.workbookSha256,
      completedBatches: 2,
      unitsPerBatch: 24,
      finishedStock: '48.000',
      sales: 0,
      financialEvents: 0,
      remoteWrites: 0,
      checks: [
        'concurrent completion once',
        'nine inputs and two operational costs',
        'negative stock twice',
        'loss and adjustments',
        'partial layer coverage without fictitious receipt',
        'exact thousandth quantity',
        'duplicate references rejected',
        'missing cost rollback',
        'late audit rollback',
        'normal origin blocked',
      ],
    }),
  )
} finally {
  for (const key of keys) {
    const value = prior[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  await pool.end()
}
