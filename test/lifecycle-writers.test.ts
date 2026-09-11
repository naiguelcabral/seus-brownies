import assert from 'node:assert/strict'
import test from 'node:test'

import {
  FifoLifecycleSchemaUnavailableError,
  lifecycleLockOrder,
  persistNegativeInventoryEvent,
  persistPositiveInventoryAdjustment,
  persistSaleCancellation,
  persistSaleReturn,
  runLifecycleWriter,
} from '../src/features/inventory/lifecycle-writers'
import { createLifecycleDrizzleMock } from './helpers/lifecycle-drizzle-mock'

const base = () =>
  createLifecycleDrizzleMock({
    sales: [
      {
        id: 1,
        status: 'confirmed',
        deliveredAt: null,
        totalAmount: '10.00',
        soldAt: new Date('2026-09-01T12:00:00Z'),
      },
    ],
    saleItems: [
      {
        id: 2,
        saleId: 1,
        productId: 3,
        quantity: '2.000',
        totalAmount: '10.00',
        reportedAmount: '10.00',
      },
    ],
    allocations: [
      {
        id: 4,
        inventoryCostLayerId: 5,
        productId: 3,
        quantity: '2.000',
        allocatedCost: '7.56',
      },
    ],
    layers: [
      {
        id: 5,
        productId: 3,
        productionBatchOutputId: null,
        sourceStockMovementId: 8,
        origin: 'production',
        availableAt: new Date('2026-01-01T00:00:00Z'),
        originalQuantity: '12.000',
        originalCost: '45.33',
        remainingQuantity: '10.000',
        remainingCost: '37.77',
      },
    ],
  })

const database = (mock: ReturnType<typeof base>) => mock.db
const mutations = (mock: ReturnType<typeof base>) =>
  mock.journal.filter(
    (entry) => entry.kind === 'insert' || entry.kind === 'update',
  )
const assertRolledBack = (mock: ReturnType<typeof base>) => {
  assert.equal(mock.journal.at(-1)?.kind, 'rollback')
  assert.equal(
    mock.journal.some((entry) => entry.kind === 'commit'),
    false,
  )
  assert.equal(mock.committed.length, 0)
}

test('writer usa uma transação e faz rollback propagando erro', async () => {
  const calls: string[] = []
  await assert.rejects(
    runLifecycleWriter(
      async (work) => {
        calls.push('begin')
        return work()
      },
      async () => {
        calls.push('write')
        throw new Error('falha')
      },
    ),
    /falha/,
  )
  assert.deepEqual(calls, ['begin', 'write'])
})

test('schema 0013 ausente falha antes de qualquer nova escrita', async () => {
  await assert.rejects(
    runLifecycleWriter(
      async () => {
        const error = Object.assign(new Error('missing'), { code: '42P01' })
        throw error
      },
      async () => 'write',
    ),
    FifoLifecycleSchemaUnavailableError,
  )
})

test('locks de produto têm ordem global determinística', () => {
  assert.deepEqual(lifecycleLockOrder([9, 2, 9, 1, 2]), [1, 2, 9])
})

test('transação não confirma quando uma escrita posterior falha', async () => {
  const calls: string[] = []
  await assert.rejects(
    runLifecycleWriter(
      async (work) => {
        calls.push('begin')
        try {
          return await work()
        } catch (error) {
          calls.push('rollback')
          throw error
        }
      },
      async () => {
        calls.push('movement')
        throw new Error('allocation failed')
      },
    ),
    /allocation failed/,
  )
  assert.deepEqual(calls, ['begin', 'movement', 'rollback'])
})

test('cancelamento grava retorno/reversão e restaura camada sem editar a alocação original', async () => {
  const mock = base()
  await persistSaleCancellation(database(mock), {
    saleId: 1,
    reason: 'Cliente desistiu',
  })
  assert.equal(mock.journal[1].kind, 'schema')
  assert.equal(mock.journal.filter((entry) => entry.kind === 'lock').length, 4)
  assert.deepEqual(
    mutations(mock).map((entry) => `${entry.kind}:${entry.table}`),
    [
      'insert:movements',
      'insert:reversals',
      'update:layers',
      'update:sales',
      'insert:operationalAudit',
    ],
  )
  assert.equal(
    (
      mock.journal.find((entry) => entry.table === 'layers')?.values as {
        remainingQuantity: string
      }
    ).remainingQuantity,
    '12.000',
  )
})

test('cancelamento após entrega falha antes de restaurar estoque ou alterar venda', async () => {
  const mock = base()
  mock.rows.sales[0].deliveredAt = new Date('2026-09-10T12:00:00Z')
  await assert.rejects(
    persistSaleCancellation(database(mock), {
      saleId: 1,
      reason: 'Tentativa após entrega',
    }),
    /Venda entregue deve usar devolução/,
  )
  assertRolledBack(mock)
})

test('devolução pós-entrega registra compensação sem restaurar alimento ou CMV', async () => {
  const mock = base()
  mock.rows.sales[0].deliveredAt = new Date('2026-09-10T12:00:00Z')
  await persistSaleReturn(
    database(mock),
    {
      saleItemId: 2,
      quantity: '1.000',
      settlement: 'refund',
      occurredOn: '2026-09-11',
      reason: 'Produto devolvido',
      reference: 'RMA-1',
    },
    'manager-1',
  )
  assert.deepEqual(
    mutations(mock).map((entry) => `${entry.kind}:${entry.table}`),
    ['insert:financialEvents', 'insert:operationalAudit'],
  )
  assert.equal(
    mock.journal.some((entry) => entry.table === 'movements'),
    false,
  )
  assert.equal(mock.rows.allocations[0].allocatedCost, '7.56')
})

test('perda multicamada cria um movimento e alocações por camada na ordem FIFO', async () => {
  const mock = base()
  mock.rows.layers.push({
    id: 6,
    productId: 3,
    productionBatchOutputId: null,
    sourceStockMovementId: 9,
    origin: 'purchase',
    availableAt: new Date('2026-02-01T00:00:00Z'),
    originalQuantity: '3.000',
    originalCost: '12.00',
    remainingQuantity: '3.000',
    remainingCost: '12.00',
  })
  await persistNegativeInventoryEvent(
    database(mock),
    {
      productId: 3,
      quantity: '12.000',
      reason: 'Quebra no transporte',
      reference: 'LOSS-1',
    },
    'loss',
  )
  const allocation = mock.journal.find((entry) => entry.table === 'allocations')
    ?.values as Array<unknown>
  assert.equal(allocation.length, 2)
  assert.equal(mock.journal.at(-1)?.kind, 'commit')
})

test('ajuste negativo idempotente aborta antes de nova mutação', async () => {
  const mock = base()
  mock.rows.movements.push({ id: 90 })
  await assert.rejects(
    persistNegativeInventoryEvent(
      database(mock),
      {
        productId: 3,
        quantity: '1.000',
        reason: 'Contagem física',
        reference: 'ADJ-1',
      },
      'adjustment_negative',
    ),
    /já registrado/,
  )
  assert.equal(mutations(mock).length, 0)
  assert.equal(mock.journal.at(-1)?.kind, 'rollback')
})

test('ajuste positivo exige origem/custo e cria movimento seguido da camada', async () => {
  const mock = base()
  await persistPositiveInventoryAdjustment(database(mock), {
    productId: 3,
    quantity: '1.000',
    totalCost: '0.05',
    reason: 'Inventário inicial',
    reference: 'POS-1',
    originReference: 'NF-1',
  })
  assert.deepEqual(
    mutations(mock).map((entry) => `${entry.kind}:${entry.table}`),
    ['insert:movements', 'insert:layers', 'insert:operationalAudit'],
  )
  assert.equal(
    (
      mock.journal.find((entry) => entry.table === 'layers')?.values as {
        originalCost: string
      }
    ).originalCost,
    '0.05',
  )
})

test('schema ausente aborta antes de insert ou update de writer', async () => {
  const mock = base()
  mock.fail('schema-missing')
  await assert.rejects(
    persistPositiveInventoryAdjustment(database(mock), {
      productId: 3,
      quantity: '1.000',
      totalCost: '1.00',
      reason: 'Inventário inicial',
      reference: 'POS-2',
      originReference: 'NF-2',
    }),
    FifoLifecycleSchemaUnavailableError,
  )
  assert.equal(mutations(mock).length, 0)
  assert.equal(mock.journal.at(-1)?.kind, 'rollback')
})

const rollbackCases = [
  {
    name: 'cancelamento',
    stages: [
      'schema',
      'lock',
      'movements',
      'reversals',
      'layers',
      'sales',
      'operationalAudit',
    ],
    write: (mock: ReturnType<typeof base>) =>
      persistSaleCancellation(database(mock), {
        saleId: 1,
        reason: 'Cancelamento testado',
      }),
  },
  {
    name: 'devolução',
    stages: ['schema', 'lock', 'financialEvents', 'operationalAudit'],
    write: (mock: ReturnType<typeof base>) => {
      mock.rows.sales[0].deliveredAt = new Date('2026-09-10T12:00:00Z')
      return persistSaleReturn(
        database(mock),
        {
          saleItemId: 2,
          quantity: '1.000',
          settlement: 'store_credit',
          occurredOn: '2026-09-11',
          reason: 'Devolução testada',
          reference: 'RMA-rollback',
        },
        'manager-1',
      )
    },
  },
  {
    name: 'perda',
    stages: [
      'schema',
      'lock',
      'movements',
      'allocations',
      'layers',
      'operationalAudit',
    ],
    write: (mock: ReturnType<typeof base>) =>
      persistNegativeInventoryEvent(
        database(mock),
        {
          productId: 3,
          quantity: '1.000',
          reason: 'Perda testada',
          reference: 'LOSS-rollback',
        },
        'loss',
      ),
  },
  {
    name: 'ajuste negativo',
    stages: [
      'schema',
      'lock',
      'movements',
      'allocations',
      'layers',
      'operationalAudit',
    ],
    write: (mock: ReturnType<typeof base>) =>
      persistNegativeInventoryEvent(
        database(mock),
        {
          productId: 3,
          quantity: '1.000',
          reason: 'Ajuste testado',
          reference: 'NEG-rollback',
        },
        'adjustment_negative',
      ),
  },
  {
    name: 'ajuste positivo',
    stages: ['schema', 'lock', 'movements', 'layers', 'operationalAudit'],
    write: (mock: ReturnType<typeof base>) =>
      persistPositiveInventoryAdjustment(database(mock), {
        productId: 3,
        quantity: '1.000',
        totalCost: '0.05',
        reason: 'Ajuste testado',
        reference: 'POS-rollback',
        originReference: 'NF-rollback',
      }),
  },
]

for (const scenario of rollbackCases) {
  for (const stage of scenario.stages) {
    test(`${scenario.name}: falha em ${stage} desfaz todas as mutations pendentes`, async () => {
      const mock = base()
      const originalAllocation = structuredClone(mock.rows.allocations)
      mock.fail(stage)
      await assert.rejects(
        scenario.write(mock),
        new RegExp(
          `forced (?:${stage}|insert:${stage}|update:${stage}) failure|FIFO fase 2`,
        ),
      )
      assertRolledBack(mock)
      assert.deepEqual(mock.rows.allocations, originalAllocation)
    })
  }
}

test('cancelamento repetido falha sem criar novo fato', async () => {
  const mock = base()
  mock.rows.movements.push({ id: 91 })
  await assert.rejects(
    persistSaleCancellation(database(mock), {
      saleId: 1,
      reason: 'Cancelamento repetido',
    }),
    /já registrado/,
  )
  assertRolledBack(mock)
})

for (const event of ['loss', 'adjustment_negative'] as const) {
  test(`${event} repetido com sourceKey falha sem mutation`, async () => {
    const mock = base()
    mock.rows.movements.push({ id: 93 })
    await assert.rejects(
      persistNegativeInventoryEvent(
        database(mock),
        {
          productId: 3,
          quantity: '1.000',
          reason: 'Evento repetido',
          reference: 'same-key',
        },
        event,
      ),
      /já registrado/,
    )
    assertRolledBack(mock)
  })
}

test('ajuste positivo repetido com referência igual falha sem nova camada', async () => {
  const mock = base()
  mock.rows.movements.push({ id: 94 })
  await assert.rejects(
    persistPositiveInventoryAdjustment(database(mock), {
      productId: 3,
      quantity: '1.000',
      totalCost: '1.00',
      reason: 'Ajuste repetido',
      reference: 'POS-same',
      originReference: 'NF-same',
    }),
    /já registrado/,
  )
  assertRolledBack(mock)
})
