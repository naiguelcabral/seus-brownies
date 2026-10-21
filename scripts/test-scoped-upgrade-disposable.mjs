// Synthetic loopback only. No dotenv, environment DSNs or external SQL.
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { buildAuthBaselinePayload } from './auth-baseline-payload.mjs'
import { buildScopedUpgradePayload } from './migration-chain-scoped-payload.mjs'
import {
  buildCandidate,
  hash,
  sourceManifest,
} from './migration-chain-candidates.mjs'
import { captureCatalog } from './migration-chain-catalog.mjs'
import {
  verify0017ProductGuards,
  verify0017Idempotency,
} from './migration-chain-0017-checks.mjs'

assert.deepEqual(process.argv.slice(2), ['--ack-disposable-postgres17'])
const connection = {
  host: '127.0.0.1',
  port: 5433,
  user: 'cacau_chain_test',
  password: 'synthetic-ci-only',
  database: 'cacau_chain_disposable',
}
const admin = new pg.Client(connection)
await admin.connect()
assert.equal(
  Math.floor(
    Number(
      (await admin.query('SHOW server_version_num')).rows[0].server_version_num,
    ) / 10000,
  ),
  17,
)
const sourceBefore = sourceManifest()
const cases = []
let fullCatalog
let snapshotTablesChecked = 0
const snapshotShapeQueries = []
const checkpointSchema = JSON.parse(
  readFileSync(
    new URL('../drizzle/meta/0028_snapshot.json', import.meta.url),
    'utf8',
  ),
)
const quoteIdentifier = (name) => '"' + name.replaceAll('"', '""') + '"'
const history = async (client) =>
  (
    await client.query(
      'SELECT hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at',
    )
  ).rows
async function run(client, statements) {
  await client.query('BEGIN')
  try {
    for (const statement of statements) await client.query(statement)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
async function fixture(name, verify) {
  const database = `cacau_scoped_upgrade_${Date.now()}_${cases.length}`
  assert.match(database, /^cacau_scoped_upgrade_[0-9_]+$/)
  await admin.query(`CREATE DATABASE "${database}"`)
  const client = new pg.Client({ ...connection, database })
  await client.connect()
  try {
    await client.query('CREATE SCHEMA neon_auth')
    await client.query('CREATE TABLE neon_auth.synthetic_marker (value text)')
    await client.query(
      "INSERT INTO neon_auth.synthetic_marker VALUES ('preserve')",
    )
    await run(
      client,
      buildAuthBaselinePayload({ databaseName: database }).statements,
    )
    await client.query(
      "INSERT INTO app_user_access(auth_user_id,role) VALUES ('synthetic-owner','owner'),('synthetic-manager','manager')",
    )
    await client.query(
      "INSERT INTO auth_audit_events(action,outcome,request_id) VALUES ('role_changed','success','synthetic-preserve-audit')",
    )
    await client.query(
      "INSERT INTO products(sku,name,product_type,measurement_unit) VALUES ('SYNTH-USED','Synthetic used','finished_product','unit'),('SYNTH-FREE','Synthetic free','ingredient','g')",
    )
    await client.query(
      "INSERT INTO stock_movements(product_id,type,quantity_delta,unit_cost) SELECT id,'adjustment',10.125,2.35 FROM products WHERE sku='SYNTH-USED'",
    )
    await client.query(
      "INSERT INTO expenses(description,category,amount,occurred_at) VALUES ('Synthetic expense','fixture',123.45,'2026-01-02')",
    )
    await client.query(
      'INSERT INTO sales(subtotal_amount,total_amount) VALUES (17.89,17.89)',
    )
    const baselineHistory = await history(client)
    const baselineCatalog = await captureCatalog(client)
    const payload = buildScopedUpgradePayload({ databaseName: database })
    await verify({ client, payload, baselineHistory, baselineCatalog })
    assert.deepEqual(
      (await client.query('SELECT value FROM neon_auth.synthetic_marker')).rows,
      [{ value: 'preserve' }],
    )
    assert.deepEqual(
      (
        await client.query(
          'SELECT role::text,is_active FROM app_user_access ORDER BY role::text',
        )
      ).rows,
      [
        { role: 'manager', is_active: true },
        { role: 'owner', is_active: true },
      ],
    )
    assert.equal(
      (
        await client.query(
          "SELECT count(*)::int n FROM auth_audit_events WHERE request_id='synthetic-preserve-audit'",
        )
      ).rows[0].n,
      1,
    )
    cases.push({ name, result: 'passed' })
    console.log(`PASS ${name}`)
  } finally {
    await client.end()
  }
}
try {
  await fixture(
    'full upgrade, historical 0028 shape, money, guards and repeat rejection',
    async ({ client, payload, baselineHistory }) => {
      await run(client, payload.statements)
      const rows = await history(client)
      assert.deepEqual(rows.slice(0, 17), baselineHistory)
      assert.deepEqual(
        rows,
        payload.manifest.candidate_migrations.map((r) => ({
          hash: r.sha256,
          created_at: r.when,
        })),
      )
      assert.equal(
        (await client.query('SELECT amount::text FROM expenses')).rows[0]
          .amount,
        '123.45',
      )
      assert.equal(
        (
          await client.query(
            'SELECT total_amount::text, delivered_at FROM sales',
          )
        ).rows[0].total_amount,
        '17.89',
      )
      assert.equal(
        (await client.query('SELECT delivered_at FROM sales')).rows[0]
          .delivered_at,
        null,
      )
      assert.equal(
        (await client.query('SELECT quantity_delta::text FROM stock_movements'))
          .rows[0].quantity_delta,
        '10.125',
      )
      const db = drizzle(client)
      let checkedTables = 0
      // This fixture stops at 0028. Check every historical column; the forward
      // fixture separately checks the complete current ORM through 0033.
      for (const table of Object.values(checkpointSchema.tables)) {
        const columns = Object.values(table.columns).map((column) =>
          quoteIdentifier(column.name),
        )
        const statement = `SELECT ${columns.join(',')} FROM public.${quoteIdentifier(table.name)} LIMIT 0`
        snapshotShapeQueries.push(statement)
        await client.query(statement)
        checkedTables++
      }
      assert.equal(checkedTables, 38)
      snapshotTablesChecked = checkedTables
      assert.deepEqual(
        (
          await client.query(`SELECT monthly_profit_goal::text, fixed_monthly_costs::text,
      sales_days_per_month, weeks_per_month::text, minimum_product_margin::text
      FROM management_settings WHERE id=1`)
        ).rows,
        [
          {
            monthly_profit_goal: '10000.00',
            fixed_monthly_costs: '2200.00',
            sales_days_per_month: 20,
            weeks_per_month: '4.00',
            minimum_product_margin: '0.7000',
          },
        ],
      )
      assert.equal(
        (
          await client.query(
            'SELECT count(*)::int n FROM management_scenario_mix',
          )
        ).rows[0].n,
        0,
      )
      await client.query('BEGIN')
      try {
        await verify0017ProductGuards(client)
        await verify0017Idempotency(client)
      } finally {
        await client.query('ROLLBACK')
      }
      await assert.rejects(
        () => run(client, payload.statements),
        /REQUIRES_EXACT_0016/,
      )
      await migrate(db, {
        migrationsFolder: new URL('../drizzle', import.meta.url).pathname,
      })
      assert.deepEqual(await history(client), rows)
      fullCatalog = await captureCatalog(client)
    },
  )
  await fixture(
    'late failure restores complete catalog and original receipts',
    async ({ client, payload, baselineHistory, baselineCatalog }) => {
      await assert.rejects(
        () => run(client, [...payload.statements, 'SELECT 1/0']),
        /division by zero/,
      )
      assert.deepEqual(await history(client), baselineHistory)
      assert.deepEqual(await captureCatalog(client), baselineCatalog)
    },
  )
  await fixture(
    'historical hash drift rejected before migration',
    async ({ client, payload, baselineCatalog }) => {
      await client.query(
        "UPDATE drizzle.__drizzle_migrations SET hash=repeat('0',64) WHERE id=1",
      )
      const before = await history(client)
      await assert.rejects(
        () => run(client, payload.statements),
        /REQUIRES_EXACT_0016/,
      )
      assert.deepEqual(await history(client), before)
      assert.deepEqual(await captureCatalog(client), baselineCatalog)
    },
  )
  await fixture(
    'partial application rejected without overwriting objects',
    async ({ client, payload, baselineHistory }) => {
      await client.query(
        'ALTER TABLE expenses ADD COLUMN idempotency_key varchar(160)',
      )
      const before = await captureCatalog(client)
      await assert.rejects(
        () => run(client, payload.statements),
        /PARTIAL_APPLICATION/,
      )
      assert.deepEqual(await history(client), baselineHistory)
      assert.deepEqual(await captureCatalog(client), before)
    },
  )
  await fixture(
    'catalog equals independently migrated corrected reference',
    async ({ client }) => {
      const candidate = buildCandidate('replacement', { last: 28 })
      try {
        await migrate(drizzle(client), { migrationsFolder: candidate.folder })
        assert.deepEqual(await captureCatalog(client), fullCatalog)
      } finally {
        rmSync(candidate.folder, { recursive: true, force: true })
      }
    },
  )
  assert.deepEqual(sourceManifest(), sourceBefore)
  const evidenceFolder = mkdtempSync(
    join(tmpdir(), 'cacau-scoped-upgrade-evidence-'),
  )
  writeFileSync(
    join(evidenceFolder, 'checkpoint-0028-shape-readonly.json'),
    JSON.stringify(
      {
        scope: 'historical-0028-read-only-shape-checks',
        row_limit: 0,
        sql_sha256: hash(JSON.stringify(snapshotShapeQueries)),
        statements: snapshotShapeQueries,
      },
      null,
      2,
    ) + '\n',
    { mode: 0o600, flag: 'wx' },
  )
  writeFileSync(
    join(evidenceFolder, 'result.json'),
    JSON.stringify(
      {
        scope: 'synthetic-disposable-postgres17',
        application_authorized: false,
        source_unchanged: true,
        snapshot_tables_checked: snapshotTablesChecked,
        cases,
        catalog_sha256: hash(JSON.stringify(fullCatalog)),
      },
      null,
      2,
    ) + '\n',
    { mode: 0o600, flag: 'wx' },
  )
  console.log(`${cases.length} scoped upgrade cases passed`)
} finally {
  await admin.end()
}
