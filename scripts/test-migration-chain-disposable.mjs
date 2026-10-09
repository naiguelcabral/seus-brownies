// Intentionally ignores environment DSNs, dotenv and Neon. Fixed local CI fixture only.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import {
  buildCandidate,
  hash,
  sourceManifest,
  strategies,
} from './migration-chain-candidates.mjs'
import { captureCatalog } from './migration-chain-catalog.mjs'

assert.deepEqual(
  process.argv.slice(2),
  ['--ack-disposable-postgres17'],
  'explicit disposable fixture acknowledgement required',
)
const connection = {
  host: '127.0.0.1',
  port: 5433,
  user: 'cacau_chain_test',
  password: 'synthetic-ci-only',
  database: 'cacau_chain_disposable',
}
const evidenceFolder = '/tmp/cacau-chain-evidence'
mkdirSync(evidenceFolder, { recursive: true })
const admin = new pg.Client(connection)
await admin.connect()
const identity = (
  await admin.query(
    "SELECT current_database() db, current_user role, inet_server_addr()::text address, current_setting('server_version_num') version",
  )
).rows[0]
assert.equal(identity.db, connection.database)
assert.equal(identity.role, connection.user)
// Docker port mapping reports the container address here; the client host is fixed loopback.
assert.ok(identity.address)
assert.equal(Math.floor(Number(identity.version) / 10000), 17)
const sourceBefore = sourceManifest()
const report = {
  scope: 'synthetic-disposable-postgres17',
  application_authorized: false,
  active_chain_replaced: false,
  source: sourceBefore,
  server_version_num: identity.version,
  cases: [],
  gates: {
    shared_history: 'unconfirmed',
    financial_0019: 'pending-human-decision',
    scenarios_0028: 'pending-human-decision',
  },
}
let counter = 0
let baseline
const candidates = []
const apply = (client, folder) =>
  migrate(drizzle(client), { migrationsFolder: folder })
const candidate = (...args) => {
  const item = buildCandidate(...args)
  candidates.push(item)
  return item
}
const history = async (client) =>
  (
    await client.query(
      'SELECT hash, created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at',
    )
  ).rows
const save = (name, data) =>
  writeFileSync(
    join(evidenceFolder, `${name}.json`),
    JSON.stringify(data, null, 2) + '\n',
  )
async function fixture(name, run) {
  const database = `cacau_chain_${Date.now()}_${++counter}`
  assert.match(database, /^cacau_chain_[0-9_]+$/)
  await admin.query(`CREATE DATABASE "${database}"`)
  const client = new pg.Client({ ...connection, database })
  await client.connect()
  try {
    assert.equal(
      (
        await client.query(
          "SELECT count(*)::int n FROM pg_tables WHERE schemaname IN ('public','drizzle')",
        )
      ).rows[0].n,
      0,
    )
    await run(client)
    report.cases.push({ name, result: 'passed' })
    console.log(`PASS ${name}`)
  } finally {
    await client.end()
  }
}
function sqlState(error) {
  for (let item = error; item; item = item.cause)
    if (item.code) return item.code
  return undefined
}
async function fails(operation, state) {
  await assert.rejects(operation, (error) => {
    assert.equal(sqlState(error), state)
    return true
  })
}
async function seed(client) {
  await client.query(`INSERT INTO products (sku,name,product_type,measurement_unit) VALUES
    ('SYNTH-USED','Synthetic used','finished_product','unit'),
    ('SYNTH-FREE','Synthetic free','ingredient','g')`)
  await client.query(`INSERT INTO stock_movements (product_id,type,quantity_delta,unit_cost)
    SELECT id,'adjustment',10.125,2.35 FROM products WHERE sku='SYNTH-USED'`)
  await client.query(
    "INSERT INTO expenses (description,category,amount,occurred_at) VALUES ('Synthetic expense','fixture',123.45,'2026-01-02')",
  )
  await client.query(
    'INSERT INTO sales (subtotal_amount,total_amount) VALUES (17.89,17.89)',
  )
  await client.query(`INSERT INTO sale_items (sale_id,product_id,product_name,quantity,unit_price,total_amount)
    SELECT 1,id,name,1.000,17.89,17.89 FROM products WHERE sku='SYNTH-USED'`)
}
async function data(client) {
  const result = {}
  for (const [name, sql] of Object.entries({
    products:
      'SELECT sku,product_type,measurement_unit FROM products ORDER BY sku',
    expenses:
      'SELECT description,category,amount::text,occurred_at::text FROM expenses ORDER BY id',
    sales:
      'SELECT subtotal_amount::text,discount_amount::text,delivery_fee_amount::text,total_amount::text FROM sales ORDER BY id',
    items:
      'SELECT product_name,quantity::text,unit_price::text,total_amount::text FROM sale_items ORDER BY id',
    stock:
      'SELECT type,quantity_delta::text,unit_cost::text FROM stock_movements ORDER BY id',
  }))
    result[name] = (await client.query(sql)).rows
  return result
}
async function behaviors(client) {
  await fails(
    () =>
      client.query(
        "UPDATE products SET measurement_unit='g' WHERE sku='SYNTH-USED'",
      ),
    '23514',
  )
  await fails(
    () =>
      client.query(
        "UPDATE products SET product_type='ingredient' WHERE sku='SYNTH-USED'",
      ),
    '23514',
  )
  await client.query(
    "UPDATE products SET measurement_unit='kg' WHERE sku='SYNTH-FREE'",
  )
  await client.query(
    "UPDATE products SET measurement_unit='g' WHERE sku='SYNTH-FREE'",
  )
  await client.query(
    "UPDATE expenses SET idempotency_key='synthetic-key',idempotency_hash=repeat('a',64) WHERE id=1",
  )
  await fails(
    () =>
      client.query(
        "INSERT INTO expenses(description,category,amount,occurred_at,idempotency_key) VALUES('duplicate','fixture',1,'2026-01-02','synthetic-key')",
      ),
    '23505',
  )
  await client.query(`INSERT INTO inventory_cost_layers
    (product_id,source_stock_movement_id,available_at,original_quantity,original_cost,remaining_quantity,remaining_cost,origin)
    SELECT product_id,id,occurred_at,10.125,23.79,10.125,23.79,'adjustment' FROM stock_movements LIMIT 1`)
  await fails(
    () =>
      client.query(
        'UPDATE inventory_cost_layers SET remaining_quantity=99 WHERE id=1',
      ),
    '23514',
  )
  await client.query(`INSERT INTO financial_events (idempotency_key,idempotency_hash,type,amount,competence_date,reason,created_by_auth_user_id)
    VALUES ('synthetic-event',repeat('b',64),'sale_revenue',17.89,'2026-01-02','Synthetic fixture','synthetic-actor')`)
  await fails(
    () => client.query('UPDATE financial_events SET amount=1 WHERE id=1'),
    'P0001',
  )
  await fails(
    () => client.query('DELETE FROM financial_events WHERE id=1'),
    'P0001',
  )
}
try {
  for (const strategy of strategies)
    for (const path of ['upgrade-0016', 'empty']) {
      const name = `${strategy}-${path}`
      await fixture(name, async (client) => {
        let before
        if (path === 'upgrade-0016') {
          const base = candidate('replacement', { last: 16 })
          await apply(client, base.folder)
          await seed(client)
          before = await data(client)
        }
        const target = candidate(strategy)
        await apply(client, target.folder)
        const rows = await history(client)
        assert.deepEqual(
          rows,
          target.manifest.candidate_migrations.map((entry) => ({
            hash: entry.sha256,
            created_at: entry.when,
          })),
        )
        if (path === 'empty') {
          await seed(client)
          before = await data(client)
        }
        assert.deepEqual(await data(client), before)
        const catalog = await captureCatalog(client)
        if (!baseline) baseline = catalog
        assert.deepEqual(
          catalog,
          baseline,
          'catalog definitions differ across strategy/path',
        )
        const settings = (
          await client.query(
            'SELECT monthly_profit_goal::text,fixed_monthly_costs::text,sales_days_per_month,weeks_per_month::text FROM management_settings',
          )
        ).rows
        assert.deepEqual(settings, [
          {
            monthly_profit_goal: '10000.00',
            fixed_monthly_costs: '2200.00',
            sales_days_per_month: 20,
            weeks_per_month: '4.00',
          },
        ])
        await apply(client, target.folder)
        assert.deepEqual(await history(client), rows)
        assert.deepEqual(await captureCatalog(client), catalog)
        assert.deepEqual(await data(client), before)
        await behaviors(client)
        save(name, {
          manifest: target.manifest,
          catalog,
          catalog_sha256: hash(JSON.stringify(catalog)),
          history: rows,
          preserved_synthetic_data: before,
          financial_defaults: settings,
          checks: [
            'catalog-equivalence',
            'history-hashes',
            'data-preservation',
            'idempotent-replay',
            'used-product-trigger',
            'unused-product-update',
            'unique-idempotency',
            'fifo-constraint',
            'financial-immutability',
          ],
        })
        if (strategy === 'replacement' && path === 'upgrade-0016') {
          await client.query(
            'ALTER TABLE products DISABLE TRIGGER products_preserve_used_structure',
          )
          assert.notDeepEqual(
            await captureCatalog(client),
            catalog,
            'same-name trigger drift was not detected',
          )
          await client.query(
            'ALTER TABLE products ENABLE TRIGGER products_preserve_used_structure',
          )
          assert.deepEqual(await captureCatalog(client), catalog)
        }
      })
    }
  for (const strategy of strategies)
    for (const path of ['upgrade-0016', 'empty']) {
      await fixture(`rollback-${strategy}-${path}`, async (client) => {
        let beforeData
        let beforeHistory = []
        if (path === 'upgrade-0016') {
          await apply(client, candidate('replacement', { last: 16 }).folder)
          await seed(client)
          beforeData = await data(client)
          beforeHistory = await history(client)
        }
        const beforeCatalog = await captureCatalog(client)
        await fails(
          () =>
            apply(client, candidate(strategy, { injectFailure: true }).folder),
          '22012',
        )
        assert.deepEqual(await history(client), beforeHistory)
        assert.deepEqual(await captureCatalog(client), beforeCatalog)
        if (beforeData) assert.deepEqual(await data(client), beforeData)
      })
    }
  const original = fileURLToPath(new URL('../drizzle', import.meta.url))
  for (const path of ['upgrade-0016', 'empty'])
    await fixture(`original-fails-42703-${path}`, async (client) => {
      if (path === 'upgrade-0016') {
        await apply(client, candidate('replacement', { last: 16 }).folder)
        await seed(client)
      }
      const beforeCatalog = await captureCatalog(client)
      const beforeRows = path === 'empty' ? [] : await history(client)
      await fails(() => apply(client, original), '42703')
      assert.deepEqual(await captureCatalog(client), beforeCatalog)
      assert.deepEqual(await history(client), beforeRows)
    })
  await fixture('naive-compatibility-runtime-fails-42703', async (client) => {
    await apply(
      client,
      candidate('compatibility', { naiveCompatibility: true }).folder,
    )
    await seed(client)
    await fails(
      () =>
        client.query(
          "UPDATE products SET measurement_unit='g' WHERE sku='SYNTH-USED'",
        ),
      '42703',
    )
  })
  await fixture('0028-populated-mix-fails-23502', async (client) => {
    await apply(client, candidate('replacement', { last: 27 }).folder)
    await seed(client)
    await client.query(`INSERT INTO management_scenarios
      (scenario_key,version,name,effective_on,monthly_profit_goal,fixed_monthly_costs,sales_days_per_month,weeks_per_month,minimum_margin_bps,fee_tax_reserve_bps,created_by_auth_user_id,updated_by_auth_user_id)
      VALUES ('synthetic',1,'Synthetic scenario','2026-01-02',10000,2200,20,4,7000,0,'synthetic','synthetic')`)
    await client.query(`INSERT INTO management_scenario_mix (scenario_id,product_id,original_weight,normalized_weight_bps,planned_unit_price,planned_unit_cost)
      SELECT 1,id,1,10000,17.89,2.350 FROM products WHERE sku='SYNTH-USED'`)
    const before = await captureCatalog(client)
    const rows = await history(client)
    const mix = (await client.query('SELECT * FROM management_scenario_mix'))
      .rows
    await fails(() => apply(client, candidate('replacement').folder), '23502')
    assert.deepEqual(await captureCatalog(client), before)
    assert.deepEqual(await history(client), rows)
    assert.deepEqual(
      (await client.query('SELECT * FROM management_scenario_mix')).rows,
      mix,
    )
  })
  assert.deepEqual(
    sourceManifest(),
    sourceBefore,
    'active historical chain was mutated',
  )
  report.result = 'passed'
  save('summary', report)
  console.log(
    `All ${report.cases.length} PostgreSQL 17 cases passed; HML authorization remains false.`,
  )
} finally {
  for (const item of candidates)
    rmSync(item.folder, { recursive: true, force: true })
  await admin.end()
}
