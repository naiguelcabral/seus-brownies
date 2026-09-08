import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('migration torna as chaves idempotentes únicas e preserva dados legados', async () => {
  const migration = await readFile(
    new URL('../drizzle/0017_orange_the_hand.sql', import.meta.url),
    'utf8',
  )

  for (const table of ['purchases', 'sales', 'expenses']) {
    assert.match(
      migration,
      new RegExp(`${table}_idempotency_key_unique.*UNIQUE`),
    )
  }
  assert.doesNotMatch(migration, /idempotency_key[^;]*NOT NULL/i)
  assert.doesNotMatch(migration, /DROP|TRUNCATE|DELETE FROM/i)
})

test('criações reservam a chave antes dos efeitos e registram o ator do servidor', async () => {
  const source = await readFile(
    new URL('../src/features/operations/functions.ts', import.meta.url),
    'utf8',
  )

  assert.equal(
    (source.match(/idempotencyKey: z\.string\(\)\.uuid\(\)/g) ?? []).length,
    3,
  )
  assert.equal((source.match(/\.onConflictDoNothing\(/g) ?? []).length, 3)
  assert.equal(
    (source.match(/createdByAuthUserId: context\.principal!\.id/g) ?? [])
      .length,
    3,
  )
  assert.equal(
    (source.match(/await appendOperationalAudit\(tx,/g) ?? []).length,
    3,
  )
  assert.doesNotMatch(source, /purchaseMovements\.find/)
  assert.match(
    source,
    /for \(const \[index, item\] of normalizedItems\.entries\(\)\)/,
  )
  assert.match(source, /referenceType: 'purchase_item'/)
  assert.match(source, /referenceId: purchaseItem\.id/)
})

test('migration cria trilha operacional indexada e sem mutação destrutiva', async () => {
  const migration = await readFile(
    new URL('../drizzle/0018_bouncy_odin.sql', import.meta.url),
    'utf8',
  )

  assert.match(migration, /CREATE TABLE "operational_audit_events"/)
  assert.match(migration, /"actor_auth_user_id" varchar\(191\)/)
  assert.match(migration, /"operation_reference" varchar\(160\)/)
  assert.match(migration, /operational_audit_events_entity_idx/)
  assert.doesNotMatch(migration, /DROP|TRUNCATE|DELETE FROM/i)
})

test('escrita revalida atividade e tipo do produto selecionado', async () => {
  const source = await readFile(
    new URL('../src/features/operations/functions.ts', import.meta.url),
    'utf8',
  )

  assert.match(
    source,
    /selectedProducts\.some\(\(product\) => !product\.isActive\)/,
  )
  assert.match(source, /product\.type !== 'finished_product'/)
})

test('migration bloqueia mudança estrutural inclusive diante de corrida', async () => {
  const migration = await readFile(
    new URL('../drizzle/0017_orange_the_hand.sql', import.meta.url),
    'utf8',
  )

  assert.match(migration, /BEFORE UPDATE OF "product_type", "unit"/)
  assert.match(migration, /IS DISTINCT FROM/)
  assert.match(migration, /stock_movements/)
  assert.match(migration, /recipe_items/)
  assert.match(migration, /production_batch_outputs/)
  assert.match(migration, /ERRCODE = '23514'/)
})
