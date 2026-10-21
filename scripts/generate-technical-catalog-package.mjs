// Explicit offline artifact generation; never applies SQL.
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { buildTechnicalCatalogPayload } from './technical-catalog-payload.mjs'

assert.deepEqual(process.argv.slice(2), ['--write-review-package'])
const { sql, manifest } = buildTechnicalCatalogPayload()
writeFileSync(
  new URL(
    '../evidence/technical-catalog-apply-2026-10-18.sql',
    import.meta.url,
  ),
  sql,
)
writeFileSync(
  new URL(
    '../evidence/technical-catalog-package-2026-10-18.json',
    import.meta.url,
  ),
  JSON.stringify(manifest, null, 2) + '\n',
)
console.log(JSON.stringify(manifest))
