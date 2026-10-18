// Synthetic loopback PostgreSQL only. Never loads environment connection strings.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { buildAuthBaselinePayload } from './auth-baseline-payload.mjs'
import { buildScopedUpgradePayload } from './migration-chain-scoped-payload.mjs'

assert.deepEqual(process.argv.slice(2), ['--ack-disposable-postgres17'])
const client = new pg.Client({
  host: '127.0.0.1',
  port: 5433,
  user: 'cacau_chain_test',
  password: 'synthetic-ci-only',
  database: 'neondb',
})
const sql = readFileSync(
  new URL('../evidence/catalog-inputs-import-2026-10-18.sql', import.meta.url),
  'utf8',
)
async function run(statements) {
  await client.query('BEGIN')
  try {
    for (const statement of statements) await client.query(statement)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
await client.connect()
try {
  assert.equal(
    Number(
      (await client.query('SHOW server_version_num')).rows[0]
        .server_version_num,
    ) >= 170000,
    true,
  )
  assert.equal(
    (await client.query("SELECT to_regclass('public.products') AS name"))
      .rows[0].name,
    null,
  )
  await client.query('CREATE SCHEMA neon_auth')
  await run(buildAuthBaselinePayload({ databaseName: 'neondb' }).statements)
  await run(buildScopedUpgradePayload({ databaseName: 'neondb' }).statements)
  await client.query("INSERT INTO categories(name) VALUES ('Preservar')")
  await client.query(
    "INSERT INTO products(sku,name,product_type,measurement_unit) SELECT 'PROD'||lpad(n::text,3,'0'),'Synthetic '||n,'finished_product','unit' FROM generate_series(1,17) n",
  )
  const before = (await client.query('SELECT * FROM products ORDER BY sku'))
    .rows
  // Force late audit failure: no products, aliases or receipt may survive.
  await client.query(
    "ALTER TABLE operational_audit_events ADD CONSTRAINT input_catalog_fixture_failure CHECK(action <> 'catalog.purchase-unit.import')",
  )
  await assert.rejects(client.query(sql), /input_catalog_fixture_failure/)
  await client.query('ROLLBACK')
  assert.deepEqual(
    (await client.query('SELECT * FROM products ORDER BY sku')).rows,
    before,
  )
  assert.equal(
    (
      await client.query(
        'SELECT count(*)::int AS n FROM product_import_aliases',
      )
    ).rows[0].n,
    0,
  )
  assert.equal(
    (
      await client.query(
        'SELECT count(*)::int AS n FROM historical_import_records',
      )
    ).rows[0].n,
    0,
  )
  console.log(
    'PASS late failure rolls back catalog, aliases, receipt and audit',
  )
  await client.query(
    'ALTER TABLE operational_audit_events DROP CONSTRAINT input_catalog_fixture_failure',
  )
  await client.query(sql)
  assert.equal(
    (await client.query('SELECT count(*)::int AS n FROM products')).rows[0].n,
    36,
  )
  assert.equal(
    (await client.query('SELECT count(*)::int AS n FROM stock_movements'))
      .rows[0].n,
    0,
  )
  assert.deepEqual(
    (
      await client.query(
        "SELECT * FROM products WHERE sku LIKE 'PROD%' ORDER BY sku",
      )
    ).rows,
    before,
  )
  console.log(
    'PASS 19 inputs, 10 kg aliases, no stock and original catalog preserved',
  )
  await assert.rejects(client.query(sql), /Catalog changed|consumed/)
  await client.query('ROLLBACK')
  assert.equal(
    (await client.query('SELECT count(*)::int AS n FROM products')).rows[0].n,
    36,
  )
  console.log('PASS repeated import rejected without duplicates')
} finally {
  await client.end()
}
