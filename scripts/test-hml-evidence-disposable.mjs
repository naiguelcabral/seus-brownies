// Only the dedicated PostgreSQL 17 GitHub Actions service. No configurable DSN.
import assert from 'node:assert/strict'
import pg from 'pg'
import { createHash } from 'node:crypto'
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
let adminConnected = false
try {
  await admin.connect()
  adminConnected = true
  const v = (await admin.query('SHOW server_version_num')).rows[0]
    .server_version_num
  assert.ok(Number(v) >= 170000 && Number(v) < 180000)
  // DDL and grants only in the loopback service created by this workflow.
  await admin.query(`CREATE SCHEMA drizzle;
    CREATE TABLE drizzle.__drizzle_migrations(id serial PRIMARY KEY,hash text NOT NULL,created_at bigint);
    CREATE TABLE public.sales(id integer);
    CREATE TABLE public.management_scenario_mix(id integer);
    CREATE SEQUENCE public.fixture_mutable_sequence;
    INSERT INTO public.sales VALUES(1);
    INSERT INTO public.management_scenario_mix VALUES(1);`)
  await admin.query(
    readFileSync(
      new URL('./hml-readonly-audit-role.lab.sql', import.meta.url),
      'utf8',
    ).replaceAll(
      '@@VALID_UNTIL_UTC@@',
      new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    ),
  )
  await admin.query(
    "ALTER ROLE fixture_audit PASSWORD 'synthetic-fixture-password'",
  )
  const role = (
    await admin.query(`SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication,
      rolbypassrls, rolinherit, rolvaliduntil > clock_timestamp() AS unexpired
      FROM pg_roles WHERE rolname = 'fixture_audit'`)
  ).rows[0]
  assert.deepEqual(role, {
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolreplication: false,
    rolbypassrls: false,
    rolinherit: false,
    unexpired: true,
  })
  assert.equal(
    (
      await admin.query(`SELECT count(*)::int AS count FROM pg_auth_members m
      JOIN pg_roles r ON r.oid=m.member WHERE r.rolname='fixture_audit'`)
    ).rows[0].count,
    0,
  )
  for (const row of historicalManifest().slice(0, 17))
    await admin.query(
      'INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES($1,$2)',
      [row.hash, row.created_at],
    )
  reader = new pg.Client({ ...options, user: 'fixture_audit' })
  // PUBLIC mutators must not make an otherwise restricted role writable.
  // This fixture configuration is confined to the disposable local service.
  const mutators = (
    await admin.query(`SELECT p.oid::regprocedure::text AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='pg_catalog' AND p.proname IN
    ('lo_create','lo_from_bytea','lo_import','lo_export','lo_unlink','lo_put','lowrite','lo_truncate','lo_truncate64')`)
  ).rows
  for (const row of mutators)
    await admin.query(`REVOKE EXECUTE ON FUNCTION ${row.signature} FROM PUBLIC`)
  await reader.connect()
  const accessSql = readFileSync(
    new URL('./hml-evidence-access.sql', import.meta.url),
    'utf8',
  )
  const catalogSql = readFileSync(
    new URL('./hml-evidence-catalog.sql', import.meta.url),
    'utf8',
  )
  // Synthetic hashed row with the versioned map's shape; never a real host.
  const sha256 = (value) => createHash('sha256').update(value).digest('hex')
  const syntheticEndpoint = 'ep-synthetic-hml-cccc0003'
  const syntheticHost = `${syntheticEndpoint}.sa-east-1.aws.neon.tech`
  const matrix = [
    {
      project: 'synthetic-project-00000001',
      branch: 'br-synthetic-hml-cccc0003',
      name: 'development',
      database: 'neondb',
      endpoint_sha256: sha256(syntheticEndpoint),
      host_sha256: sha256(syntheticHost),
      destination_fingerprint: sha256(`${syntheticHost}:5432/neondb`),
      classification: 'candidate-hml',
    },
  ]
  const db = { ...matrix[0], endpoint: syntheticEndpoint }
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
      `postgresql://synthetic:password@${syntheticHost}/neondb`,
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
  const evidence = await verifyEvidence(
    reader,
    { ...target, referenceCatalogDigest: digest(catalog) },
    matrix,
  )
  assert.equal(evidence.counts.sales, '1')
  assert.equal(evidence.counts.management_scenario_mix, '1')
  assert.equal(evidence.drift, false)
  assert.equal(evidence.application_authorized, false)
  await reader.query('BEGIN READ WRITE')
  await assert.rejects(
    reader.query('CREATE TABLE public.fixture_forbidden(id integer)'),
    (e) => e.code === '42501',
  )
  await reader.query('ROLLBACK')
  await reader.query('BEGIN READ WRITE')
  await assert.rejects(
    reader.query("SELECT nextval('public.fixture_mutable_sequence')"),
    (e) => e.code === '42501',
  )
  await reader.query('ROLLBACK')
  await admin.query('CREATE TABLE public.fixture_default_privilege(id integer)')
  await reader.query('BEGIN READ WRITE')
  await assert.rejects(
    reader.query('SELECT * FROM public.fixture_default_privilege'),
    (e) => e.code === '42501',
  )
  await reader.query('ROLLBACK')
  await admin.query(
    'GRANT EXECUTE ON FUNCTION pg_catalog.lo_create(oid) TO fixture_audit',
  )
  await assert.rejects(
    verifyEvidence(
      reader,
      { ...target, referenceCatalogDigest: digest(catalog) },
      matrix,
    ),
    /BLOCKED_READONLY_AUDIT/,
  )
  await admin.query(
    'REVOKE EXECUTE ON FUNCTION pg_catalog.lo_create(oid) FROM fixture_audit',
  )
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
    verifyEvidence(
      reader,
      { ...target, referenceCatalogDigest: digest(catalog) },
      matrix,
    ),
    /BLOCKED_READONLY_AUDIT/,
  )
  await admin.query(
    'REVOKE UPDATE(id) ON public.sales FROM fixture_audit; ALTER TABLE public.sales ADD COLUMN synthetic_drift integer',
  )
  assert.equal(
    (
      await verifyEvidence(
        reader,
        { ...target, referenceCatalogDigest: digest(catalog) },
        matrix,
      )
    ).drift,
    true,
  )
  await admin.query(
    'CREATE ROLE fixture_owner NOLOGIN; GRANT fixture_owner TO fixture_audit WITH INHERIT FALSE, SET TRUE',
  )
  await assert.rejects(
    verifyEvidence(
      reader,
      { ...target, referenceCatalogDigest: digest(catalog) },
      matrix,
    ),
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
  if (adminConnected) {
    await admin
      .query('REVOKE fixture_owner FROM fixture_audit')
      .catch(() => undefined)
    await admin
      .query(
        readFileSync(
          new URL('./hml-readonly-audit-role-revoke.lab.sql', import.meta.url),
          'utf8',
        ),
      )
      .catch(() => undefined)
  }
  await admin.end()
}
