import assert from 'node:assert/strict'
import test from 'node:test'

const compilerPath = '../scripts/migration-chain-scoped-payload.mjs'
const candidatesPath = '../scripts/migration-chain-candidates.mjs'
const { buildScopedUpgradePayload } = await import(compilerPath)
const { sourceManifest } = await import(candidatesPath)

test('scoped payload preserves every original migration and has two explicit bridge receipts', () => {
  const before = sourceManifest()
  const payload = buildScopedUpgradePayload()
  assert.deepEqual(sourceManifest(), before)
  assert.equal(payload.manifest.application_authorized, false)
  assert.equal(payload.manifest.active_chain_replaced, false)
  assert.equal(payload.manifest.expected_before_receipts, 17)
  assert.equal(payload.manifest.expected_after_receipts, 31)
  const originalTags = new Set(
    before.migrations.map((r: { tag: string }) => r.tag),
  )
  assert.deepEqual(
    payload.manifest.candidate_migrations.filter((r: { tag: string }) =>
      originalTags.has(r.tag),
    ),
    before.migrations.map(
      ({
        idx: _idx,
        ...r
      }: {
        idx: number
        tag: string
        when: string
        sha256: string
      }) => r,
    ),
  )
  assert.equal(
    payload.statements.filter((sql: string) =>
      sql.startsWith('INSERT INTO drizzle.__drizzle_migrations'),
    ).length,
    14,
  )
  assert.match(
    payload.statements.join('\n'),
    /SCOPED_UPGRADE_REQUIRES_EXACT_0016/,
  )
  assert.match(
    payload.statements.join('\n'),
    /SCOPED_UPGRADE_PARTIAL_APPLICATION/,
  )
})

test('scoped review compiler rejects a connection string or injected database name', () => {
  for (const databaseName of [
    'postgres://user:secret@host/db',
    "db';SELECT 1;--",
    '',
  ]) {
    assert.throws(() => buildScopedUpgradePayload({ databaseName }))
  }
})
