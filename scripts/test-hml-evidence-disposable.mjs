// Only the dedicated PostgreSQL 17 GitHub Actions service. No configurable DSN.
import assert from 'node:assert/strict'
import pg from 'pg'
import { readFileSync } from 'node:fs'
import {
  verifyEvidence,
  digest,
  historicalManifest,
  accessIsSafe,
} from './hml-evidence-verifier.mjs'
import { sanitizeDestination } from './hml-worker-destination.mjs'

if (
  process.argv.slice(2).join(' ') !== '--ack-disposable-postgres17' ||
  process.env.GITHUB_ACTIONS !== 'true'
)
  throw new Error('DISPOSABLE_CI_REQUIRED')
const options = {
  host: '127.0.0.1',
  port: 5434,
  database: 'neondb',
  user: 'fixture_admin',
  password: 'synthetic-fixture-password',
}
const admin = new pg.Client(options)
let reader
try {
  await admin.connect()
  const v = (await admin.query('SHOW server_version_num')).rows[0]
    .server_version_num
  assert.ok(Number(v) >= 170000 && Number(v) < 180000)
  // DDL and grants only in the loopback service created by this workflow.
  await admin.query(`CREATE ROLE fixture_audit LOGIN PASSWORD 'synthetic-fixture-password';
    ALTER ROLE fixture_audit SET default_transaction_read_only=on;
    REVOKE TEMP ON DATABASE neondb FROM PUBLIC;
    CREATE SCHEMA drizzle;
    CREATE TABLE drizzle.__drizzle_migrations(id serial PRIMARY KEY,hash text NOT NULL,created_at bigint);
    CREATE TABLE public.sales(id integer);
    CREATE TABLE public.management_scenario_mix(id integer);
    INSERT INTO public.sales VALUES(1);
    INSERT INTO public.management_scenario_mix VALUES(1);
    GRANT USAGE ON SCHEMA drizzle,public TO fixture_audit;
    GRANT SELECT ON ALL TABLES IN SCHEMA drizzle,public TO fixture_audit;`)
  for (const row of historicalManifest().slice(0, 17))
    await admin.query(
      'INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES($1,$2)',
      [row.hash, row.created_at],
    )
  reader = new pg.Client({ ...options, user: 'fixture_audit' })
  await reader.connect()
  const accessSql = readFileSync(
    new URL('./hml-evidence-access.sql', import.meta.url),
    'utf8',
  )
  const catalogSql = readFileSync(
    new URL('./hml-evidence-catalog.sql', import.meta.url),
    'utf8',
  )
  const matrix = JSON.parse(
    readFileSync(
      new URL(
        '../docs/governance/evidence/hml-evidence-targets.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ).databases
  const db = matrix[1]
  const target = {
    ...db,
    environment: 'hml',
    classification: 'confirmed-hml',
    operatorApproved: true,
    connectionBoundByOperator: true,
    capabilityReviewApproved: true,
    approvedRole: 'fixture_audit',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    destinationFingerprint: sanitizeDestination(
      `postgresql://synthetic:password@${db.host}/neondb`,
      matrix,
    ).fingerprint,
  }
  await reader.query('BEGIN READ ONLY')
  await reader.query('SET LOCAL search_path TO pg_catalog')
  assert.equal(
    accessIsSafe((await reader.query(accessSql)).rows[0], target),
    true,
  )
  const catalog = (await reader.query(catalogSql)).rows[0].catalog
  await reader.query('ROLLBACK')
  const evidence = await verifyEvidence(reader, {
    ...target,
    referenceCatalogDigest: digest(catalog),
  })
  assert.equal(evidence.counts.sales, '1')
  assert.equal(evidence.counts.management_scenario_mix, '1')
  assert.equal(evidence.drift, false)
  assert.equal(evidence.application_authorized, false)
  // Runtime read-only and ACL refusal tested independently, never externally.
  await reader.query('BEGIN READ ONLY')
  await assert.rejects(
    reader.query('UPDATE public.sales SET id=id WHERE false'),
    (e) => e.code === '25006',
  )
  await reader.query('ROLLBACK')
  await reader.query('BEGIN READ WRITE')
  await assert.rejects(
    reader.query('UPDATE public.sales SET id=id WHERE false'),
    (e) => e.code === '42501',
  )
  await reader.query('ROLLBACK')
  await admin.query('GRANT UPDATE(id) ON public.sales TO fixture_audit')
  await assert.rejects(
    verifyEvidence(reader, {
      ...target,
      referenceCatalogDigest: digest(catalog),
    }),
    /BLOCKED_READONLY_AUDIT/,
  )
  await admin.query(
    'REVOKE UPDATE(id) ON public.sales FROM fixture_audit; ALTER TABLE public.sales ADD COLUMN synthetic_drift integer',
  )
  assert.equal(
    (
      await verifyEvidence(reader, {
        ...target,
        referenceCatalogDigest: digest(catalog),
      })
    ).drift,
    true,
  )
  await admin.query(
    'CREATE ROLE fixture_owner NOLOGIN; GRANT fixture_owner TO fixture_audit WITH INHERIT FALSE, SET TRUE',
  )
  await assert.rejects(
    verifyEvidence(reader, {
      ...target,
      referenceCatalogDigest: digest(catalog),
    }),
    /BLOCKED_READONLY_AUDIT/,
  )
  console.log(
    'PostgreSQL 17 disposable: catalog, aggregate counts, ACL, column grant, SET ROLE, read-only refusal and drift passed; external audit prohibited.',
  )
} catch (error) {
  const code = /^[A-Z0-9]{5}$/.test(error.code ?? '') ? error.code : 'REDACTED'
  process.stderr.write(`DISPOSABLE_TEST_FAILED ${code}\n`)
  process.exitCode = 1
} finally {
  await reader?.end()
  await admin.end()
}
