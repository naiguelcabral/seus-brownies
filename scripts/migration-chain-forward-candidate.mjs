// Offline proposal only. Never connects, executes SQL or changes active sources.
import assert from 'node:assert/strict'
import { copyFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCandidate, hash } from './migration-chain-candidates.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const extensionSource = [
  [
    '0029_exact_costs',
    'pending-exact-costs',
    '5996cfe074256a80aa21c3053dcf3e1dae5fdb04dcc967ec23001b501854adbb',
  ],
  [
    '0030_exact_operational_cost',
    'pending-exact-costs',
    'd0aa57a192140084c9b745956bada0df1cfe8285a67073f6fede9986e5323d3f',
  ],
  [
    '0031_brave_thor',
    'pending-profile-materials',
    '4141f22f81ffbee083778832ad3f868b33e33ab800a54e2d10a448f552057bca',
  ],
  [
    '0032_long_slapstick',
    'pending-profile-materials',
    '907c300393e2e828ac8e7ccee7aef9470a71e6760151f39e5ba4cdd4d0fa2c18',
  ],
  [
    '0033_payment_settlement',
    'pending-profile-materials',
    '8c08508225c60a88834addd31622b55bb59daaa791b7bbea779c0030f8fcde1b',
  ],
]
const snapshotHashes = [
  '474d273b4c10279fe9e03a5035bc587ed276ffb08b9c3f6231189679ebac9d69',
  '3ba2dcfe391b9a233b9a692ebd3d6d0c235e2abe24f45b608ba7bd0bb7dacbb4',
  'f70955cf862e93d371613d1b70b3160efafc8eede7a70e745cbea6772e1dff34',
  'a2834d08fc6056895ebb0f8444f5a80f55e17c53bb13932bb5c18387a1f2d234',
  'eff4d140a4e93fceaf43fc2149891134a356c2dd6959bd5d93c13c4de40f43d7',
]

export function buildForwardCandidate({ last = 33 } = {}) {
  assert.ok([28, 29, 30, 31, 32, 33].includes(last), 'UNSUPPORTED_CHECKPOINT')
  const journalBytes = readFileSync(
    join(root, 'drizzle/pending-profile-materials/meta/_journal.json'),
  )
  assert.equal(
    hash(journalBytes),
    'aeeb99f786a33b2e77775fced8cefaa1f8c04c0ec1c6d325bd83362de2170aff',
    'EXTENSION_JOURNAL_DRIFT',
  )
  const extensionJournal = JSON.parse(journalBytes)
  const candidate = buildCandidate('compatibility', { last: 28 })
  try {
    const entries = [...candidate.entries]
    const receipts = [...candidate.manifest.candidate_migrations]
    const snapshots = {}
    for (const [
      offset,
      [tag, folder, expectedHash],
    ] of extensionSource.entries()) {
      const index = 29 + offset
      const entry = extensionJournal.entries[index]
      assert.equal(entry.tag, tag, 'EXTENSION_ORDER_DRIFT')
      const sql = readFileSync(join(root, `drizzle/${folder}/${tag}.sql`))
      assert.equal(hash(sql), expectedHash, 'EXTENSION_SQL_DRIFT')
      const snapshotName = `${String(index).padStart(4, '0')}_snapshot.json`
      const snapshotPath = join(root, `drizzle/${folder}/meta/${snapshotName}`)
      assert.equal(
        hash(readFileSync(snapshotPath)),
        snapshotHashes[offset],
        'EXTENSION_SNAPSHOT_DRIFT',
      )
      if (index > last) continue
      assert.ok(entry.when > entries.at(-1).when, 'EXTENSION_TIMESTAMP_ORDER')
      entries.push({ ...entry, idx: entries.length })
      receipts.push({ tag, when: String(entry.when), sha256: expectedHash })
      snapshots[snapshotName] = snapshotHashes[offset]
      copyFileSync(snapshotPath, join(candidate.folder, 'meta', snapshotName))
      writeFileSync(join(candidate.folder, `${tag}.sql`), sql)
    }
    const journal = { version: '7', dialect: 'postgresql', entries }
    writeFileSync(
      join(candidate.folder, 'meta/_journal.json'),
      JSON.stringify(journal, null, 2) + '\n',
    )
    const manifest = {
      ...candidate.manifest,
      strategy: 'forward-compatibility-proposal',
      last,
      candidate_migrations: receipts,
      candidate_journal_sha256: hash(
        readFileSync(join(candidate.folder, 'meta/_journal.json')),
      ),
      candidate_snapshots: {
        ...candidate.manifest.candidate_snapshots,
        ...snapshots,
      },
      extension_snapshots: snapshots,
      application_authorized: false,
      active_chain_replaced: false,
      requires_catalog_validation: true,
      schema_generation_supported: last === 33,
    }
    writeFileSync(
      join(candidate.folder, 'manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
    )
    return { folder: candidate.folder, entries, manifest }
  } catch (error) {
    rmSync(candidate.folder, { recursive: true, force: true })
    throw error
  }
}

/** Classify receipts only; matching a prefix never authorizes a migration. */
export function classifyForwardHistory(receipts, expected) {
  const blocked = (reason) => ({
    compatible: false,
    reason,
    application_authorized: false,
  })
  if (!Array.isArray(receipts)) return blocked('HISTORY_MISSING')
  if (![0, 17, 31, 32, 33, 34, 35, 36].includes(receipts.length))
    return blocked('UNSUPPORTED_OR_PARTIAL_HISTORY')
  if (receipts.length > expected.length)
    return blocked('HISTORY_AHEAD_OF_CANDIDATE')
  for (const [index, row] of receipts.entries()) {
    const entry = expected[index]
    if (
      !row ||
      row.hash !== entry.sha256 ||
      String(row.created_at) !== entry.when
    )
      return blocked('HISTORY_HASH_OR_TIMESTAMP_MISMATCH')
  }
  return {
    compatible: true,
    checkpoint:
      receipts.length === 0
        ? 'empty'
        : receipts.length === 17
          ? '0016'
          : `bridged-${String(28 + receipts.length - 31).padStart(4, '0')}`,
    pending_receipts: expected.length - receipts.length,
    application_authorized: false,
    requires_catalog_validation: true,
  }
}
