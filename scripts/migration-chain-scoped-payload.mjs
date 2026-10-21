// Offline review compiler. Never connects or modifies the active migration chain.
import assert from 'node:assert/strict'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { buildCandidate, hash } from './migration-chain-candidates.mjs'

function verifyHistory(receipts, errorCode) {
  const values = receipts
    .map((r) => `('${r.sha256}',${r.when}::bigint)`)
    .join(',')
  return `DO $$ BEGIN
    IF (SELECT count(*) FROM drizzle.__drizzle_migrations) <> ${receipts.length}
      OR EXISTS (
        SELECT 1 FROM (VALUES ${values}) expected(hash, created_at)
        FULL JOIN drizzle.__drizzle_migrations actual USING (created_at)
        WHERE expected.hash IS DISTINCT FROM actual.hash
      ) THEN RAISE EXCEPTION '${errorCode}'; END IF;
  END $$`
}

export function buildScopedUpgradePayload({ databaseName = 'neondb' } = {}) {
  assert.match(databaseName, /^[a-z][a-z0-9_]{0,62}$/)
  const candidate = buildCandidate('compatibility', { last: 28 })
  try {
    const receipts = candidate.manifest.candidate_migrations
    for (const r of receipts) {
      assert.match(r.sha256, /^[a-f0-9]{64}$/)
      assert.match(r.when, /^\d+$/)
    }
    const statements = [
      "SET LOCAL statement_timeout = '60s'",
      "SET LOCAL lock_timeout = '5s'",
      'SET LOCAL search_path TO public',
      'SELECT pg_catalog.pg_advisory_xact_lock(169231028)',
      `DO $$ BEGIN
        IF current_database() <> '${databaseName}' OR current_setting('transaction_read_only') <> 'off'
        THEN RAISE EXCEPTION 'SCOPED_UPGRADE_TARGET_MISMATCH'; END IF;
      END $$`,
      'LOCK TABLE public.expenses, public.products, public.purchases, public.sales IN SHARE ROW EXCLUSIVE MODE',
      verifyHistory(
        receipts.slice(0, 17),
        'SCOPED_UPGRADE_REQUIRES_EXACT_0016',
      ),
      `DO $$ BEGIN
        IF to_regclass('public.operational_audit_events') IS NOT NULL
          OR to_regclass('public.management_settings') IS NOT NULL
          OR to_regclass('public.management_scenario_mix') IS NOT NULL
          OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
            AND ((table_name IN ('expenses','purchases','sales') AND column_name='idempotency_key')
              OR (table_name='products' AND column_name='unit')))
        THEN RAISE EXCEPTION 'SCOPED_UPGRADE_PARTIAL_APPLICATION'; END IF;
      END $$`,
    ]
    for (const receipt of receipts.slice(17)) {
      const source = readFileSync(
        join(candidate.folder, `${receipt.tag}.sql`),
        'utf8',
      )
      assert.equal(hash(source), receipt.sha256)
      statements.push(...source.split('--> statement-breakpoint'))
      statements.push(
        `INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ('${receipt.sha256}',${receipt.when})`,
      )
    }
    statements.push(
      verifyHistory(receipts, 'SCOPED_UPGRADE_FINAL_HISTORY_MISMATCH'),
    )
    statements.push(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
        AND table_name='sales' AND column_name='delivered_at')
        OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
          AND table_name='products' AND column_name='measurement_unit')
        OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
          AND table_name='products' AND column_name='unit')
        OR position('NEW."unit"' IN pg_get_functiondef('public.prevent_used_product_structure_change()'::regprocedure)) > 0
      THEN RAISE EXCEPTION 'SCOPED_UPGRADE_FINAL_SCHEMA_MISMATCH'; END IF;
    END $$`)
    return {
      manifest: {
        ...candidate.manifest,
        scope: 'review-only-target-through-0016',
        strategy: 'transactional-compatibility-bridge',
        database_name: databaseName,
        expected_before_receipts: 17,
        expected_after_receipts: receipts.length,
        decisions: {
          financial_0019: 'requires-explicit-approval',
          scenario_0028: 'requires-empty-new-mix',
        },
        sql_sha256: hash(JSON.stringify(statements)),
      },
      statements,
    }
  } finally {
    rmSync(candidate.folder, { recursive: true, force: true })
  }
}
