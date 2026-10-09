// Disposable candidates only. The active drizzle/ directory is never written.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
export const strategies = ['replacement', 'compatibility', 'rebuilt-line']
export const hash = (value) => createHash('sha256').update(value).digest('hex')

export function sourceManifest() {
  const folder = join(root, 'drizzle')
  const journalBytes = readFileSync(join(folder, 'meta/_journal.json'))
  const journal = JSON.parse(journalBytes)
  return {
    source_commit: '1e5bd557a1bd57c89f65fe03fa013eb0f8af6d70',
    journal_sha256: hash(journalBytes),
    snapshots: Object.fromEntries(
      readdirSync(join(folder, 'meta'))
        .filter((name) => /^\d{4}_snapshot\.json$/.test(name))
        .sort()
        .map((name) => [name, hash(readFileSync(join(folder, 'meta', name)))]),
    ),
    migrations: journal.entries.map((entry) => ({
      idx: entry.idx,
      tag: entry.tag,
      when: String(entry.when),
      sha256: hash(readFileSync(join(folder, `${entry.tag}.sql`))),
    })),
  }
}

export function corrected0017() {
  const original = readFileSync(
    join(root, 'drizzle/0017_orange_the_hand.sql'),
    'utf8',
  )
  assert.equal(
    original.match(/"unit"/g)?.length,
    3,
    'review required: unexpected 0017 identifiers',
  )
  return original.replaceAll('"unit"', '"measurement_unit"')
}

export function buildCandidate(
  strategy,
  { last = 28, injectFailure = false, naiveCompatibility = false } = {},
) {
  assert.ok(strategies.includes(strategy), 'unknown strategy')
  assert.ok([16, 27, 28].includes(last), 'unsupported checkpoint')
  assert.ok(
    strategy !== 'rebuilt-line' || last !== 27,
    'rebuilt line is atomic to 0028',
  )
  const source = sourceManifest()
  const pinned = JSON.parse(
    readFileSync(
      join(root, 'test/fixtures/migration-chain-source-manifest.json'),
      'utf8',
    ),
  )
  assert.deepEqual(
    source,
    pinned,
    'historical sources changed; independent review required',
  )
  const originalJournal = JSON.parse(
    readFileSync(join(root, 'drizzle/meta/_journal.json'), 'utf8'),
  )
  const folder = mkdtempSync(join(tmpdir(), 'cacau-chain-candidate-'))
  mkdirSync(join(folder, 'meta'))
  let entries = originalJournal.entries
    .filter((entry) => entry.idx <= Math.min(last, 16))
    .map((entry) => ({ ...entry }))
  for (const entry of entries)
    copyFileSync(
      join(root, `drizzle/${entry.tag}.sql`),
      join(folder, `${entry.tag}.sql`),
    )
  if (last > 16) {
    const corrected = corrected0017()
    if (strategy === 'replacement') {
      entries = originalJournal.entries
        .filter((entry) => entry.idx <= last)
        .map((entry) => ({ ...entry }))
      for (const entry of entries.filter((item) => item.idx > 16)) {
        writeFileSync(
          join(folder, `${entry.tag}.sql`),
          entry.idx === 17
            ? corrected
            : readFileSync(join(root, `drizzle/${entry.tag}.sql`)),
        )
      }
    } else if (strategy === 'compatibility') {
      entries.push({
        idx: entries.length,
        version: '7',
        when: originalJournal.entries[16].when + 1,
        tag: '0016_compatibility_prepare',
        breakpoints: true,
      })
      writeFileSync(
        join(folder, '0016_compatibility_prepare.sql'),
        'ALTER TABLE "products" RENAME COLUMN "measurement_unit" TO "unit";\n',
      )
      for (const entry of originalJournal.entries.filter(
        (item) => item.idx > 16 && item.idx <= last,
      )) {
        entries.push({ ...entry, idx: entries.length })
        copyFileSync(
          join(root, `drizzle/${entry.tag}.sql`),
          join(folder, `${entry.tag}.sql`),
        )
      }
      entries.push({
        idx: entries.length,
        version: '7',
        when: originalJournal.entries[last].when + 1,
        tag: '0029_compatibility_cleanup',
        breakpoints: true,
      })
      const start = corrected.indexOf('CREATE OR REPLACE FUNCTION')
      const end = corrected.indexOf('$$;', start) + 3
      assert.ok(start > 0 && end > start)
      writeFileSync(
        join(folder, '0029_compatibility_cleanup.sql'),
        'ALTER TABLE "products" RENAME COLUMN "unit" TO "measurement_unit";\n' +
          (naiveCompatibility
            ? ''
            : '--> statement-breakpoint\n' +
              corrected.slice(start, end) +
              '\n'),
      )
    } else {
      const sql = originalJournal.entries
        .filter((entry) => entry.idx > 16)
        .map((entry) =>
          entry.idx === 17
            ? corrected
            : readFileSync(join(root, `drizzle/${entry.tag}.sql`), 'utf8'),
        )
        .join('\n--> statement-breakpoint\n')
      entries.push({
        idx: 17,
        version: '7',
        when: originalJournal.entries[28].when,
        tag: '0017_rebuilt_pending',
        breakpoints: true,
      })
      writeFileSync(join(folder, '0017_rebuilt_pending.sql'), sql)
      const final = JSON.parse(
        readFileSync(join(root, 'drizzle/meta/0028_snapshot.json'), 'utf8'),
      )
      const base = JSON.parse(
        readFileSync(join(root, 'drizzle/meta/0016_snapshot.json'), 'utf8'),
      )
      const identity = hash(sql).slice(0, 32).split('')
      identity[12] = '5'
      identity[16] = '8'
      const id = identity.join('')
      final.id = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
      final.prevId = base.id
      writeFileSync(
        join(folder, 'meta/0017_snapshot.json'),
        JSON.stringify(final, null, 2) + '\n',
      )
    }
  }
  if (injectFailure) {
    const path = join(folder, `${entries.at(-1).tag}.sql`)
    writeFileSync(
      path,
      readFileSync(path, 'utf8') +
        '\n--> statement-breakpoint\nSELECT 1 / 0;\n',
    )
  }
  writeFileSync(
    join(folder, 'meta/_journal.json'),
    JSON.stringify({ ...originalJournal, entries }, null, 2) + '\n',
  )
  return {
    strategy,
    folder,
    entries,
    manifest: {
      scope: 'disposable-tests-only',
      active_chain_replaced: false,
      application_authorized: false,
      source,
      strategy,
      last,
      injectFailure,
      naiveCompatibility,
      candidate_migrations: entries.map((entry) => ({
        tag: entry.tag,
        when: String(entry.when),
        sha256: hash(readFileSync(join(folder, `${entry.tag}.sql`))),
      })),
    },
  }
}
