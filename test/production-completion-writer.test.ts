import assert from 'node:assert/strict'
import test from 'node:test'
import { persistProductionBatchCompletion } from '../src/features/production/functions'
import { createProductionDrizzleMock } from './helpers/production-drizzle-mock'
import { moneyToCents } from '../src/features/production/calculations'

test('conclusão persiste consumo, custos, saídas e FIFO em uma única transação', async () => {
  const mock = createProductionDrizzleMock()
  assert.deepEqual(await persistProductionBatchCompletion(mock.db, { id: 1 }), {
    id: 1,
    totalCost: '5.00',
  })
  assert.equal(mock.journal.filter((entry) => entry.kind === 'begin').length, 1)
  assert.equal(
    mock.journal.filter((entry) => entry.kind === 'commit').length,
    1,
  )
  assert.equal(mock.batch.status, 'completed')
  const locks = mock.journal.filter((entry) => entry.kind === 'lock')
  assert.equal(locks.length, 2)
  assert.match(locks[0].sql ?? '', /production_batches.*for update/)
  assert.match(locks[1].sql ?? '', /products.*order by.*for update/)
  const layers = mock.committed.find(
    (entry) => entry.table === 'inventory_cost_layers',
  )!.values
  assert.equal(layers.length, 2)
  assert.equal(
    layers.reduce(
      (sum, layer) => sum + moneyToCents(String(layer.originalCost))!,
      0n,
    ),
    500n,
  )
  assert.deepEqual(
    layers.map((layer) => layer.productionBatchOutputId),
    [11, 12],
  )
  assert.deepEqual(
    layers.map((layer) => layer.originalQuantity),
    ['12.000', '6.000'],
  )
  assert.equal(
    mock.committed.some((entry) => entry.table === 'production_batch_losses'),
    false,
  )
  assert.equal(mock.committed.at(-1)?.table, 'production_batches')
})

test('segunda conclusão do mesmo lote não cria efeitos adicionais', async () => {
  const mock = createProductionDrizzleMock()
  await persistProductionBatchCompletion(mock.db, { id: 1 })
  const before = structuredClone(mock.committed)
  await assert.rejects(
    persistProductionBatchCompletion(mock.db, { id: 1 }),
    /rascunho/,
  )
  assert.deepEqual(mock.committed, before)
  assert.equal(mock.journal.at(-1)?.kind, 'rollback')
})

test('insumo insuficiente aborta antes de qualquer escrita do lote', async () => {
  const mock = createProductionDrizzleMock({ available: '0.999' })
  await assert.rejects(
    persistProductionBatchCompletion(mock.db, { id: 1 }),
    /Estoque insuficiente/,
  )
  assert.equal(mock.committed.length, 0)
  assert.equal(
    mock.journal.some(
      (entry) => entry.kind === 'insert' || entry.kind === 'update',
    ),
    false,
  )
  assert.equal(mock.batch.status, 'draft')
})

for (const failAt of [
  'insert:operational_costs',
  'insert:inventory_cost_layers',
  'update:production_batches',
  'returning:production_batch_outputs',
]) {
  test(`falha posterior ${failAt} reverte todos os efeitos anteriores`, async () => {
    const mock = createProductionDrizzleMock({ failAt })
    await assert.rejects(persistProductionBatchCompletion(mock.db, { id: 1 }))
    assert.equal(
      mock.journal.some((entry) => entry.kind === 'insert'),
      true,
    )
    assert.equal(mock.journal.at(-1)?.kind, 'rollback')
    assert.equal(
      mock.journal.some((entry) => entry.kind === 'commit'),
      false,
    )
    assert.equal(mock.committed.length, 0)
    assert.equal(mock.batch.status, 'draft')
  })
}
