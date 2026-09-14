import assert from 'node:assert/strict'
import test from 'node:test'

import {
  persistFinancialEventCorrection,
  persistFinancialPeriodClose,
} from '../src/features/finance/functions'
import { createLifecycleDrizzleMock } from './helpers/lifecycle-drizzle-mock'

function database(mock: ReturnType<typeof createLifecycleDrizzleMock>) {
  return mock.db
}

function writes(mock: ReturnType<typeof createLifecycleDrizzleMock>) {
  return mock.committed.map((entry) => `${entry.kind}:${entry.table}`)
}

test('fechamento manual congela snapshot exato e autoria na mesma transação', async () => {
  const mock = createLifecycleDrizzleMock({
    financialEvents: [
      {
        id: 1,
        type: 'revenue_correction',
        saleId: null,
        saleItemId: null,
        revenueEffect: '100.00',
        cashEffect: '75.00',
      },
      {
        id: 2,
        type: 'revenue_correction',
        saleId: null,
        saleItemId: null,
        revenueEffect: '-10.01',
        cashEffect: '-5.00',
      },
    ],
  })
  const result = await persistFinancialPeriodClose(
    database(mock),
    { periodMonth: '2026-09-01', notes: 'Conferência mensal concluída' },
    'owner-1',
  )
  assert.deepEqual(result.snapshot, {
    netRevenue: '89.99',
    cashFlow: '70.00',
    eventCount: 2,
    cogs: '0.00',
    grossMargin: '89.99',
    unattributedRevenue: '89.99',
    reconciled: true,
  })
  assert.deepEqual(writes(mock), [
    'insert:financialPeriods',
    'insert:operationalAudit',
  ])
  const period = mock.committed[0].values as {
    status: string
    closedByAuthUserId: string
    closureSnapshot: unknown
  }
  assert.equal(period.status, 'closed')
  assert.equal(period.closedByAuthUserId, 'owner-1')
  assert.deepEqual(period.closureSnapshot, result.snapshot)
})

test('correção do Dono preserva competência original e atualiza período fechado', async () => {
  const target = {
    id: 7,
    saleId: null,
    saleItemId: null,
    competenceDate: '2026-08-15',
    revenueEffect: '100.00',
    cashEffect: '0.00',
  }
  const mock = createLifecycleDrizzleMock(
    {},
    {
      financialEvents: [
        [target],
        [],
        [
          target,
          {
            id: 8,
            type: 'revenue_correction',
            saleId: null,
            saleItemId: null,
            revenueEffect: '-5.00',
            cashEffect: '0.00',
          },
        ],
        [
          target,
          {
            id: 8,
            type: 'revenue_correction',
            saleId: null,
            saleItemId: null,
            revenueEffect: '-5.00',
            cashEffect: '0.00',
          },
        ],
      ],
      financialPeriods: [
        [
          {
            id: 4,
            periodMonth: '2026-08-01',
            status: 'closed',
            version: 2,
          },
        ],
      ],
    },
  )
  const result = await persistFinancialEventCorrection(
    database(mock),
    {
      correctsEventId: 7,
      effect: 'revenue',
      deltaAmount: '-5.00',
      occurredOn: '2026-09-11',
      reason: 'Valor original informado a maior',
      reference: 'CORR-7-1',
    },
    { id: 'owner-1', role: 'owner' },
  )
  assert.equal(result.competenceDate, '2026-08-15')
  assert.deepEqual(writes(mock), [
    'insert:financialEvents',
    'update:financialPeriods',
    'insert:operationalAudit',
  ])
  const correction = mock.committed[0].values as {
    correctsEventId: number
    amount: string
    revenueEffect: string
    cashEffect: string
    competenceDate: string
  }
  assert.deepEqual(correction, {
    ...correction,
    correctsEventId: 7,
    amount: '-5.00',
    revenueEffect: '-5.00',
    cashEffect: '0.00',
    competenceDate: '2026-08-15',
  })
  const periodUpdate = mock.committed[1].values as {
    version: number
    closureSnapshot: unknown
  }
  assert.equal(periodUpdate.version, 3)
  assert.deepEqual(periodUpdate.closureSnapshot, {
    netRevenue: '95.00',
    cashFlow: '0.00',
    eventCount: 2,
    cogs: '0.00',
    grossMargin: '95.00',
    unattributedRevenue: '95.00',
    reconciled: true,
  })
})

test('papel diferente de Dono não corrige período fechado', async () => {
  const target = {
    id: 7,
    saleId: null,
    saleItemId: null,
    competenceDate: '2026-08-15',
    revenueEffect: '100.00',
    cashEffect: '0.00',
  }
  const mock = createLifecycleDrizzleMock(
    {},
    {
      financialEvents: [[target]],
      financialPeriods: [
        [
          {
            id: 4,
            periodMonth: '2026-08-01',
            status: 'closed',
            version: 2,
          },
        ],
      ],
    },
  )
  await assert.rejects(
    persistFinancialEventCorrection(
      database(mock),
      {
        correctsEventId: 7,
        effect: 'revenue',
        deltaAmount: '-5.00',
        occurredOn: '2026-09-11',
        reason: 'Tentativa não autorizada',
        reference: 'CORR-7-2',
      },
      { id: 'manager-1', role: 'manager' },
    ),
    /Somente o Dono/,
  )
  assert.equal(mock.committed.length, 0)
  assert.equal(mock.journal.at(-1)?.kind, 'rollback')
})

test('conflito otimista no snapshot fechado desfaz a correção inteira', async () => {
  const target = {
    id: 7,
    saleId: null,
    saleItemId: null,
    competenceDate: '2026-08-15',
    revenueEffect: '100.00',
    cashEffect: '0.00',
  }
  const mock = createLifecycleDrizzleMock(
    {},
    {
      financialEvents: [
        [target],
        [],
        [
          target,
          {
            id: 8,
            type: 'revenue_correction',
            saleId: null,
            saleItemId: null,
            revenueEffect: '-5.00',
            cashEffect: '0.00',
          },
        ],
        [
          target,
          {
            id: 8,
            type: 'revenue_correction',
            saleId: null,
            saleItemId: null,
            revenueEffect: '-5.00',
            cashEffect: '0.00',
          },
        ],
      ],
      financialPeriods: [
        [
          {
            id: 4,
            periodMonth: '2026-08-01',
            status: 'closed',
            version: 2,
          },
        ],
      ],
    },
  )
  mock.fail('returning:financialPeriods')

  await assert.rejects(
    persistFinancialEventCorrection(
      database(mock),
      {
        correctsEventId: 7,
        effect: 'revenue',
        deltaAmount: '-5.00',
        occurredOn: '2026-09-11',
        reason: 'Valor original informado a maior',
        reference: 'CORR-7-CONFLICT',
      },
      { id: 'owner-1', role: 'owner' },
    ),
    /O período mudou durante a correção/,
  )
  assert.equal(mock.committed.length, 0)
  assert.equal(mock.journal.at(-1)?.kind, 'rollback')
})
