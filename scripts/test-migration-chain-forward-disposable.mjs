// Fixed synthetic loopback fixture. No environment DSNs or external SQL.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import pg from 'pg'
import { is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as schema from '../src/db/schema.ts'
import {
  buildCandidate,
  hash,
  sourceManifest,
} from './migration-chain-candidates.mjs'
import {
  buildForwardCandidate,
  classifyForwardHistory,
} from './migration-chain-forward-candidate.mjs'
import { captureCatalog } from './migration-chain-catalog.mjs'
import {
  catalogDigest,
  evaluateForwardReadiness,
} from './migration-chain-readiness.mjs'
import {
  verify0017ProductGuards,
  verify0017Idempotency,
} from './migration-chain-0017-checks.mjs'

assert.deepEqual(process.argv.slice(2), ['--ack-disposable-postgres17'])
const connection = {
  host: '127.0.0.1',
  port: 5433,
  user: 'cacau_chain_test',
  password: 'synthetic-ci-only',
  database: 'cacau_chain_disposable',
}
const admin = new pg.Client(connection)
const candidate = buildForwardCandidate()
const sourcesBefore = sourceManifest()
const cases = []
let expectedCatalog
let ormTablesChecked = 0
const receipts = candidate.manifest.candidate_migrations
const checkpointCatalogs = {}
const catalogReferences = JSON.parse(
  readFileSync(
    new URL(
      '../test/fixtures/migration-chain-forward-catalogs.json',
      import.meta.url,
    ),
    'utf8',
  ),
)
const history = async (client) => {
  if (
    !(
      await client.query(
        "SELECT to_regclass('drizzle.__drizzle_migrations') AS relation",
      )
    ).rows[0].relation
  )
    return []
  return (
    await client.query(
      'SELECT hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at',
    )
  ).rows
}
async function apply(client, folder = candidate.folder) {
  const selection = classifyForwardHistory(await history(client), receipts)
  assert.equal(selection.compatible, true, selection.reason)
  await migrate(drizzle(client), { migrationsFolder: folder })
}
async function seed(client) {
  await client.query(
    "INSERT INTO products(sku,name,product_type,measurement_unit) VALUES ('SYNTH-USED','Synthetic used','finished_product','unit'),('SYNTH-FREE','Synthetic free','ingredient','g')",
  )
  await client.query(
    "INSERT INTO stock_movements(product_id,type,quantity_delta,unit_cost) SELECT id,'adjustment',10.125,2.35 FROM products WHERE sku='SYNTH-USED'",
  )
  await client.query(
    "INSERT INTO expenses(description,category,amount,occurred_at) VALUES ('Synthetic preserve','fixture',123.45,'2026-01-02')",
  )
  await client.query(
    "INSERT INTO app_user_access(auth_user_id,role) VALUES ('synthetic-owner','owner')",
  )
  await client.query(
    "INSERT INTO auth_audit_events(action,outcome,request_id) VALUES ('role_changed','success','synthetic-preserve')",
  )
}
async function data(client) {
  const result = {}
  for (const [name, sql] of Object.entries({
    products:
      'SELECT sku,product_type,measurement_unit FROM products ORDER BY sku',
    expenses:
      'SELECT description,category,amount::text,occurred_at::text FROM expenses ORDER BY id',
    stock:
      'SELECT product_id,type,quantity_delta::text,unit_cost::text FROM stock_movements ORDER BY id',
    access:
      'SELECT auth_user_id,role,is_active FROM app_user_access ORDER BY id',
    audit:
      'SELECT action,outcome,request_id FROM auth_audit_events ORDER BY id',
  }))
    result[name] = (await client.query(sql)).rows
  return result
}
async function fixture(name, work) {
  const database = `cacau_forward_${Date.now()}_${cases.length}`
  assert.match(database, /^cacau_forward_[0-9_]+$/)
  await admin.query(`CREATE DATABASE "${database}"`)
  const client = new pg.Client({ ...connection, database })
  await client.connect()
  try {
    assert.equal(
      (
        await client.query(
          "SELECT count(*)::int n FROM pg_tables WHERE schemaname IN ('public','drizzle')",
        )
      ).rows[0].n,
      0,
    )
    await work(client)
    cases.push({ name, result: 'passed' })
    console.log(`PASS ${name}`)
  } finally {
    await client.end()
  }
}
try {
  await admin.connect()
  assert.equal(
    Math.floor(
      Number(
        (await admin.query('SHOW server_version_num')).rows[0]
          .server_version_num,
      ) / 10000,
    ),
    17,
  )
  for (const last of [null, 16, 28, 29, 30, 31, 32, 33]) {
    await fixture(
      last === null ? 'empty-to-0033' : `checkpoint-${last}-to-0033`,
      async (client) => {
        if (last !== null) {
          const baseline =
            last === 16
              ? buildCandidate('compatibility', { last })
              : buildForwardCandidate({ last })
          try {
            await migrate(drizzle(client), {
              migrationsFolder: baseline.folder,
            })
          } finally {
            rmSync(baseline.folder, { recursive: true, force: true })
          }
          await seed(client)
        }
        const before = last === null ? null : await data(client)
        const beforeHistory = await history(client)
        const checkpoint = classifyForwardHistory(
          beforeHistory,
          receipts,
        ).checkpoint
        const beforeCatalog = await captureCatalog(client)
        checkpointCatalogs[checkpoint] = catalogDigest(beforeCatalog)
        assert.equal(
          checkpointCatalogs[checkpoint],
          catalogReferences.catalogs[checkpoint],
        )
        const reviewEvidence = {
          line: 'forward-compatibility-v1',
          candidate_journal_sha256: candidate.manifest.candidate_journal_sha256,
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
            collected_at: new Date().toISOString(),
          },
          receipts: beforeHistory,
          catalog: beforeCatalog,
          backup: { verified: true, restore_tested: true },
          decisions: { migration_0019: 'approved', migration_0028: 'approved' },
          scenario_mix_preexisting: false,
        }
        const reviewed = evaluateForwardReadiness(
          reviewEvidence,
          candidate.manifest,
        )
        assert.equal(reviewed.status, 'READY_FOR_OPERATOR_REVIEW')
        assert.equal(reviewed.application_authorized, false)
        const drift = structuredClone(reviewEvidence)
        drift.catalog.tables.push({ name: 'synthetic-unreceipted-table' })
        assert.ok(
          evaluateForwardReadiness(drift, candidate.manifest).blockers.includes(
            'CATALOG_MISMATCH_OR_INCOMPLETE',
          ),
        )
        await apply(client)
        const rows = await history(client)
        assert.deepEqual(
          rows,
          receipts.map((r) => ({ hash: r.sha256, created_at: r.when })),
        )
        assert.deepEqual(rows.slice(0, beforeHistory.length), beforeHistory)
        if (before) assert.deepEqual(await data(client), before)
        else await seed(client)
        const db = drizzle(client)
        let checked = 0
        for (const table of Object.values(schema)) {
          if (!is(table, PgTable)) continue
          await db.select().from(table).limit(0)
          checked++
        }
        assert.equal(checked, 38)
        ormTablesChecked = checked
        await client.query('BEGIN')
        try {
          await verify0017ProductGuards(client)
          await verify0017Idempotency(client)
        } finally {
          await client.query('ROLLBACK')
        }
        const catalog = await captureCatalog(client)
        if (!expectedCatalog) expectedCatalog = catalog
        assert.deepEqual(catalog, expectedCatalog)
        const after = await data(client)
        await apply(client)
        assert.deepEqual(await history(client), rows)
        assert.deepEqual(await data(client), after)
        assert.deepEqual(await captureCatalog(client), catalog)
      },
    )
  }
  await fixture(
    'same-catalog-as-independent-corrected-reference',
    async (client) => {
      const reference = buildCandidate('replacement')
      try {
        const journalPath = join(reference.folder, 'meta/_journal.json')
        const journal = JSON.parse(readFileSync(journalPath, 'utf8'))
        for (const entry of candidate.entries.filter((item) =>
          /^003[0-3]_|^0029_exact/.test(item.tag),
        )) {
          journal.entries.push({ ...entry, idx: journal.entries.length })
          copyFileSync(
            join(candidate.folder, `${entry.tag}.sql`),
            join(reference.folder, `${entry.tag}.sql`),
          )
        }
        writeFileSync(journalPath, JSON.stringify(journal))
        await migrate(drizzle(client), { migrationsFolder: reference.folder })
        assert.deepEqual(await captureCatalog(client), expectedCatalog)
      } finally {
        rmSync(reference.folder, { recursive: true, force: true })
      }
    },
  )
  await fixture(
    'future-generation-no-diff-and-additive-replay',
    async (client) => {
      const future = buildForwardCandidate()
      try {
        await apply(client, future.folder)
        await seed(client)
        const before = await data(client)
        const generate = (schemaPath) =>
          execFileSync(
            './node_modules/.bin/drizzle-kit',
            [
              'generate',
              `--schema=${schemaPath}`,
              '--dialect=postgresql',
              `--out=${relative(process.cwd(), future.folder)}`,
              '--name=synthetic_generation_probe',
            ],
            { encoding: 'utf8', env: { PATH: process.env.PATH } },
          )
        assert.match(
          generate('./src/db/schema.ts'),
          /No schema changes, nothing to migrate/,
        )
        const journalPath = join(future.folder, 'meta/_journal.json')
        assert.equal(
          hash(readFileSync(journalPath)),
          future.manifest.candidate_journal_sha256,
        )
        const schemaPath = join(future.folder, 'generation-probe.ts')
        writeFileSync(
          schemaPath,
          `export * from ${JSON.stringify(join(process.cwd(), 'src/db/schema.ts'))};\n` +
            `import {pgTable,text} from ${JSON.stringify(join(process.cwd(), 'node_modules/drizzle-orm/pg-core/index.js'))};\n` +
            `export const syntheticGenerationProbe=pgTable('synthetic_generation_probe',{value:text()});\n`,
        )
        generate(relative(process.cwd(), schemaPath))
        const journal = JSON.parse(readFileSync(journalPath, 'utf8'))
        assert.deepEqual(journal.entries.slice(0, 36), future.entries)
        assert.equal(journal.entries.length, 37)
        assert.equal(journal.entries[36].idx, 36)
        const sql = readFileSync(
          join(future.folder, `${journal.entries[36].tag}.sql`),
          'utf8',
        )
        assert.match(sql, /CREATE TABLE "synthetic_generation_probe"/)
        assert.doesNotMatch(sql, /ALTER|DROP|TRUNCATE|DELETE|UPDATE|INSERT/i)
        await migrate(drizzle(client), { migrationsFolder: future.folder })
        const rows = await history(client)
        assert.equal(rows.length, 37)
        assert.deepEqual(
          rows.slice(0, 36),
          receipts.map((r) => ({ hash: r.sha256, created_at: r.when })),
        )
        assert.equal(
          (
            await client.query(
              "SELECT to_regclass('public.synthetic_generation_probe') AS relation",
            )
          ).rows[0].relation,
          'synthetic_generation_probe',
        )
        assert.deepEqual(await data(client), before)
        const catalog = await captureCatalog(client)
        await migrate(drizzle(client), { migrationsFolder: future.folder })
        assert.deepEqual(await history(client), rows)
        assert.deepEqual(await captureCatalog(client), catalog)
      } finally {
        rmSync(future.folder, { recursive: true, force: true })
      }
    },
  )
  for (const kind of ['hash-drift', 'unreceipted-column', 'late-failure']) {
    await fixture(kind, async (client) => {
      const baseline = buildForwardCandidate({ last: 28 })
      try {
        await migrate(drizzle(client), { migrationsFolder: baseline.folder })
      } finally {
        rmSync(baseline.folder, { recursive: true, force: true })
      }
      await seed(client)
      if (kind === 'hash-drift')
        await client.query(
          "UPDATE drizzle.__drizzle_migrations SET hash=repeat('0',64) WHERE id=1",
        )
      if (kind === 'unreceipted-column')
        await client.query(
          'ALTER TABLE expenses ADD COLUMN classification varchar(24)',
        )
      const oldHistory = await history(client)
      const oldCatalog = await captureCatalog(client)
      const oldData = await data(client)
      const broken = buildForwardCandidate()
      try {
        if (kind === 'late-failure') {
          const file = join(broken.folder, '0033_payment_settlement.sql')
          writeFileSync(
            file,
            readFileSync(file, 'utf8') +
              '\n--> statement-breakpoint\nSELECT 1/0;',
          )
        }
        await assert.rejects(() => apply(client, broken.folder))
      } finally {
        rmSync(broken.folder, { recursive: true, force: true })
      }
      assert.deepEqual(await history(client), oldHistory)
      assert.deepEqual(await captureCatalog(client), oldCatalog)
      assert.deepEqual(await data(client), oldData)
    })
  }
  assert.deepEqual(sourceManifest(), sourcesBefore)
  assert.deepEqual(checkpointCatalogs, catalogReferences.catalogs)
  assert.equal(
    candidate.manifest.candidate_journal_sha256,
    catalogReferences.candidate_journal_sha256,
  )
  const folder = mkdtempSync(join(tmpdir(), 'cacau-forward-evidence-'))
  writeFileSync(
    join(folder, 'result.json'),
    JSON.stringify(
      {
        scope: 'synthetic-disposable-postgres17',
        application_authorized: false,
        active_chain_replaced: false,
        source_unchanged: true,
        cases,
        orm_tables_checked: ormTablesChecked,
        final_receipts: receipts.length,
        catalog_sha256: hash(JSON.stringify(expectedCatalog)),
        manifest: candidate.manifest,
        checkpoint_catalogs: checkpointCatalogs,
      },
      null,
      2,
    ) + '\n',
    { flag: 'wx', mode: 0o600 },
  )
  console.log(
    `${cases.length} forward migration cases passed; evidence ${folder}/result.json`,
  )
} finally {
  rmSync(candidate.folder, { recursive: true, force: true })
  await admin.end()
}
