// Fixed synthetic loopback fixture; no environment files or shared database access.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pg from 'pg'

assert.deepEqual(process.argv.slice(2), ['--ack-disposable-postgres17'])
const client = new pg.Client({
  host: '127.0.0.1',
  port: 5438,
  user: 'technical_catalog_fixture',
  password: 'synthetic-catalog-only',
  database: 'neondb',
})
const labels = async () =>
  (
    await client.query(`SELECT enumlabel FROM pg_enum e JOIN pg_type t
    ON t.oid=e.enumtypid WHERE t.typname='production_profile_component_role'
    ORDER BY enumsortorder`)
  ).rows.map((row) => row.enumlabel)
try {
  await client.connect()
  const identity = (
    await client.query(`SELECT current_user AS actor,
    current_database() AS db, current_setting('server_version_num')::int AS version`)
  ).rows[0]
  assert.equal(identity.actor, 'technical_catalog_fixture')
  assert.equal(identity.db, 'neondb')
  assert.ok(identity.version >= 170000 && identity.version < 180000)
  const before = await labels()
  assert.deepEqual(before, ['filling'])
  await client.query('BEGIN')
  try {
    await client.query(
      readFileSync(
        new URL(
          '../drizzle/pending-profile-materials/0031_brave_thor.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    )
    assert.deepEqual(await labels(), ['filling', 'coating', 'packaging'])
  } finally {
    await client.query('ROLLBACK')
  }
  assert.deepEqual(await labels(), before)
  console.log(
    'PASS: exact additive migration accepts material roles and rolls back without changing the fixture.',
  )
} finally {
  await client.end()
}
