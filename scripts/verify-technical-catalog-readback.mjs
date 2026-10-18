import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (f) => JSON.parse(readFileSync(f, 'utf8'))
const evidence = read(process.argv[2])
const a = evidence.actual
const source = read(
  'evidence/technical-catalog-source-revalidated-2026-10-18.json',
)
const candidate = read('evidence/technical-catalog-candidate-2026-10-18.json')
const manifest = read('evidence/technical-catalog-package-2026-10-18.json')
const n = (v) =>
  String(v).includes('.')
    ? String(v).replace(/0+$/, '').replace(/\.$/, '')
    : String(v)
assert.deepEqual(
  evidence.preserved,
  evidence.before,
  'All old rows and journal must be unchanged',
)
assert.deepEqual(
  evidence.schemaAfter,
  evidence.schemaBefore,
  'All schema sections must be unchanged',
)
assert.deepEqual(a.egg, {
  sku: 'HIS-OVOS-GRANDES',
  name: 'Ovos Grandes',
  type: 'ingredient',
  unit: 'unit',
  isActive: true,
  salePrice: null,
})
assert.deepEqual(a.recipe, {
  externalId: source.recipe.externalId,
  sourceHash: source.recipe.sourceHash,
  name: source.recipe.name,
  version: 1,
  status: 'active',
  source: source.recipe.source,
})
assert.equal(a.items.length, 7)
for (const item of source.recipe.items) {
  const row = a.items.find((x) => x.sourceName === item.sourceName)
  assert.ok(row)
  assert.equal(row.sku, item.productSku)
  assert.equal(n(row.quantity), item.quantity)
  assert.equal(row.unit, item.unit)
  assert.equal(row.historicalCost, null)
  assert.deepEqual(row.sourcePayload, item)
}
assert.equal(a.requirements.length, 2)
for (const item of source.recipe.operational) {
  const row = a.requirements.find((x) => x.type === item.type)
  assert.ok(row)
  assert.equal(n(row.quantity), item.quantity)
  assert.equal(row.unit, item.unit)
  assert.equal(row.historicalCost, null)
  assert.deepEqual(row.sourcePayload, item)
}
assert.equal(a.rates.length, 2)
for (const rate of source.rates)
  assert.deepEqual(
    a.rates.find((x) => x.sourceId === rate.sourceId),
    {
      sourceId: rate.sourceId,
      sourceHash: rate.sourceHash,
      type: rate.type,
      unit: rate.unit,
      unitAmount: rate.unitAmount,
      effectiveFrom: rate.effectiveFrom,
      source: rate.source,
    },
  )
assert.equal(a.profiles.length, 17)
for (const p of candidate.profiles) {
  const row = a.profiles.find((x) => x.sku === p.productSku)
  const original = source.profiles.find((x) => x.productSku === p.productSku)
  assert.ok(row && original)
  assert.equal(row.sourceId, original.sourceId)
  assert.equal(row.sourceHash, original.sourceHash)
  assert.equal(row.recipe, source.recipe.externalId)
  assert.equal(row.cutSize, p.cutSize)
  assert.equal(row.filling, p.filling)
  assert.equal(n(row.expectedYield), p.expectedYield)
  assert.equal(row.packagingSku, p.packagingSku)
  assert.equal(
    row.packagingQuantity === null ? null : n(row.packagingQuantity),
    p.packagingQuantity,
  )
  assert.deepEqual(row.sourcePayload, {
    ...original.source,
    operationallyComplete: p.operationallyComplete,
    limitation: p.operationallyComplete
      ? null
      : 'Embalagem/cobertura pendentes; perfil de referencia sem homologacao operacional.',
  })
}
assert.equal(a.components.length, 12)
for (const c of candidate.profileAdditionalComponents) {
  const row = a.components.find((x) => x.sourceId === c.sourceId)
  assert.ok(row)
  assert.equal(row.productSku, c.productSku)
  assert.equal(row.fillingSku, c.fillingProductSku)
  assert.equal(row.role, c.role)
  assert.equal(n(row.quantity), c.quantity)
  assert.equal(row.unit, c.unit)
  assert.equal(row.quantityBasis, c.quantityBasis)
  assert.deepEqual(row.sourcePayload, c)
}
assert.equal(a.receipt.reference, manifest.reference)
assert.equal(a.receipt.sourceHash, manifest.sourceHash)
assert.equal(a.receipt.entityType, 'technical_catalog')
assert.deepEqual(a.receipt.payload.candidate, candidate)
assert.deepEqual(a.receipt.payload.source, source)
assert.equal(a.audit.length, 43)
assert.equal(a.auditEntityMatches, 43)
for (const event of a.audit) {
  assert.equal(event.reference, manifest.reference)
  assert.equal(event.actor, null)
  assert.equal(event.action, 'technical.catalog.create')
  assert.ok(event.reason)
}
for (const table of evidence.before) {
  if (table.name.startsWith('drizzle.')) continue
  assert.equal(
    a.counts[table.name],
    Number(table.rows) + (manifest.additions[table.name] ?? 0),
    table.name,
  )
}
console.log(
  'PASS independent readback: eggs, recipe, 7 physical lines, 2 requirements, 2 rates, 17 profiles, 14 packaging links, 12 fillings, receipt/hash, 43 entity audits, preservation of all old rows and schema, zero operational facts',
)
