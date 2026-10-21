import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { getDb, pool } from '../e2e/connected/database.server'
import * as schema from '../src/db/schema'

assert.deepEqual(process.argv.slice(2), ['--ack-disposable-postgres17'])
try {
  const {
    rows: [identity],
  } = await pool.query(
    "select current_database() db,current_user actor,current_setting('server_version_num')::int version",
  )
  assert.equal(identity.db, 'cacau_connected')
  assert.equal(identity.actor, 'connected_fixture')
  assert.ok(identity.version >= 170000 && identity.version < 180000)
  const {
    rows: [count],
  } = await pool.query(
    "select count(*) from pg_tables where schemaname='public'",
  )
  assert.equal(
    Number(count.count),
    0,
    'Requires an empty disposable database; never cleans data.',
  )
  const ddl = execFileSync(
    './node_modules/.bin/drizzle-kit',
    ['export', '--schema=./src/db/schema.ts', '--dialect=postgresql'],
    { encoding: 'utf8', env: { PATH: process.env.PATH } },
  )
  await pool.query(ddl)
  const db = getDb()
  for (const role of ['owner', 'manager', 'production', 'employee'] as const) {
    await db
      .insert(schema.appUserAccess)
      .values({ authUserId: `qa-${role}`, role })
  }
  await db.insert(schema.appUserAccess).values([
    { authUserId: 'qa-inactive', role: 'owner', isActive: false },
    { authUserId: 'qa-unverified', role: 'owner' },
  ])
  await db.insert(schema.products).values([
    {
      sku: 'QA-INPUT',
      name: 'Ingrediente sintético',
      type: 'ingredient',
      unit: 'g',
    },
    {
      sku: 'PROD003',
      name: 'Brownie sintético',
      type: 'finished_product',
      unit: 'unit',
      salePrice: '10.00',
    },
    {
      sku: 'PROD002',
      name: 'Bordinhas sintéticas',
      type: 'finished_product',
      unit: 'unit',
      salePrice: '6.00',
    },
  ])
  await db.insert(schema.recipeVersions).values({
    sourceId: 'QA-RECIPE',
    sourceHash: 'a'.repeat(64),
    name: 'Receita sintética',
    version: 1,
    status: 'active',
    sourcePayload: {},
  })
  await db.insert(schema.recipeItems).values({
    sourceKey: 'QA-INGREDIENT',
    sourceHash: 'b'.repeat(64),
    recipeVersionId: 1,
    productId: 1,
    sourceName: 'Ingrediente sintético',
    quantity: '250.000',
    unit: 'g',
    sourcePayload: {},
  })
  await db.insert(schema.productionProfiles).values([
    {
      sourceId: 'QA-PROFILE-MAIN',
      sourceHash: 'c'.repeat(64),
      recipeVersionId: 1,
      productId: 2,
      expectedYield: '12.000',
      sourcePayload: {},
    },
    {
      sourceId: 'QA-PROFILE-EDGE',
      sourceHash: 'd'.repeat(64),
      recipeVersionId: 1,
      productId: 3,
      expectedYield: '6.000',
      sourcePayload: {},
    },
  ])
  for (const type of ['energy', 'labor'] as const) {
    await db.insert(schema.recipeOperationalRequirements).values({
      sourceKey: `QA-${type}`,
      sourceHash: (type === 'energy' ? '1' : '2').repeat(64),
      recipeVersionId: 1,
      type,
      quantity: '1.000',
      unit: type === 'energy' ? 'kwh' : 'hour',
      sourcePayload: {},
    })
    await db.insert(schema.operationalCostRates).values({
      sourceId: `QA-${type}`,
      sourceHash: (type === 'energy' ? '3' : '4').repeat(64),
      type,
      unit: type === 'energy' ? 'kwh' : 'hour',
      unitAmount: '0.00',
      effectiveFrom: '2026-01-01',
      sourcePayload: {},
    })
  }
  await db.insert(schema.salesLocations).values({ name: 'Balcão sintético' })
  await db.insert(schema.managementSettings).values({
    id: 1,
    salesDaysPerMonth: 20,
    weeksPerMonth: '4.00',
    normalRevenueTolerance: '0.0300',
    criticalRevenueTolerance: '0.0800',
    minimumProductMargin: '0.7000',
    feeTaxReserveRate: '0.0000',
    fixedMonthlyCosts: '2288.00',
    monthlyProfitGoal: '10000.00',
    paymentFees: {
      debitBps: 143,
      creditBps: 336,
      pixFixedCents: 49,
      effectiveOn: '2026-10-18',
    },
  })
  const exitCode = await new Promise<number>((done, reject) => {
    const child = spawn(
      process.execPath,
      [
        'node_modules/@playwright/test/cli.js',
        'test',
        '--config',
        'e2e/connected/playwright.config.ts',
      ],
      { stdio: 'inherit', env: process.env },
    )
    child.once('error', reject)
    child.once('exit', (code) => done(code ?? 1))
  })
  assert.equal(exitCode, 0, 'Connected Playwright validation failed.')
} finally {
  await pool.end()
}
