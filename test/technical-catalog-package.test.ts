import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const compilerPath = '../scripts/technical-catalog-payload.mjs'
const { buildTechnicalCatalogPayload } = await import(compilerPath)

test('technical catalog review artifact matches its offline compiler and published digest', () => {
  const { sql, manifest } = buildTechnicalCatalogPayload()
  assert.equal(
    sql,
    readFileSync('evidence/technical-catalog-apply-2026-10-18.sql', 'utf8'),
  )
  assert.deepEqual(
    manifest,
    JSON.parse(
      readFileSync(
        'evidence/technical-catalog-package-2026-10-18.json',
        'utf8',
      ),
    ),
  )
  assert.equal(
    createHash('sha256').update(sql).digest('hex'),
    manifest.sqlSha256,
  )
  assert.equal(manifest.externalWrites, false)
})

test('technical catalog scope excludes operational writes, migration changes and historical cost projections', () => {
  const { sql } = buildTechnicalCatalogPayload()
  const targets = [...sql.matchAll(/INSERT INTO public\.([a-z_]+)/g)].map(
    (match) => match[1],
  )
  assert.deepEqual([...new Set(targets)].sort(), [
    'historical_import_records',
    'operational_audit_events',
    'operational_cost_rates',
    'production_profile_components',
    'production_profiles',
    'products',
    'recipe_items',
    'recipe_operational_requirements',
    'recipe_versions',
  ])
  assert.doesNotMatch(
    sql,
    /(?:UPDATE|DELETE FROM|ALTER TABLE|TRUNCATE) public\./,
  )
  assert.doesNotMatch(sql, /INSERT INTO drizzle\./)
  assert.doesNotMatch(
    sql,
    /INSERT INTO public\.recipe_(?:items|operational_requirements)\([^)]*historical_cost/,
  )
})
