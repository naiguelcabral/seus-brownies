// Fixed synthetic loopback fixture only. Never reads dotenv or environment DSNs.
import assert from 'node:assert/strict'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { buildAuthBaselinePayload } from './auth-baseline-payload.mjs'
import {
  buildCandidate,
  sourceManifest,
} from './migration-chain-candidates.mjs'
import { authAuditEvents } from '../src/db/schema.ts'
import { createAuthAuditEvent } from '../src/features/auth/audit.ts'
import { executeAuditedPasswordReset } from '../src/features/auth/password-reset-audit.ts'

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
const identity = (
  await admin.query(
    "SELECT current_database() db, current_user role, current_setting('server_version_num') version",
  )
).rows[0]
assert.equal(identity.db, connection.database)
assert.equal(identity.role, connection.user)
assert.equal(Math.floor(Number(identity.version) / 10000), 17)
const before = sourceManifest()
const folders = []
const cases = []
const journal = async (client) =>
  (
    await client.query(
      'SELECT hash, created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at',
    )
  ).rows

async function fixture(name, verify) {
  const database = `cacau_auth_baseline_${Date.now()}_${cases.length}`
  assert.match(database, /^cacau_auth_baseline_[0-9_]+$/)
  await admin.query(`CREATE DATABASE "${database}"`)
  const client = new pg.Client({ ...connection, database })
  await client.connect()
  try {
    // Provider-owned marker proves migrations do not modify other schemas.
    await client.query('CREATE SCHEMA neon_auth')
    await client.query(
      'CREATE TABLE neon_auth.synthetic_marker (value text NOT NULL)',
    )
    await client.query(
      "INSERT INTO neon_auth.synthetic_marker VALUES ('preserve-provider')",
    )
    await verify(client)
    assert.deepEqual(
      (await client.query('SELECT value FROM neon_auth.synthetic_marker')).rows,
      [{ value: 'preserve-provider' }],
    )
    cases.push({ name, result: 'passed' })
    console.log(`PASS ${name}`)
  } finally {
    await client.end()
  }
}

try {
  await fixture(
    'mcp-payload-canonical-receipts-and-atomic-preconditions',
    async (client) => {
      const databaseName = (
        await client.query('SELECT current_database() AS name')
      ).rows[0].name
      const payload = buildAuthBaselinePayload({ databaseName })
      await client.query('BEGIN')
      for (const sql of payload.statements) await client.query(sql)
      await client.query('COMMIT')
      assert.deepEqual(
        await journal(client),
        payload.receipts.map((entry) => ({
          hash: entry.sha256,
          created_at: entry.when,
        })),
      )
      await client.query('BEGIN')
      try {
        await assert.rejects(async () => {
          for (const sql of payload.statements) await client.query(sql)
        }, /BASELINE_REQUIRES_UNINITIALIZED_APPLICATION_SCHEMA/)
      } finally {
        await client.query('ROLLBACK')
      }
      assert.deepEqual(
        await journal(client),
        payload.receipts.map((entry) => ({
          hash: entry.sha256,
          created_at: entry.when,
        })),
      )
    },
  )
  await fixture(
    'mcp-payload-late-failure-removes-application-and-journal',
    async (client) => {
      const databaseName = (
        await client.query('SELECT current_database() AS name')
      ).rows[0].name
      const payload = buildAuthBaselinePayload({ databaseName })
      await client.query('BEGIN')
      try {
        for (const sql of payload.statements) await client.query(sql)
        await assert.rejects(
          () => client.query('SELECT 1 / 0'),
          (error) => error.code === '22012',
        )
      } finally {
        await client.query('ROLLBACK')
      }
      assert.equal(
        (
          await client.query(
            "SELECT to_regclass('public.auth_audit_events') AS relation",
          )
        ).rows[0].relation,
        null,
      )
      assert.equal(
        (
          await client.query(
            "SELECT to_regclass('drizzle.__drizzle_migrations') AS relation",
          )
        ).rows[0].relation,
        null,
      )
    },
  )
  await fixture(
    'canonical-0000-through-0016-auth-reset-and-rerun',
    async (client) => {
      const candidate = buildCandidate('replacement', { last: 16 })
      folders.push(candidate.folder)
      assert.equal(candidate.entries.length, 17)
      assert.equal(candidate.entries.at(-1).tag, '0016_migrate-admin-to-owner')
      for (const entry of candidate.entries) {
        assert.equal(
          readFileSync(join(candidate.folder, `${entry.tag}.sql`), 'utf8'),
          readFileSync(
            new URL(`../drizzle/${entry.tag}.sql`, import.meta.url),
            'utf8',
          ),
        )
      }
      const db = drizzle(client)
      await migrate(db, { migrationsFolder: candidate.folder })
      const history = await journal(client)
      assert.deepEqual(
        history,
        candidate.manifest.candidate_migrations.map((item) => ({
          hash: item.sha256,
          created_at: item.when,
        })),
      )
      assert.deepEqual(
        (await client.query('SELECT role::text FROM public.app_user_access'))
          .rows,
        [],
      )
      const roles = (
        await client.query(
          "SELECT enumlabel FROM pg_enum WHERE enumtypid='public.app_access_role'::regtype ORDER BY enumsortorder",
        )
      ).rows.map((row) => row.enumlabel)
      assert.ok(roles.includes('owner') && roles.includes('employee'))
      let providerCalls = 0
      const result = await executeAuditedPasswordReset({
        action: 'password_reset_requested',
        requestId: 'synthetic-baseline-reset',
        writer: {
          append: async (event) => {
            await db.insert(authAuditEvents).values(createAuthAuditEvent(event))
          },
        },
        execute: async () => {
          providerCalls++
          return { ok: true }
        },
        getOutcome: (value) => (value.ok ? 'success' : 'failure'),
      })
      assert.equal(providerCalls, 1)
      assert.equal(result.auditComplete, true)
      assert.deepEqual(
        (
          await client.query(
            'SELECT outcome::text FROM public.auth_audit_events ORDER BY id',
          )
        ).rows,
        [{ outcome: 'blocked' }, { outcome: 'success' }],
      )
      await client.query(
        "INSERT INTO public.auth_login_attempts (identity_hash) VALUES ('synthetic-identity')",
      )
      assert.equal(
        (
          await client.query(
            'SELECT consecutive_failures FROM public.auth_login_attempts',
          )
        ).rows[0].consecutive_failures,
        0,
      )
      await migrate(db, { migrationsFolder: candidate.folder })
      assert.deepEqual(await journal(client), history)
      assert.equal(
        (await client.query('SELECT count(*)::int n FROM public.products'))
          .rows[0].n,
        0,
      )
    },
  )
  await fixture(
    'late-failure-rolls-back-application-schema-and-receipts',
    async (client) => {
      const candidate = buildCandidate('replacement', {
        last: 16,
        injectFailure: true,
      })
      folders.push(candidate.folder)
      await assert.rejects(
        () => migrate(drizzle(client), { migrationsFolder: candidate.folder }),
        (error) => {
          let cause = error
          while (cause && !cause.code) cause = cause.cause
          return cause?.code === '22012'
        },
      )
      assert.equal(
        (
          await client.query(
            "SELECT to_regclass('public.auth_audit_events') AS relation",
          )
        ).rows[0].relation,
        null,
      )
      assert.deepEqual(await journal(client), [])
      // Drizzle creates an empty journal outside the application transaction.
      // Its presence after failure must not be mistaken for applied migrations.
    },
  )
  assert.deepEqual(sourceManifest(), before)
  writeFileSync(
    '/tmp/cacau-auth-baseline-evidence.json',
    JSON.stringify(
      {
        scope: 'synthetic-disposable-postgres17',
        application_authorized: false,
        active_chain_modified: false,
        checkpoint: '0016',
        cases,
        source: before,
      },
      null,
      2,
    ) + '\n',
  )
} finally {
  for (const folder of folders) rmSync(folder, { recursive: true, force: true })
  await admin.end()
}
