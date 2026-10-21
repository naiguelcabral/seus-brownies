// Fixed loopback destination and synthetic credentials; no environment file reads.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import pg from 'pg'
import { buildAuthBaselinePayload } from './auth-baseline-payload.mjs'
import { buildScopedUpgradePayload } from './migration-chain-scoped-payload.mjs'
import { buildTechnicalCatalogPayload } from './technical-catalog-payload.mjs'

assert.deepEqual(process.argv.slice(2), ['--ack-disposable-postgres17'])
const client = new pg.Client({
  host: '127.0.0.1',
  port: 5438,
  user: 'technical_catalog_fixture',
  password: 'synthetic-catalog-only',
  database: 'neondb',
})
const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const { sql, manifest } = buildTechnicalCatalogPayload()
assert.equal(sql, read('evidence/technical-catalog-apply-2026-10-18.sql'))
const body = sql.slice(
  sql.indexOf('BEGIN;') + 'BEGIN;'.length,
  sql.lastIndexOf('COMMIT;'),
)
const cases = []
async function run(statements) {
  await client.query('BEGIN')
  try {
    for (const statement of statements) await client.query(statement)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
async function snapshot() {
  const output = {}
  const tables = (
    await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
    )
  ).rows
  for (const { tablename } of tables) {
    assert.match(tablename, /^[a-z_]+$/)
    output[tablename] = (
      await client.query(
        `SELECT to_jsonb(t) AS row FROM public.${tablename} t ORDER BY to_jsonb(t)::text`,
      )
    ).rows
  }
  output.journal = (
    await client.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')
  ).rows
  return output
}
async function rejects(label, mutation, errorPattern) {
  const before = await snapshot()
  await client.query('BEGIN')
  try {
    await client.query(mutation)
    await assert.rejects(client.query(body), errorPattern)
  } finally {
    await client.query('ROLLBACK')
  }
  assert.deepEqual(await snapshot(), before)
  cases.push(label)
  console.log(`PASS ${label}`)
}
await client.connect()
try {
  const {
    rows: [identity],
  } = await client.query(
    "SELECT current_user AS actor,current_database() AS db,current_setting('server_version_num')::int AS version",
  )
  assert.equal(identity.actor, 'technical_catalog_fixture')
  assert.equal(identity.db, 'neondb')
  assert.ok(identity.version >= 170000 && identity.version < 180000)
  assert.equal(
    (
      await client.query(
        "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname IN ('public','drizzle')",
      )
    ).rows[0].n,
    0,
    'Requires fresh disposable database; never cleans existing data',
  )
  await client.query('CREATE SCHEMA neon_auth')
  await run(buildAuthBaselinePayload().statements)
  await run(buildScopedUpgradePayload().statements)
  const rollout = JSON.parse(
    read('evidence/exact-costs-rollout-plan-2026-10-18.json'),
  )
  await run(rollout.statements)
  await client.query(
    "INSERT INTO categories(name) VALUES ('Insumos do workbook')",
  )
  const catalog = JSON.parse(
    read('evidence/technical-catalog-preflight-2026-10-18.json'),
  ).catalog
  for (const item of catalog)
    await client.query(
      'INSERT INTO products(sku,name,product_type,measurement_unit,is_active,category_id,sale_price) VALUES($1,$2,$3,$4,$5,1,$6)',
      [
        item.sku,
        item.name,
        item.product_type,
        item.unit,
        item.is_active,
        item.product_type === 'finished_product' ? '5.00' : null,
      ],
    )
  await client.query(
    "INSERT INTO historical_import_records(source_key,source_hash,entity_type,source_sheet,payload) VALUES('SYNTHETIC-PRESERVED',repeat('a',64),'fixture','fixture','{}')",
  )
  await client.query(
    "INSERT INTO operational_audit_events(action,entity_type,entity_id,reason) VALUES('synthetic.preserved','fixture','fixture','preserve fixture')",
  )
  await client.query(
    "INSERT INTO product_import_aliases(source_id,source_name,normalized_source_name,product_id,source_unit,quantity_multiplier) VALUES('synthetic-kg','Açúcar','açúcar',1,'kg',1000)",
  )
  await rejects(
    'SKU name conflict rejected',
    "UPDATE products SET name='Alterado' WHERE sku='INS001'",
    /TECH_CATALOG_CHANGED/,
  )
  await rejects(
    'unit conflict rejected',
    "UPDATE products SET measurement_unit='kg' WHERE sku='INS003'",
    /TECH_CATALOG_CHANGED/,
  )
  await rejects(
    'inactive catalog rejected',
    "UPDATE products SET is_active=false WHERE sku='PROD003'",
    /TECH_CATALOG_CHANGED/,
  )
  await rejects(
    'missing SKU rejected',
    "UPDATE products SET sku='WRONG' WHERE sku='INS013'",
    /TECH_CATALOG_CHANGED/,
  )
  await rejects(
    'new SKU / partial catalog rejected',
    "INSERT INTO products(sku,name,product_type,measurement_unit) VALUES('HIS-OVOS-GRANDES','Ovos Grandes','ingredient','unit')",
    /TECH_CATALOG_CHANGED/,
  )
  await rejects(
    'nonempty recipe / partial technical import rejected',
    "INSERT INTO recipe_versions(source_id,source_hash,name,version,source_payload) VALUES('partial',repeat('b',64),'partial',1,'{}')",
    /TECH_NONEMPTY_recipe_versions/,
  )
  await rejects(
    'consumed reference rejected',
    `INSERT INTO historical_import_records(source_key,source_hash,entity_type,source_sheet,payload) VALUES('${manifest.reference}',repeat('c',64),'fixture','fixture','{}')`,
    /TECH_REFERENCE_OR_HASH_CONSUMED/,
  )
  await rejects(
    'consumed hash under another reference rejected',
    `INSERT INTO historical_import_records(source_key,source_hash,entity_type,source_sheet,payload) VALUES('OTHER','${manifest.sourceHash}','fixture','fixture','{}')`,
    /TECH_REFERENCE_OR_HASH_CONSUMED/,
  )
  await rejects(
    'schema receipt drift rejected',
    "UPDATE drizzle.__drizzle_migrations SET hash=repeat('d',64) WHERE id=(SELECT max(id) FROM drizzle.__drizzle_migrations)",
    /TECH_SCHEMA_RECEIPTS_CHANGED/,
  )
  await rejects(
    'missing exact column rejected',
    'ALTER TABLE stock_movements RENAME COLUMN exact_cost TO fixture_missing_exact_cost',
    /TECH_EXACT_SCHEMA_REQUIRED/,
  )
  await rejects(
    'late receipt audit failure rolls back every new record',
    "ALTER TABLE operational_audit_events ADD CONSTRAINT technical_fixture_failure CHECK(entity_type <> 'historical_import_records')",
    /technical_fixture_failure/,
  )
  await rejects(
    'late preservation guard rejects changes to existing rows',
    `CREATE FUNCTION public.technical_fixture_mutate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE public.products SET description='corrupted' WHERE sku='INS001'; RETURN NEW; END $$; CREATE TRIGGER technical_fixture_mutate AFTER INSERT ON public.production_profile_components FOR EACH ROW EXECUTE FUNCTION public.technical_fixture_mutate()`,
    /TECH_EXISTING_ROWS_CHANGED/,
  )
  await rejects(
    'readback rejects silently changed recipe quantity',
    `CREATE FUNCTION public.technical_fixture_quantity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.quantity := 1; RETURN NEW; END $$; CREATE TRIGGER technical_fixture_quantity BEFORE INSERT ON public.recipe_items FOR EACH ROW EXECUTE FUNCTION public.technical_fixture_quantity()`,
    /TECH_INSERT_READBACK_recipe_items/,
  )
  await rejects(
    'final readback rejects late change to a newly inserted recipe',
    `CREATE FUNCTION public.technical_fixture_late_quantity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE public.recipe_items SET quantity=1; RETURN NEW; END $$; CREATE TRIGGER technical_fixture_late_quantity AFTER INSERT ON public.production_profile_components FOR EACH ROW EXECUTE FUNCTION public.technical_fixture_late_quantity()`,
    /TECH_INSERT_READBACK_recipe_items/,
  )
  const before = await snapshot()
  await client.query(sql)
  const after = await snapshot()
  for (const [table, rows] of Object.entries(before)) {
    const extra = manifest.additions[table] ?? 0
    assert.equal(after[table].length, rows.length + extra, table)
    for (const row of rows)
      assert.ok(
        after[table].some(
          (next) => JSON.stringify(next) === JSON.stringify(row),
        ),
        `${table}: original row preserved`,
      )
  }
  const items = (
    await client.query(
      'SELECT p.sku,r.source_name,r.quantity::text,r.unit,r.historical_cost,r.source_payload FROM recipe_items r JOIN products p ON p.id=r.product_id ORDER BY r.id',
    )
  ).rows
  const source = JSON.parse(
    read('evidence/technical-catalog-source-revalidated-2026-10-18.json'),
  )
  for (const [index, item] of source.recipe.items.entries()) {
    const actual = items[index]
    assert.equal(actual.sku, item.productSku)
    assert.equal(actual.source_name, item.sourceName)
    assert.equal(
      actual.quantity,
      `${item.quantity.includes('.') ? item.quantity.padEnd(item.quantity.indexOf('.') + 4, '0') : item.quantity + '.000'}`,
    )
    assert.equal(actual.unit, item.unit)
    assert.equal(actual.historical_cost, null)
    assert.deepEqual(actual.source_payload, item)
  }
  const profiles = (
    await client.query(
      'SELECT p.sku,r.expected_yield::text,r.source_payload FROM production_profiles r JOIN products p ON p.id=r.product_id ORDER BY p.sku',
    )
  ).rows
  for (const profile of profiles)
    assert.equal(
      profile.source_payload.operationallyComplete,
      !manifest.incompleteProfiles.includes(profile.sku),
    )
  const fillings = (
    await client.query(
      'SELECT r.quantity::text,count(*)::int AS n FROM production_profile_components r GROUP BY quantity ORDER BY quantity',
    )
  ).rows
  assert.deepEqual(fillings, [
    { quantity: '20.000', n: 6 },
    { quantity: '40.000', n: 6 },
  ])
  assert.deepEqual(
    (
      await client.query(
        'SELECT type,unit_amount::text,unit,effective_from::text FROM operational_cost_rates ORDER BY type',
      )
    ).rows,
    [
      {
        type: 'energy',
        unit_amount: '0.85',
        unit: 'kWh',
        effective_from: '2026-01-01',
      },
      {
        type: 'labor',
        unit_amount: '12.50',
        unit: 'hour',
        effective_from: '2026-01-01',
      },
    ],
  )
  assert.equal(
    (
      await client.query(
        'SELECT count(*)::int AS n FROM production_profiles WHERE packaging_product_id IS NOT NULL AND packaging_quantity=1',
      )
    ).rows[0].n,
    14,
  )
  cases.push(
    'success: complete technical catalog, 43 audits, 38 tables and journal preserved, no operational facts',
  )
  console.log(`PASS ${cases.at(-1)}`)
  await assert.rejects(client.query(sql), /TECH_REFERENCE_OR_HASH_CONSUMED/)
  await client.query('ROLLBACK')
  assert.deepEqual(await snapshot(), after)
  cases.push('replay rejected without duplicate or changed rows')
  console.log(`PASS ${cases.at(-1)}`)
  writeFileSync(
    new URL(
      '../evidence/technical-catalog-test-2026-10-18.json',
      import.meta.url,
    ),
    JSON.stringify(
      {
        mode: 'LOCAL_DISPOSABLE_POSTGRESQL_17',
        testedAt: new Date().toISOString(),
        sqlSha256: createHash('sha256').update(sql).digest('hex'),
        cases,
        passed: cases.length,
        publicTables: Object.keys(before).length - 1,
        preservedJournalReceipts: after.journal.length,
        externalWrites: false,
        limits: [
          'Synthetic fixtures; not a rehearsal of the real target backup',
          'Nontransactional sequences may advance on failed attempts',
          'No authenticated operational homologation',
        ],
      },
      null,
      2,
    ) + '\n',
  )
} finally {
  await client.end()
}
