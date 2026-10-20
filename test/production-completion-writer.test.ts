import { requireDefined } from '../src/lib/required-value'
import assert from 'node:assert/strict'
import test from 'node:test'
import { persistProductionBatchCompletion } from '../src/features/production/functions'
import { createProductionDrizzleMock } from './helpers/production-drizzle-mock'
import { moneyToCents } from '../src/features/production/calculations'
import { decimalCost, sumCosts, readExactCost } from '../src/lib/exact-cost'
import type { ExactCost } from '../src/lib/exact-cost'

const actorAuthUserId = 'auth-test-production'

function recordedCost(value: unknown): ExactCost {
  assert.ok(
    value &&
      typeof value === 'object' &&
      'numerator' in value &&
      'denominator' in value,
  )
  assert.equal(typeof value.numerator, 'string')
  assert.equal(typeof value.denominator, 'string')
  return readExactCost({
    numerator: String(value.numerator),
    denominator: String(value.denominator),
  })
}

for (const failAt of [
  undefined,
  'insert:inventory_cost_layers',
  'update:production_batches',
]) {
  test(`custo fracionário chega às saídas/FIFO e permanece atômico: ${failAt ?? 'sucesso'}`, async () => {
    const mock = createProductionDrizzleMock({
      recipeQuantity: '250.000',
      movements: [
        {
          quantityDelta: '1000.000',
          unitCost: '0.013',
          allocatedCost: '12.50',
          exactCost: decimalCost('12.50'),
        },
      ],
      ...(failAt ? { failAt } : {}),
    })
    if (failAt) {
      await assert.rejects(
        persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId),
      )
      assert.deepEqual(mock.committed, [])
      assert.equal(mock.batch.status, 'draft')
      return
    }
    await persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId)
    const consumption = requireDefined(
      mock.committed.find(
        (write) => write.table === 'production_batch_consumptions',
      ),
    ).values
    assert.deepEqual(
      recordedCost(requireDefined(consumption[0]).exactCost),
      decimalCost('3.125'),
    )
    const movements = mock.committed
      .filter((write) => write.table === 'stock_movements')
      .flatMap((write) => write.values)
    const consumed = requireDefined(
      movements.find(
        (movement) => movement.referenceType === 'production_consumption',
      ),
    )
    assert.deepEqual(recordedCost(consumed.exactCost), decimalCost('3.125'))
    const layers = requireDefined(
      mock.committed.find((write) => write.table === 'inventory_cost_layers'),
    ).values
    assert.deepEqual(
      sumCosts(layers.map((layer) => recordedCost(layer.exactOriginalCost))),
      decimalCost('6.125'),
    )
    assert.deepEqual(
      sumCosts(layers.map((layer) => recordedCost(layer.exactRemainingCost))),
      decimalCost('6.125'),
    )
  })
}

test('lote ausente aborta a transação antes de persistir consumo ou custos', async () => {
  const mock = createProductionDrizzleMock({ missingBatch: true })
  await assert.rejects(
    persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId),
    /Resultado obrigatório ausente/,
  )
  assert.deepEqual(mock.committed, [])
  assert.equal(mock.journal.at(-1)?.kind, 'rollback')
  assert.equal(
    mock.journal.some(
      (entry) => entry.kind === 'insert' || entry.kind === 'update',
    ),
    false,
  )
})

test('conclusão persiste consumo, custos, saídas e FIFO em uma única transação', async () => {
  const mock = createProductionDrizzleMock()
  assert.deepEqual(
    await persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId),
    {
      id: 1,
      totalCost: '5.00',
    },
  )
  assert.equal(mock.journal.filter((entry) => entry.kind === 'begin').length, 1)
  assert.equal(
    mock.journal.filter((entry) => entry.kind === 'commit').length,
    1,
  )
  assert.equal(mock.batch.status, 'completed')
  const locks = mock.journal.filter((entry) => entry.kind === 'lock')
  assert.equal(locks.length, 2)
  assert.match(
    requireDefined(locks[0]).sql ?? '',
    /production_batches.*for update/,
  )
  assert.match(
    requireDefined(locks[1]).sql ?? '',
    /products.*order by.*for update/,
  )
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
  const audit = requireDefined(mock.committed.at(-1))
  assert.equal(audit.table, 'operational_audit_events')
  assert.deepEqual(audit.values, [
    {
      actorAuthUserId,
      action: 'production_batch.complete',
      entityType: 'production_batch',
      entityId: '1',
      operationReference: 'production-batch:1:completion',
      reason: null,
    },
  ])
})

test('segunda conclusão do mesmo lote não cria efeitos adicionais', async () => {
  const mock = createProductionDrizzleMock()
  await persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId)
  const before = structuredClone(mock.committed)
  await assert.rejects(
    persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId),
    /rascunho/,
  )
  assert.deepEqual(mock.committed, before)
  assert.equal(mock.journal.at(-1)?.kind, 'rollback')
})

test('insumo insuficiente aborta antes de qualquer escrita do lote', async () => {
  const mock = createProductionDrizzleMock({ available: '0.999' })
  await assert.rejects(
    persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId),
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
  'insert:operational_audit_events',
]) {
  test(`falha posterior ${failAt} reverte todos os efeitos anteriores`, async () => {
    const mock = createProductionDrizzleMock({ failAt })
    await assert.rejects(
      persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId),
    )
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

for (const available of ['12.000', '11.999']) {
  test(`cobertura e adesivo têm consumo físico atômico: adesivos ${available}`, async () => {
    const mock = createProductionDrizzleMock({
      components: [
        {
          profileId: 1,
          productId: 20,
          sku: 'INS019',
          name: 'Cobertura',
          role: 'coating',
          quantityBasis: 'per_finished_unit',
          quantity: '50.000',
          unit: 'g',
          type: 'ingredient',
        },
        {
          profileId: 1,
          productId: 21,
          sku: 'INS006',
          name: 'Adesivo',
          role: 'packaging',
          quantityBasis: 'per_finished_unit',
          quantity: '1.000',
          unit: 'unit',
          type: 'packaging',
        },
      ],
      componentMovements: [
        {
          productId: 20,
          quantityDelta: '1000.000',
          unitCost: '0.040',
          allocatedCost: null,
        },
        {
          productId: 21,
          quantityDelta: available,
          unitCost: '0.160',
          allocatedCost: null,
        },
      ],
    })
    if (available === '11.999') {
      await assert.rejects(
        persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId),
        /Estoque insuficiente/,
      )
      assert.deepEqual(mock.committed, [])
      assert.equal(mock.batch.status, 'draft')
      assert.equal(mock.journal.at(-1)?.kind, 'rollback')
      return
    }
    await persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId)
    const consumed = mock.committed
      .filter((write) => write.table === 'production_batch_consumptions')
      .flatMap((write) => write.values)
    assert.equal(consumed.filter((item) => item.productId === 20).length, 1)
    assert.equal(consumed.filter((item) => item.productId === 21).length, 1)
    assert.equal(
      consumed.find((item) => item.productId === 20)?.quantity,
      '600.000',
    )
    assert.equal(
      consumed.find((item) => item.productId === 21)?.quantity,
      '12.000',
    )
    assert.deepEqual(
      recordedCost(
        requireDefined(consumed.find((item) => item.productId === 20))
          .exactCost,
      ),
      decimalCost('24.00'),
    )
    assert.deepEqual(
      recordedCost(
        requireDefined(consumed.find((item) => item.productId === 21))
          .exactCost,
      ),
      decimalCost('1.92'),
    )
    const layers = mock.committed
      .filter((write) => write.table === 'inventory_cost_layers')
      .flatMap((write) => write.values)
    assert.deepEqual(
      sumCosts(layers.map((layer) => recordedCost(layer.exactOriginalCost))),
      decimalCost('30.92'),
    )
    const before = structuredClone(mock.committed)
    await assert.rejects(
      persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId),
      /rascunho/,
    )
    assert.deepEqual(mock.committed, before)
  })
}

for (const invalid of ['type', 'basis', 'duplicate'] as const) {
  test(`componente inválido aborta sem escrita: ${invalid}`, async () => {
    const mock = createProductionDrizzleMock({
      ...(invalid === 'duplicate' ? { profilePackagingId: 21 } : {}),
      components: [
        {
          profileId: 1,
          productId: 21,
          sku: 'INS006',
          name: 'Adesivo',
          role: 'packaging',
          quantity: '1.000',
          unit: 'unit',
          type: invalid === 'type' ? 'ingredient' : 'packaging',
          quantityBasis:
            invalid === 'basis' ? 'per_recipe' : 'per_finished_unit',
        },
      ],
    })
    await assert.rejects(
      persistProductionBatchCompletion(mock.db, { id: 1 }, actorAuthUserId),
      /Componente de perfil inválido|por unidade pronta|duplicada/,
    )
    assert.deepEqual(mock.committed, [])
    assert.equal(mock.batch.status, 'draft')
    assert.equal(mock.journal.at(-1)?.kind, 'rollback')
  })
}
