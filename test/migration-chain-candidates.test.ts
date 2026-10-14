import assert from 'node:assert/strict'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const modulePath = '../scripts/migration-chain-candidates.mjs'
const { buildCandidate, sourceManifest, strategies } = await import(modulePath)

test('repair candidates preserve pinned history and only write temporary folders', () => {
  const before = sourceManifest()
  for (const strategy of strategies) {
    const candidate = buildCandidate(strategy)
    try {
      assert.equal(
        candidate.entries.length,
        { replacement: 29, compatibility: 31, 'rebuilt-line': 18 }[
          strategy as string
        ],
      )
      assert.equal(candidate.manifest.application_authorized, false)
      assert.equal(candidate.manifest.active_chain_replaced, false)
      assert.deepEqual(candidate.manifest.source, before)
      assert.deepEqual(
        candidate.manifest.candidate_migrations
          .slice(0, 17)
          .map((item: { sha256: string }) => item.sha256),
        before.migrations
          .slice(0, 17)
          .map((item: { sha256: string }) => item.sha256),
      )
      const sql = readFileSync(
        join(
          candidate.folder,
          strategy === 'rebuilt-line'
            ? '0017_rebuilt_pending.sql'
            : '0017_orange_the_hand.sql',
        ),
        'utf8',
      )
      if (strategy === 'compatibility') {
        assert.equal(
          candidate.manifest.candidate_migrations[18].sha256,
          before.migrations[17].sha256,
        )
        assert.match(sql, /NEW\."unit"/)
        assert.match(
          readFileSync(
            join(candidate.folder, '0029_compatibility_cleanup.sql'),
            'utf8',
          ),
          /NEW\."measurement_unit"/,
        )
      } else {
        assert.match(sql, /NEW\."measurement_unit"/)
        assert.doesNotMatch(sql, /NEW\."unit"/)
      }
      if (strategy === 'rebuilt-line') {
        const snapshot = JSON.parse(
          readFileSync(
            join(candidate.folder, 'meta/0017_snapshot.json'),
            'utf8',
          ),
        )
        const base = JSON.parse(
          readFileSync(
            new URL('../drizzle/meta/0016_snapshot.json', import.meta.url),
            'utf8',
          ),
        )
        assert.equal(snapshot.prevId, base.id)
      }
    } finally {
      rmSync(candidate.folder, { recursive: true, force: true })
    }
  }
  assert.deepEqual(sourceManifest(), before)
})

test('unsupported strategy and checkpoint fail before writing a candidate', () => {
  assert.throws(() => buildCandidate('unknown'), /unknown strategy/)
  assert.throws(
    () => buildCandidate('replacement', { last: 19 }),
    /unsupported checkpoint/,
  )
  assert.throws(() => buildCandidate('rebuilt-line', { last: 27 }), /atomic/)
})
