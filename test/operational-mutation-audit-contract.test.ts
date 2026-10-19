import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('CRUD de catálogo registra ator e auditoria na mesma transação', async () => {
  const catalog = await source('../src/features/catalog/functions.ts')

  for (const action of [
    'category.create',
    'category.update',
    'category.activate',
    'category.deactivate',
    'product.create',
    'product.update',
    'product.activate',
    'product.deactivate',
  ]) {
    assert.match(catalog, new RegExp(`['"]${action}['"]`))
  }
  assert.equal(
    (catalog.match(/\.transaction\(async \(tx\) =>/g) ?? []).length,
    6,
  )
  assert.equal(
    (catalog.match(/actorAuthUserId: context\.principal!\.id/g) ?? []).length,
    6,
  )
  assert.equal(
    (catalog.match(/await appendOperationalAudit\(tx,/g) ?? []).length,
    6,
  )
})

test('criação e conclusão de produção registram autoria operacional', async () => {
  const production = await source('../src/features/production/functions.ts')

  assert.match(production, /action: 'production_batch\.create'/)
  assert.match(production, /action: 'production_batch\.complete'/)
  assert.match(
    production,
    /persistProductionBatchCompletion\([\s\S]*context\.principal!\.id/,
  )
  assert.equal(
    (production.match(/await appendOperationalAudit\(tx,/g) ?? []).length,
    2,
  )
})

test('demais domínios mutáveis mantêm trilha operacional ou histórico versionado', async () => {
  const domains = await Promise.all([
    source('../src/features/action-plans/functions.ts'),
    source('../src/features/finance/functions.ts'),
    source('../src/features/inventory/lifecycle-writers.ts'),
    source('../src/features/locations/functions.ts'),
    source('../src/features/management/functions.ts'),
    source('../src/features/operations/functions.ts'),
    source('../src/features/scenarios/functions.ts'),
  ])

  for (const domain of domains) {
    assert.match(domain, /appendOperationalAudit/)
    assert.match(domain, /context\.principal!\.id|actorAuthUserId/)
    assert.match(domain, /\.transaction\(async \(tx/)
  }
})
