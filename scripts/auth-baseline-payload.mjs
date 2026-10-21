// Offline compiler of the reviewed canonical SQL. No connection or environment reads.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export function buildAuthBaselinePayload({ databaseName = 'neondb' } = {}) {
  assert.match(databaseName, /^[a-z][a-z0-9_]{0,62}$/)
  const root = new URL('../', import.meta.url)
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        'docs/governance/evidence/auth-baseline-0016-2026-10-17.json',
        root,
      ),
      'utf8',
    ),
  )
  const journal = JSON.parse(
    readFileSync(new URL('drizzle/meta/_journal.json', root), 'utf8'),
  )
  const entries = journal.entries.filter((entry) => entry.idx <= 16)
  assert.equal(entries.length, 17)
  const receipts = entries.map((entry) => {
    assert.match(entry.tag, /^\d{4}_[a-z0-9_-]+$/)
    const source = readFileSync(
      new URL(`drizzle/${entry.tag}.sql`, root),
      'utf8',
    )
    const digest = createHash('sha256').update(source).digest('hex')
    return {
      idx: entry.idx,
      tag: entry.tag,
      when: String(entry.when),
      sha256: digest,
      source,
    }
  })
  assert.deepEqual(
    receipts.map(({ source: _source, ...receipt }) => receipt),
    manifest.migrations,
  )
  const statements = [
    "SET LOCAL statement_timeout = '60s'",
    "SET LOCAL lock_timeout = '5s'",
    'SET LOCAL search_path TO public',
    'SELECT pg_catalog.pg_advisory_xact_lock(169231016)',
    `DO $$ BEGIN
      IF current_database() <> '${databaseName}' OR current_setting('transaction_read_only') <> 'off' THEN
        RAISE EXCEPTION 'BASELINE_TARGET_OR_TRANSACTION_MISMATCH';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','drizzle') AND c.relkind IN ('r','p','v','m','S','f'))
        OR EXISTS (SELECT 1 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
          WHERE n.nspname='public' AND t.typtype='e') THEN
        RAISE EXCEPTION 'BASELINE_REQUIRES_UNINITIALIZED_APPLICATION_SCHEMA';
      END IF;
    END $$`,
    'CREATE SCHEMA IF NOT EXISTS "drizzle"',
    'CREATE TABLE "drizzle"."__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)',
  ]
  for (const migration of receipts) {
    // Same separator and source hashes as Drizzle's installed migrator.
    statements.push(...migration.source.split('--> statement-breakpoint'))
    assert.match(migration.sha256, /^[a-f0-9]{64}$/)
    assert.match(migration.when, /^\d+$/)
    statements.push(
      `INSERT INTO "drizzle"."__drizzle_migrations" ("hash","created_at") VALUES ('${migration.sha256}',${migration.when})`,
    )
  }
  return { checkpoint: '0016', receipts: manifest.migrations, statements }
}
