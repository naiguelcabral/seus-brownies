// Offline-source clone on a fixed disposable loopback PostgreSQL 17 instance.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pg from 'pg'

assert.deepEqual(process.argv.slice(2), ['--ack-disposable-postgres17'])
const source = JSON.parse(
  readFileSync('/tmp/cacau-metadata-fixture-data.json', 'utf8'),
)
const candidate = JSON.parse(
  readFileSync('evidence/profile-materials-release-2026-10-18.json', 'utf8'),
)
const client = new pg.Client({
  host: '127.0.0.1',
  port: 5440,
  user: 'metadata_fixture',
  password: 'synthetic-metadata-only',
  database: 'cacau_metadata',
})
async function transaction(statements) {
  await client.query('BEGIN')
  try {
    for (const statement of statements) await client.query(statement)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
const counts = async () =>
  (
    await client.query(
      `SELECT (SELECT count(*) FROM products)::int AS products,(SELECT count(*) FROM production_profiles)::int AS profiles,(SELECT count(*) FROM recipe_versions)::int AS recipes,(SELECT count(*) FROM production_profile_components)::int AS components,(SELECT count(*) FROM management_scenarios)::int AS scenarios,(SELECT count(*) FROM management_scenario_mix)::int AS mix,(SELECT count(*) FROM production_batches)::int AS batches,(SELECT count(*) FROM stock_movements)::int AS movements`,
    )
  ).rows[0]
try {
  await client.connect()
  const identity = (
    await client.query(
      "SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num')::int AS version",
    )
  ).rows[0]
  assert.equal(identity.db, 'cacau_metadata')
  assert.equal(identity.actor, 'metadata_fixture')
  assert.ok(identity.version >= 170000 && identity.version < 180000)
  assert.equal(
    Number(
      (
        await client.query(
          "SELECT count(*) FROM pg_tables WHERE schemaname='public'",
        )
      ).rows[0].count,
    ),
    0,
    'Requires a new empty disposable database; never cleans existing data',
  )
  await client.query(
    readFileSync('/tmp/cacau-metadata-fixture/baseline.sql', 'utf8'),
  )
  const ordered = [
    'categories',
    'products',
    'recipe_versions',
    'recipe_items',
    'recipe_operational_requirements',
    'operational_cost_rates',
    'production_profiles',
    'production_profile_components',
    'management_settings',
    'management_scenarios',
    'management_scenario_mix',
    'management_scenario_history',
    'historical_import_records',
    'operational_audit_events',
  ]
  for (const table of ordered) {
    assert.match(table, /^[a-z_]+$/)
    await client.query(
      `INSERT INTO ${table} SELECT * FROM jsonb_populate_recordset(NULL::${table},$1::jsonb)`,
      [JSON.stringify(source.tables[table])],
    )
    await client.query(
      `SELECT setval(pg_get_serial_sequence('${table}','id'),COALESCE((SELECT max(id) FROM ${table}),1),EXISTS(SELECT 1 FROM ${table}))`,
    )
  }
  await client.query(
    'CREATE SCHEMA drizzle;CREATE TABLE drizzle.__drizzle_migrations(id serial primary key,hash text NOT NULL,created_at bigint)',
  )
  for (const receipt of source.receipts)
    await client.query(
      'INSERT INTO drizzle.__drizzle_migrations(id,hash,created_at) VALUES($1,$2,$3)',
      [receipt.id, receipt.hash, receipt.created_at],
    )
  await client.query(
    "SELECT setval('drizzle.__drizzle_migrations_id_seq',(SELECT max(id) FROM drizzle.__drizzle_migrations),true)",
  )
  await transaction(candidate.schemaStatements)
  assert.equal(
    Number(
      (await client.query('SELECT count(*) FROM drizzle.__drizzle_migrations'))
        .rows[0].count,
    ),
    35,
  )
  const before = await counts()
  await assert.rejects(
    transaction([
      ...candidate.dataStatements,
      "DO $$ BEGIN RAISE EXCEPTION 'EXPECTED_LATE_ROLLBACK'; END $$",
    ]),
    /EXPECTED_LATE_ROLLBACK/,
  )
  assert.deepEqual(await counts(), before)
  await transaction(candidate.dataStatements)
  assert.deepEqual(await counts(), {
    products: 38,
    profiles: 34,
    recipes: 2,
    components: 43,
    scenarios: 2,
    mix: 33,
    batches: 0,
    movements: 0,
  })
  const beforeReplay = await counts()
  await assert.rejects(
    transaction(candidate.dataStatements),
    /REFERENCE_CONSUMED/,
  )
  assert.deepEqual(await counts(), beforeReplay)
  const old = (
    await client.query(
      'SELECT status,version,revision FROM management_scenarios WHERE id=1',
    )
  ).rows[0]
  assert.deepEqual(old, { status: 'archived', version: 1, revision: 2 })
  const revised = (
    await client.query(
      'SELECT status,version,revision,fixed_monthly_costs FROM management_scenarios WHERE supersedes_scenario_id=1',
    )
  ).rows[0]
  assert.deepEqual(revised, {
    status: 'draft',
    version: 2,
    revision: 1,
    fixed_monthly_costs: '2288.00',
  })
  assert.equal(
    Number(
      (
        await client.query(
          'SELECT sum(normalized_weight_bps) FROM management_scenario_mix WHERE scenario_id=(SELECT id FROM management_scenarios WHERE supersedes_scenario_id=1)',
        )
      ).rows[0].sum,
    ),
    10000,
  )
  console.log(
    'PASS: exact final schema/data package, semantic source guards, late rollback, preserved historical mix, normalized joint target, zero operational facts and blocked replay on PostgreSQL 17 clone.',
  )
} finally {
  await client.end()
}
