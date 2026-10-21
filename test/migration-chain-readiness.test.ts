import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'

const candidatePath = '../scripts/migration-chain-forward-candidate.mjs'
const readinessPath = '../scripts/migration-chain-readiness.mjs'
const preparePath = '../scripts/migration-chain-prepare.mjs'
const { buildForwardCandidate } = await import(candidatePath)
const { catalogDigest, evaluateForwardReadiness } = await import(readinessPath)
const { runPreparation } = await import(preparePath)
const now = Date.parse('2026-10-20T12:00:00Z')
const catalog = Object.fromEntries(
  [
    'tables',
    'columns',
    'constraints',
    'indexes',
    'enums',
    'functions',
    'triggers',
    'sequences',
    'policies',
  ].map((key) => [key, []]),
)

function evidence(manifest: { candidate_journal_sha256: string }) {
  return {
    line: 'forward-compatibility-v1',
    candidate_journal_sha256: manifest.candidate_journal_sha256,
    environment: 'hml',
    target: {
      project_id: 'synthetic-project',
      branch_id: 'synthetic-branch',
      database_name: 'fixture',
      classification: 'confirmed-hml',
      worker_binding_verified: true,
    },
    collection: {
      source: 'independent-catalog',
      independent: true,
      read_only: true,
      collected_at: '2026-10-20T11:59:00Z',
    },
    receipts: [],
    catalog: structuredClone(catalog),
    backup: { verified: true, restore_tested: true },
    decisions: { migration_0019: 'approved', migration_0028: 'approved' },
    scenario_mix_preexisting: false,
  }
}

test('offline review accepts matching empty catalog for operator review without authorizing execution', () => {
  const candidate = buildForwardCandidate()
  try {
    assert.deepEqual(
      evaluateForwardReadiness(
        evidence(candidate.manifest),
        candidate.manifest,
        { now },
      ),
      {
        status: 'READY_FOR_OPERATOR_REVIEW',
        application_authorized: false,
        execution_enabled: false,
        external_connection_attempted: false,
        blockers: [],
        checkpoint: 'empty',
        pending_receipts: 36,
      },
    )
  } finally {
    rmSync(candidate.folder, { recursive: true, force: true })
  }
})

test('independent readiness gates reject drift, production, stale evidence and missing decisions', () => {
  const candidate = buildForwardCandidate()
  try {
    for (const [blocker, change] of [
      [
        'LINE_NOT_SELECTED',
        (v: any) => {
          v.line = 'legacy'
        },
      ],
      [
        'CANDIDATE_MANIFEST_MISMATCH',
        (v: any) => {
          v.candidate_journal_sha256 = '0'.repeat(64)
        },
      ],
      [
        'TARGET_UNCONFIRMED',
        (v: any) => {
          v.target.classification = 'unknown'
        },
      ],
      [
        'PRODUCTION_REJECTED',
        (v: any) => {
          v.target.branch_id = 'br-lingering-wind-acwh5wap'
        },
      ],
      [
        'TARGET_IDENTITY_INCOMPLETE',
        (v: any) => {
          delete v.target.project_id
        },
      ],
      [
        'WORKER_TARGET_UNATTESTED',
        (v: any) => {
          v.target.worker_binding_verified = false
        },
      ],
      [
        'COLLECTION_STALE_OR_INVALID',
        (v: any) => {
          v.collection.collected_at = '2026-10-20T11:29:59Z'
        },
      ],
      [
        'COLLECTION_STALE_OR_INVALID',
        (v: any) => {
          v.collection.collected_at = '2026-10-20T12:00:01Z'
        },
      ],
      [
        'INDEPENDENT_READONLY_COLLECTION_REQUIRED',
        (v: any) => {
          v.collection.read_only = false
        },
      ],
      [
        'INDEPENDENT_READONLY_COLLECTION_REQUIRED',
        (v: any) => {
          v.collection.independent = false
        },
      ],
      [
        'UNSUPPORTED_OR_PARTIAL_HISTORY',
        (v: any) => {
          v.receipts.push({ hash: '0'.repeat(64), created_at: '1' })
        },
      ],
      [
        'CATALOG_MISMATCH_OR_INCOMPLETE',
        (v: any) => {
          delete v.catalog.functions
        },
      ],
      [
        'CATALOG_MISMATCH_OR_INCOMPLETE',
        (v: any) => {
          v.catalog.triggers.push({ name: 'manual-trigger' })
        },
      ],
      [
        'BACKUP_RECOVERY_UNATTESTED',
        (v: any) => {
          v.backup.restore_tested = false
        },
      ],
      [
        'DECISION_0019_PENDING',
        (v: any) => {
          v.decisions.migration_0019 = 'pending'
        },
      ],
      [
        'DECISION_0028_PENDING',
        (v: any) => {
          v.decisions.migration_0028 = 'pending'
        },
      ],
      [
        'SCENARIO_MIX_STATE_UNVERIFIED',
        (v: any) => {
          delete v.scenario_mix_preexisting
        },
      ],
    ] as const) {
      const input = evidence(candidate.manifest)
      change(input)
      const result = evaluateForwardReadiness(input, candidate.manifest, {
        now,
      })
      assert.equal(result.status, 'BLOCKED', blocker)
      assert.ok(result.blockers.includes(blocker), blocker)
      assert.equal(result.application_authorized, false)
    }
  } finally {
    rmSync(candidate.folder, { recursive: true, force: true })
  }
})

test('already applied checkpoint does not request historical decisions or backup for a nonexistent write', () => {
  const candidate = buildForwardCandidate()
  try {
    const input: any = evidence(candidate.manifest)
    input.receipts = candidate.manifest.candidate_migrations.map(
      (row: { sha256: string; when: string }) => ({
        hash: row.sha256,
        created_at: row.when,
      }),
    )
    delete input.backup
    delete input.decisions
    delete input.scenario_mix_preexisting
    // Synthetic references isolate the decision test. CLI always uses the
    // checked-in catalog references reproduced from actual PostgreSQL metadata.
    const references = {
      candidate_journal_sha256: candidate.manifest.candidate_journal_sha256,
      catalogs: { 'bridged-0033': catalogDigest(catalog) },
    }
    const result = evaluateForwardReadiness(input, candidate.manifest, {
      now,
      references,
    })
    assert.equal(result.status, 'READY_FOR_OPERATOR_REVIEW')
    assert.equal(result.pending_receipts, 0)
    assert.equal(result.application_authorized, false)
  } finally {
    rmSync(candidate.folder, { recursive: true, force: true })
  }
})

test('catalog digest is key-order independent and requires all metadata sections', () => {
  assert.equal(
    catalogDigest(catalog),
    catalogDigest(Object.fromEntries(Object.entries(catalog).reverse())),
  )
  assert.equal(catalogDigest({ tables: [] }), null)
  assert.equal(catalogDigest({ ...catalog, functions: [null] }), null)
})

test('sensitive input is rejected without reflecting credentials', () => {
  const candidate = buildForwardCandidate()
  try {
    const result = evaluateForwardReadiness(
      {
        ...evidence(candidate.manifest),
        connection: 'postgres://synthetic:private@invalid/db',
      },
      candidate.manifest,
      { now },
    )
    assert.deepEqual(result.blockers, ['SENSITIVE_INPUT_REJECTED'])
    assert.doesNotMatch(JSON.stringify(result), /private|postgres:/)
  } finally {
    rmSync(candidate.folder, { recursive: true, force: true })
  }
})

test('official preparation returns a review bundle and rejects missing review input', () => {
  const result = runPreparation([])
  try {
    assert.equal(result.status, 'PREPARED_FOR_REVIEW')
    assert.equal(result.manifest.candidate_migrations.length, 36)
    assert.equal(result.execution_enabled, false)
    assert.equal(result.application_authorized, false)
    assert.throws(() => runPreparation(['--review']), /EVIDENCE_REQUIRED/)
  } finally {
    rmSync(result.folder, { recursive: true, force: true })
  }
})

test('review CLI rejects external files, symlinks, directories, oversized files and URLs', () => {
  const outside = mkdtempSync(join(tmpdir(), 'cacau-offline-private-'))
  const inside = mkdtempSync(join(process.cwd(), 'evidence', 'readiness-test-'))
  try {
    const privateFile = join(outside, 'private.json')
    writeFileSync(privateFile, '{"password":"synthetic-private"}')
    const link = join(inside, 'link.json')
    symlinkSync(privateFile, link)
    const directory = join(inside, 'directory.json')
    mkdirSync(directory)
    const oversized = join(inside, 'oversized.json')
    writeFileSync(oversized, ' '.repeat(1_000_001))
    for (const path of [
      privateFile,
      link,
      directory,
      oversized,
      'postgres://synthetic:private@invalid/db',
    ]) {
      const result = spawnSync(
        process.execPath,
        ['scripts/migration-chain-prepare.mjs', '--review', '--evidence', path],
        { encoding: 'utf8', env: { PATH: process.env.PATH } },
      )
      assert.equal(result.error, undefined)
      assert.equal(result.status, 1)
      assert.equal(result.stdout, '')
      assert.equal(result.stderr, 'BLOCKED_OFFLINE_MIGRATION_REVIEW\n')
    }
  } finally {
    rmSync(outside, { recursive: true, force: true })
    rmSync(inside, { recursive: true, force: true })
  }
})

test('review CLI accepts complete metadata and blocks catalog drift without enabling execution', () => {
  const candidate = buildForwardCandidate()
  const folder = mkdtempSync(join(process.cwd(), 'evidence', 'readiness-cli-'))
  try {
    const input = evidence(candidate.manifest)
    input.collection.collected_at = new Date().toISOString()
    const path = join(folder, 'metadata.json')
    for (const expected of ['READY_FOR_OPERATOR_REVIEW', 'BLOCKED']) {
      writeFileSync(
        path,
        JSON.stringify({
          ...input,
          catalog:
            expected === 'BLOCKED'
              ? { ...input.catalog, tables: [{ table_name: 'unreceipted' }] }
              : input.catalog,
        }),
      )
      const cli = spawnSync(
        process.execPath,
        ['scripts/migration-chain-prepare.mjs', '--review', '--evidence', path],
        { encoding: 'utf8', env: { PATH: process.env.PATH } },
      )
      assert.equal(cli.error, undefined)
      assert.equal(cli.stderr, '')
      assert.equal(cli.status, expected === 'BLOCKED' ? 1 : 0)
      const result = JSON.parse(cli.stdout)
      assert.equal(result.status, expected)
      assert.equal(result.execution_enabled, false)
      assert.equal(result.application_authorized, false)
      assert.equal(result.external_connection_attempted, false)
    }
  } finally {
    rmSync(candidate.folder, { recursive: true, force: true })
    rmSync(folder, { recursive: true, force: true })
  }
})
