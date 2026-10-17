// Synthetic loopback fixture only. No environment DSNs or external SQL.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { buildAuthBaselinePayload } from './auth-baseline-payload.mjs'

assert.deepEqual(process.argv.slice(2), ['--ack-disposable-postgres17'])
const connection = {
  host: '127.0.0.1',
  port: 5433,
  user: 'cacau_chain_test',
  password: 'synthetic-ci-only',
  database: 'cacau_chain_disposable',
}
const sql = readFileSync(
  new URL(
    '../docs/governance/SQL-ACCESS-RECONCILIATION-2026-10-17.sql',
    import.meta.url,
  ),
  'utf8',
)
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
const parameters = {
  ownerUserId: '00000000-0000-4000-8000-000000000001',
  managerUserId: '00000000-0000-4000-8000-000000000002',
  requestId:
    'access-reconciliation:20261017:00000000-0000-4000-8000-000000000003',
}
const cases = []
async function fixture(name, verify) {
  const database = `cacau_access_reconcile_${Date.now()}_${cases.length}`
  assert.match(database, /^cacau_access_reconcile_[0-9_]+$/)
  await admin.query(`CREATE DATABASE "${database}"`)
  const client = new pg.Client({ ...connection, database })
  await client.connect()
  try {
    await client.query('CREATE SCHEMA neon_auth')
    await client.query('CREATE TABLE neon_auth.synthetic_marker (value text)')
    await client.query(
      "INSERT INTO neon_auth.synthetic_marker VALUES ('preserve')",
    )
    await client.query('BEGIN')
    const baseline = buildAuthBaselinePayload({ databaseName: database })
    for (const statement of baseline.statements) await client.query(statement)
    await client.query('COMMIT')
    const journal = (
      await client.query(
        'SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id',
      )
    ).rows
    const apply = async (overrides = {}) => {
      await client.query('BEGIN')
      try {
        await client.query(
          "SELECT set_config('cacau.access_reconciliation', $1, true)",
          [
            JSON.stringify({
              ...parameters,
              databaseName: database,
              ...overrides,
            }),
          ],
        )
        await client.query(sql)
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
    const counts = async () =>
      (
        await client.query(
          'SELECT (SELECT count(*)::int FROM app_user_access) links, (SELECT count(*)::int FROM auth_audit_events) audits',
        )
      ).rows[0]
    await verify({ client, apply, counts })
    assert.deepEqual(
      (
        await client.query(
          'SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id',
        )
      ).rows,
      journal,
    )
    assert.deepEqual(
      (await client.query('SELECT value FROM neon_auth.synthetic_marker')).rows,
      [{ value: 'preserve' }],
    )
    cases.push(name)
    console.log(`PASS ${name}`)
  } finally {
    await client.end()
  }
}
try {
  await fixture(
    'two roles, two audits and consumed reference rejected',
    async ({ client, apply, counts }) => {
      await apply()
      assert.deepEqual(await counts(), { links: 2, audits: 2 })
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
      await assert.rejects(apply, /REFERENCE_CONSUMED/)
      assert.deepEqual(await counts(), { links: 2, audits: 2 })
    },
  )
  await fixture(
    'late audit failure rolls back every grant',
    async ({ client, apply, counts }) => {
      await client.query(
        `ALTER TABLE auth_audit_events ADD CONSTRAINT synthetic_failure CHECK (target_id <> '${parameters.managerUserId}')`,
      )
      await assert.rejects(apply, /synthetic_failure/)
      assert.deepEqual(await counts(), { links: 0, audits: 0 })
    },
  )
  await fixture(
    'existing allowlist preserved',
    async ({ client, apply, counts }) => {
      await client.query(
        "INSERT INTO app_user_access(auth_user_id,role) VALUES ('synthetic-viewer','viewer')",
      )
      await assert.rejects(apply, /REQUIRES_EMPTY_ALLOWLIST/)
      assert.deepEqual(await counts(), { links: 1, audits: 0 })
      assert.equal(
        (await client.query('SELECT role FROM app_user_access')).rows[0].role,
        'viewer',
      )
    },
  )
  await fixture(
    'wrong target and duplicate identity fail before writes',
    async ({ apply, counts }) => {
      await assert.rejects(
        () => apply({ databaseName: 'wrong_target' }),
        /TARGET_MISMATCH/,
      )
      await assert.rejects(
        () => apply({ managerUserId: parameters.ownerUserId }),
        /INVALID_PARAMETERS/,
      )
      assert.deepEqual(await counts(), { links: 0, audits: 0 })
    },
  )
  console.log(`${cases.length} disposable cases passed`)
} finally {
  await admin.end()
}
