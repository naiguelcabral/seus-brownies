import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertFifoMigrationAuditOrigin,
  classifyFifoMigrationAudit,
  readDrizzleMigrationHistory,
  readFifoMigrationAuditGroups,
} from '../src/features/inventory/fifo-migration-audit'

test('guarda da auditoria aceita somente development em host loopback', () => {
  assert.doesNotThrow(() => assertFifoMigrationAuditOrigin({ nodeEnv: 'development', host: '127.0.0.1:4173' }))
  assert.doesNotThrow(() => assertFifoMigrationAuditOrigin({ nodeEnv: 'development', host: 'localhost:4173' }))
})

test('guarda da auditoria bloqueia host externo e ambiente não-development', () => {
  assert.throws(() => assertFifoMigrationAuditOrigin({ nodeEnv: 'development', host: 'example.test' }), /runtime local/)
  assert.throws(() => assertFifoMigrationAuditOrigin({ nodeEnv: 'production', host: '127.0.0.1' }), /development/)
})

const present = <T>(value: T) => ({ state: 'present' as const, value })
const absent = { state: 'absent' as const }
const appliedSchema = {
  inventory_cost_reversals: present(true),
  layerOrigins: present(['adjustment', 'production', 'purchase']),
  allocationEvents: present(['adjustment_negative', 'loss', 'sale']),
  layerColumns: present(['origin']),
  allocationColumns: present(['event_reference_id', 'event_reference_type', 'event_type']),
  reversalFks: present(2), reversalChecks: present(2), lifecycleIndexes: present(2), reversalKeys: present(2),
}

test('classificação depende apenas de dados do catálogo, sem APIs Node no runtime', () => {
  assert.equal(classifyFifoMigrationAudit({ migrationHistory: present({ count: 14 }), schema: appliedSchema }), 'aplicada')
  assert.equal(classifyFifoMigrationAudit({ migrationHistory: present({ count: 13 }), schema: {
    inventory_cost_reversals: absent, layerOrigins: absent, allocationEvents: absent, layerColumns: absent,
    allocationColumns: absent, reversalFks: absent, reversalChecks: absent, lifecycleIndexes: absent, reversalKeys: absent,
  } }), 'não aplicada')
  assert.equal(classifyFifoMigrationAudit({ migrationHistory: present({ count: 14 }), schema: {
    ...appliedSchema, reversalChecks: present(1),
  } }), 'indeterminada')
})

test('tabela lifecycle ausente não impede a leitura do histórico Drizzle', async () => {
  const audit = await readFifoMigrationAuditGroups({
    migrationHistory: async () => ({ count: 13 }),
    inventory_cost_reversals: async () => {
      const error = Object.assign(new Error('relation missing'), { code: '42P01' })
      throw error
    },
    layerOrigins: async () => [],
  }, {
    layerOrigins: (values) => values.length === 0,
  })

  assert.deepEqual(audit.migrationHistory, present({ count: 13 }))
  assert.deepEqual(audit.inventory_cost_reversals, {
    state: 'query_error', error: { code: '42P01', object: 'inventory_cost_reversals' },
  })
  assert.deepEqual(audit.layerOrigins, absent)
})

test('histórico Drizzle usa o schema drizzle descoberto pelo catálogo', async () => {
  const history = await readDrizzleMigrationHistory({
    discover: async () => [{ table_schema: 'drizzle' }],
    readDrizzle: async () => ({ count: 14 }),
    readPublic: async () => { throw new Error('public não deveria ser consultado') },
  })
  assert.deepEqual(history, { count: 14 })
})

test('histórico Drizzle usa public quando este é o schema acessível', async () => {
  const history = await readDrizzleMigrationHistory({
    discover: async () => [{ table_schema: 'public' }],
    readDrizzle: async () => { throw new Error('drizzle não deveria ser consultado') },
    readPublic: async () => ({ count: 13 }),
  })
  assert.deepEqual(history, { count: 13 })
})

test('histórico ausente é distinto de falha de permissão ou consulta', async () => {
  const absentHistory = await readDrizzleMigrationHistory({
    discover: async () => [],
    readDrizzle: async () => ({ count: 0 }),
    readPublic: async () => ({ count: 0 }),
  })
  assert.equal(absentHistory, undefined)

  const audit = await readFifoMigrationAuditGroups({
    migrationHistory: async () => readDrizzleMigrationHistory({
      discover: async () => [{ table_schema: 'drizzle' }],
      readDrizzle: async () => {
        throw Object.assign(new Error('permission denied'), { code: '42501' })
      },
      readPublic: async () => ({ count: 0 }),
    }),
  }, { migrationHistory: (history) => history === undefined })
  assert.deepEqual(audit.migrationHistory, {
    state: 'query_error', error: { code: '42501', object: 'migrationHistory' },
  })
})
