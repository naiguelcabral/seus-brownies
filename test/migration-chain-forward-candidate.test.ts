import assert from 'node:assert/strict'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const modulePath = '../scripts/migration-chain-forward-candidate.mjs'
const { buildForwardCandidate, classifyForwardHistory } = await import(
  modulePath
)
const sourcePath = '../scripts/migration-chain-candidates.mjs'
const { hash, sourceManifest } = await import(sourcePath)

test('forward proposal preserves original receipts and adds exactly the published five extensions', () => {
  const before = sourceManifest()
  const candidate = buildForwardCandidate()
  try {
    const receipts = candidate.manifest.candidate_migrations
    assert.equal(receipts.length, 36)
    for (const original of before.migrations) {
      const preserved = receipts.find(
        (row: { tag: string }) => row.tag === original.tag,
      )
      assert.deepEqual(preserved, {
        tag: original.tag,
        when: original.when,
        sha256: original.sha256,
      })
    }
    for (const receipt of receipts) {
      assert.equal(
        hash(readFileSync(join(candidate.folder, `${receipt.tag}.sql`))),
        receipt.sha256,
      )
    }
    assert.equal(candidate.manifest.application_authorized, false)
    assert.equal(candidate.manifest.active_chain_replaced, false)
    assert.equal(candidate.manifest.schema_generation_supported, true)
    assert.equal(
      candidate.manifest.candidate_journal_sha256,
      hash(readFileSync(join(candidate.folder, 'meta/_journal.json'))),
    )
    for (const [name, expectedHash] of Object.entries(
      candidate.manifest.candidate_snapshots,
    )) {
      assert.equal(
        hash(readFileSync(join(candidate.folder, 'meta', name))),
        expectedHash,
      )
    }
    assert.deepEqual(sourceManifest(), before)
  } finally {
    rmSync(candidate.folder, { recursive: true, force: true })
  }
})

test('history selection rejects drift, missing bridge, duplicates and unsupported partial checkpoints', () => {
  const candidate = buildForwardCandidate()
  try {
    const expected = candidate.manifest.candidate_migrations
    const all = expected.map((row: { sha256: string; when: string }) => ({
      hash: row.sha256,
      created_at: row.when,
    }))
    for (const count of [0, 17, 31, 32, 33, 34, 35, 36]) {
      const result = classifyForwardHistory(all.slice(0, count), expected)
      assert.equal(result.compatible, true)
      assert.equal(result.pending_receipts, 36 - count)
      assert.equal(result.application_authorized, false)
      assert.equal(result.requires_catalog_validation, true)
    }
    for (const count of [1, 16, 18, 29, 30]) {
      assert.equal(
        classifyForwardHistory(all.slice(0, count), expected).compatible,
        false,
      )
    }
    for (const rows of [
      all.map((row: { hash: string; created_at: string }, index: number) =>
        index === 2 ? { ...row, hash: '0'.repeat(64) } : row,
      ),
      all.map((row: { hash: string; created_at: string }, index: number) =>
        index === 17 ? { ...row, created_at: '0' } : row,
      ),
      [...all.slice(0, 35), all[0]],
      all.filter((_: unknown, index: number) => index !== 17),
      [...all, all[35]],
    ]) {
      assert.equal(classifyForwardHistory(rows, expected).compatible, false)
    }
    assert.equal(classifyForwardHistory(null, expected).compatible, false)
  } finally {
    rmSync(candidate.folder, { recursive: true, force: true })
  }
})
