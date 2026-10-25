import { requireDefined } from '../src/lib/required-value'
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { createHash } from 'node:crypto'

const destinationModule = '../scripts/hml-worker-destination.mjs'
const { sanitizeDestination, hiddenInput, SANITIZER_VERSION } = await import(
  destinationModule
)
const verifierModule = '../scripts/hml-evidence-verifier.mjs'
const {
  verifyEvidence,
  digest,
  historicalManifest,
  compareHistory,
  accessIsSafe,
} = await import(verifierModule)
const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex')
// Same shape as the versioned map, which stores only hashes of real hosts.
function syntheticTarget(row: {
  project: string
  branch: string
  name: string
  endpoint: string
  classification: string
}) {
  const host = `${row.endpoint}.sa-east-1.aws.neon.tech`
  return {
    plain: { ...row, host, database: 'neondb' },
    row: {
      project: row.project,
      branch: row.branch,
      name: row.name,
      database: 'neondb',
      endpoint_sha256: sha256(row.endpoint),
      host_sha256: sha256(host),
      destination_fingerprint: sha256(`${host}:5432/neondb`),
      classification: row.classification,
    },
  }
}
const production = syntheticTarget({
  project: 'synthetic-project-00000001',
  branch: 'br-synthetic-main-aaaa0001',
  name: 'production',
  endpoint: 'ep-synthetic-main-aaaa0001',
  classification: 'production-do-not-access',
})
const candidate = syntheticTarget({
  project: 'synthetic-project-00000001',
  branch: 'br-synthetic-hml-bbbb0002',
  name: 'development',
  endpoint: 'ep-synthetic-hml-bbbb0002',
  classification: 'candidate-hml',
})
const matrix = [production.row, candidate.row]
const db = { ...candidate.row, endpoint: candidate.plain.endpoint }
const dbHost = candidate.plain.host
const url = `postgresql://synthetic-user:synthetic-password@${dbHost}/neondb?sslmode=require&token=synthetic-token`
const catalog: {
  relations: Array<Array<string | boolean>>
  columns: Array<unknown>
} = {
  relations: [['drizzle', '__drizzle_migrations', 'r', 'p', false, false]],
  columns: [],
}
const target = () => ({
  ...db,
  environment: 'hml',
  classification: 'confirmed-hml',
  operatorApproved: true,
  capabilityReviewApproved: true,
  connectionBoundByOperator: true,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  approvedRole: 'fixture_audit',
  destinationFingerprint: sanitizeDestination(url, matrix).fingerprint,
  referenceCatalogDigest: digest(catalog),
})
const access = () => ({
  database: 'neondb',
  role: 'fixture_audit',
  session_role: 'fixture_audit',
  server_version_num: 170000,
  server_address: '127.0.0.1',
  server_port: 5432,
  transaction_read_only: 'on',
  default_read_only: 'on',
  database_create: false,
  database_temp: false,
  temporary_schema: false,
  ...Object.fromEntries(
    [
      'privileged',
      'memberships',
      'schema_create',
      'table_write',
      'column_write',
      'sequence_write',
      'ownership',
      'executable_custom_functions',
      'foreign_access',
      'largeobject_write',
      'grant_options',
      'parameter_write',
      'tablespace_create',
    ].map((k) => [k, 0]),
  ),
})
function fake(
  row = access(),
  cat = catalog,
  history = historicalManifest().slice(0, 17),
) {
  const calls: string[] = []
  return {
    calls,
    query: async (q: string) => {
      calls.push(q)
      if (q === 'SHOW transaction_read_only')
        return { rows: [{ transaction_read_only: row.transaction_read_only }] }
      if (q.includes('WITH me AS')) return { rows: [row] }
      if (q.includes('jsonb_build_object')) return { rows: [{ catalog: cat }] }
      if (q.startsWith('SELECT hash,')) return { rows: history }
      return { rows: [] }
    },
  }
}
test('destination discards credentials and parameters and matches metadata only', () => {
  const observedAtUtc = '2026-10-16T00:00:00.000Z'
  const a = sanitizeDestination(url, matrix, observedAtUtc)
  const b = sanitizeDestination(
    `postgres://different:another@${dbHost.replace('.', '-pooler.')}:5432/neondb`,
    matrix,
    observedAtUtc,
  )
  assert.deepEqual(a, b)
  assert.equal(a.branch, db.branch)
  assert.equal(a.sanitizer_version, SANITIZER_VERSION)
  assert.equal(a.observed_at_utc, observedAtUtc)
  const out = JSON.stringify(a)
  for (const secret of [
    'synthetic-user',
    'synthetic-password',
    'synthetic-token',
    'sslmode',
    'token',
    '@',
  ])
    assert.ok(!out.includes(secret))
})
test('destination refuses unsafe protocols, production, ambiguous or leaking fields', () => {
  for (const bad of [
    'http://example.com',
    'postgresql://a:b@localhost/neondb',
    url + '#fragment',
    url.replace('/neondb', '/neondb/extra'),
    url.replace('synthetic-password', 'neondb'),
    `postgresql://x:y@${production.plain.host}/neondb`,
  ])
    assert.throws(
      () => sanitizeDestination(bad, matrix),
      /^Error: BLOCKED_DESTINATION$/,
    )
  assert.equal(sanitizeDestination(url, [db, db]).match, 'unmatched')
  assert.throws(
    () => sanitizeDestination(url, matrix, 'not-an-utc-timestamp'),
    /^Error: BLOCKED_DESTINATION$/,
  )
})
test('CLI rejects URL arguments without echo and secure input requires TTY', async () => {
  const r = spawnSync(
    process.execPath,
    ['scripts/hml-worker-destination.mjs', url],
    { encoding: 'utf8' },
  )
  assert.equal(r.status, 1)
  assert.equal(r.stdout, '')
  assert.equal(r.stderr, 'BLOCKED_DESTINATION\n')
  await assert.rejects(hiddenInput({ isTTY: false }), /BLOCKED_SECURE_INPUT/)
})
test('every writable capability, absent field and identity mismatch fails closed', () => {
  assert.equal(accessIsSafe(access(), target()), true)
  for (const key of Object.keys(access())) {
    const row = access()
    delete row[key as keyof typeof row]
    assert.equal(accessIsSafe(row, target()), false, key)
  }
  for (const key of [
    'privileged',
    'memberships',
    'schema_create',
    'table_write',
    'column_write',
    'sequence_write',
    'ownership',
    'executable_custom_functions',
    'foreign_access',
    'largeobject_write',
    'grant_options',
    'parameter_write',
    'tablespace_create',
  ])
    assert.equal(accessIsSafe({ ...access(), [key]: 1 }, target()), false)
  assert.equal(
    accessIsSafe(
      { ...access(), role: 'neondb_owner', session_role: 'neondb_owner' },
      { ...target(), approvedRole: 'neondb_owner' },
    ),
    false,
  )
})
test('unapproved, expired, wrong fingerprint and known production abort before SQL', async () => {
  for (const change of [
    { operatorApproved: false },
    { capabilityReviewApproved: false },
    { classification: 'candidate-hml' },
    { expiresAt: '2000-01-01T00:00:00Z' },
    { destinationFingerprint: 'a'.repeat(64) },
    { approvedRole: 'neondb_owner' },
    {
      ...production.row,
      endpoint: production.plain.endpoint,
      classification: 'confirmed-hml',
    },
    { name: 'production' },
  ]) {
    const c = fake()
    await assert.rejects(
      verifyEvidence(c, { ...target(), ...change }, matrix),
      /BLOCKED_TARGET/,
    )
    assert.equal(c.calls.length, 0)
  }
})
test('access failure never inspects catalog or history, rollback always runs', async () => {
  for (const change of [
    { transaction_read_only: 'off' },
    { ownership: 1 },
    { table_write: 1 },
    { session_role: 'owner' },
  ]) {
    const c = fake({ ...access(), ...change })
    await assert.rejects(
      verifyEvidence(c, target(), matrix),
      /BLOCKED_READONLY_AUDIT/,
    )
    assert.ok(
      !c.calls.some(
        (q) => q.includes('jsonb_build_object') || q.startsWith('SELECT hash,'),
      ),
    )
    assert.equal(c.calls.at(-1), 'ROLLBACK')
  }
})
test('collector emits only digests and aggregates, never grants application approval', async () => {
  const c = fake()
  const evidence = await verifyEvidence(c, target(), matrix)
  assert.equal(evidence.history_state, 'verified-through-0016')
  assert.equal(evidence.drift, false)
  assert.equal(evidence.application_authorized, false)
  assert.equal(evidence.repair_authorized, false)
  assert.equal(evidence.partial_application, 'operator-review-required')
  assert.ok(!JSON.stringify(evidence).includes('fixture_audit'))
  assert.equal(c.calls[0], 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  assert.equal(c.calls.at(-1), 'ROLLBACK')
})
test('missing journal, altered hash, duplicate, later migration and drift remain blocked', async () => {
  const base = historicalManifest().slice(0, 17)
  assert.equal(compareHistory([]), 'empty-history-not-proof')
  assert.equal(compareHistory(null), 'unverified')
  for (const history of [
    base.slice(1),
    [...base, base[16]],
    [
      ...base.slice(0, 16),
      { ...requireDefined(base[16]), hash: 'a'.repeat(64) },
    ],
    historicalManifest(),
  ])
    assert.equal(compareHistory(history), 'divergent-or-0017plus')
  const result = await verifyEvidence(
    fake(access(), { ...catalog, columns: ['synthetic-drift'] }),
    target(),
    matrix,
  )
  assert.equal(result.state, 'blocked')
  assert.equal(result.drift, true)
})
test('views, foreign tables, temporary tables and RLS never get business reads', async () => {
  for (const rel of [
    ['public', 'sales', 'v', 'p', false, false],
    ['public', 'sales', 'f', 'p', false, false],
    ['public', 'sales', 'r', 't', false, false],
    ['public', 'sales', 'r', 'p', true, false],
  ]) {
    const c = fake(access(), {
      ...catalog,
      relations: [...catalog.relations, rel],
    })
    await assert.rejects(
      verifyEvidence(c, target(), matrix),
      /BLOCKED_READONLY_AUDIT/,
    )
    assert.ok(!c.calls.some((q) => q.startsWith('SELECT count(*)')))
  }
})
test('driver errors never leak credentials or business rows', async () => {
  const c = {
    query: async () => {
      throw new Error(url + ' private-business-value')
    },
  }
  await assert.rejects(
    verifyEvidence(c, target(), matrix),
    /^Error: BLOCKED_READONLY_AUDIT$/,
  )
})

test('hidden input never echoes a URL and restores terminal on finish/cancel', async () => {
  let transcript = ''
  const modes: boolean[] = []
  const input = Object.assign(new EventEmitter(), {
    isTTY: true,
    setRawMode: (v: boolean) => modes.push(v),
    resume: () => {},
    pause: () => {},
    setEncoding: () => {},
  })
  const output = {
    write: (v: string) => {
      transcript += v
    },
  }
  const pending = hiddenInput(input, output)
  input.emit('data', url + '\r')
  assert.equal(await pending, url)
  assert.deepEqual(modes, [true, false])
  assert.ok(!transcript.includes(url))
  assert.ok(!transcript.includes('synthetic-password'))
  const cancelled = hiddenInput(input, output)
  input.emit('data', 'private-secret\u0003')
  await assert.rejects(cancelled, /BLOCKED_SECURE_INPUT/)
  assert.equal(modes.at(-1), false)
  assert.ok(!transcript.includes('private-secret'))
})

test('all published SQL, snapshots and journal retain their pinned hashes', () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        '../docs/governance/evidence/hml-source-manifest.json',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  assert.equal(manifest.files.length, 57)
  for (const entry of manifest.files) {
    assert.equal(
      createHash('sha256')
        .update(readFileSync(new URL('../' + entry.path, import.meta.url)))
        .digest('hex'),
      entry.sha256,
      entry.path,
    )
  }
})

test('versioned HML target map stores only hashes of Neon hosts and endpoints', () => {
  const text = readFileSync(
    new URL(
      '../docs/governance/evidence/hml-evidence-targets.json',
      import.meta.url,
    ),
    'utf8',
  )
  assert.doesNotMatch(text, /ep-[a-z]+-[a-z]+-[a-z0-9]{8}|neon\.tech/)
  const rows = JSON.parse(text).databases as Array<Record<string, unknown>>
  assert.equal(rows.length, 5)
  for (const row of rows) {
    for (const key of [
      'endpoint_sha256',
      'host_sha256',
      'destination_fingerprint',
    ])
      assert.match(String(row[key]), /^[a-f0-9]{64}$/, key)
    assert.equal(row.endpoint, undefined)
    assert.equal(row.host, undefined)
  }
  assert.ok(
    rows.some((row) => row.classification === 'production-do-not-access'),
  )
})

test('destination output carries only the host hash', () => {
  const result = sanitizeDestination(url, matrix, '2026-10-22T00:00:00.000Z')
  assert.equal(result.host_sha256, sha256(dbHost))
  assert.equal(result.match, 'exact-metadata-match-not-hml-proof')
  assert.ok(!JSON.stringify(result).includes(dbHost))
})
