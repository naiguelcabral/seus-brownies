import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const { evaluatePreflight } =
  await import('../scripts/migration-chain-preflight.mjs')
const { sourceManifest } =
  await import('../scripts/migration-chain-candidates.mjs')

function evidence() {
  return {
    environment: 'hml',
    target: { classification: 'confirmed-hml', operator_authorized: true },
    history: { state: 'verified-through-0016', partial_application: false },
    source_manifest: sourceManifest(),
    backup: { verified: true, restore_tested: true },
    decisions: { migration_0019: 'approved', migration_0028: 'approved' },
  }
}

test('preflight blocks the published 0017 defect despite otherwise complete synthetic evidence', () => {
  const result = evaluatePreflight(evidence())
  assert.equal(result.authorized, false)
  assert.deepEqual(result.blockers, ['ACTIVE_0017_DEFECT'])
  assert.equal(result.diagnostic.external_connection_attempted, false)
  assert.equal(result.diagnostic.migration_execution_started, false)
})

test('preflight fails closed for every independent authorization and integrity gate', () => {
  for (const [label, mutate, blocker] of [
    [
      'environment',
      (v: any) => (v.environment = 'unknown'),
      'ENVIRONMENT_UNIDENTIFIED',
    ],
    [
      'production',
      (v: any) => (v.environment = 'production'),
      'ENVIRONMENT_UNIDENTIFIED',
    ],
    [
      'target',
      (v: any) => (v.target.classification = 'candidate-hml'),
      'TARGET_UNCONFIRMED',
    ],
    [
      'operator',
      (v: any) => (v.target.operator_authorized = false),
      'OPERATOR_AUTHORIZATION_MISSING',
    ],
    [
      'history',
      (v: any) => (v.history.state = 'unverified'),
      'HISTORY_INCOMPLETE',
    ],
    [
      'partial',
      (v: any) => (v.history.partial_application = true),
      'PARTIAL_APPLICATION_UNRESOLVED',
    ],
    [
      'hash',
      (v: any) => (v.source_manifest.migrations[17].sha256 = 'a'.repeat(64)),
      'HASHES_MISMATCH',
    ],
    [
      'backup',
      (v: any) => (v.backup.restore_tested = false),
      'BACKUP_RECOVERY_UNATTESTED',
    ],
    [
      '0019',
      (v: any) => (v.decisions.migration_0019 = 'pending'),
      'DECISION_0019_PENDING',
    ],
    [
      '0028',
      (v: any) => (v.decisions.migration_0028 = 'pending'),
      'DECISION_0028_PENDING',
    ],
  ] as const) {
    const value = evidence()
    mutate(value)
    assert.ok(evaluatePreflight(value).blockers.includes(blocker), label)
  }
})

test('preflight rejects sensitive connection material without reflecting it', () => {
  const value = {
    ...evidence(),
    connection_string: 'postgresql://user:secret@host/neondb',
  }
  const result = evaluatePreflight(value)
  assert.ok(result.blockers.includes('SENSITIVE_INPUT_REJECTED'))
  assert.ok(!JSON.stringify(result).includes('secret'))
})

test('CLI accepts only a repository JSON evidence file and never echoes a supplied URL', () => {
  const dir = mkdtempSync(join(process.cwd(), '.tmp-preflight-'))
  try {
    const file = join(dir, 'evidence.json')
    writeFileSync(file, JSON.stringify(evidence()))
    const expected = spawnSync(
      process.execPath,
      ['scripts/migration-chain-preflight.mjs', '--evidence', file],
      { encoding: 'utf8' },
    )
    assert.equal(expected.status, 1)
    assert.match(expected.stdout, /ACTIVE_0017_DEFECT/)
    const url =
      'postgresql://synthetic-user:synthetic-secret@example.test/neondb'
    const rejected = spawnSync(
      process.execPath,
      ['scripts/migration-chain-preflight.mjs', url],
      { encoding: 'utf8' },
    )
    assert.equal(rejected.status, 1)
    assert.equal(rejected.stdout, '')
    assert.equal(rejected.stderr, 'BLOCKED_MIGRATION_PREFLIGHT\n')
    assert.ok(!rejected.stderr.includes('synthetic-secret'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
