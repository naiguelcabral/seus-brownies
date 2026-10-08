import { getTableName } from 'drizzle-orm'
import type { SQL, Table } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { persistProductionBatchCompletion } from '../../src/features/production/functions'

type Write = {
  kind: 'insert' | 'update'
  table: string
  values: Record<string, unknown>[]
}
export function createProductionDrizzleMock(
  options: {
    available?: string
    status?: string
    failAt?: string
  } = {},
) {
  const batch = {
    id: 1,
    status: options.status ?? 'draft',
    recipeVersionId: 1,
    plannedFor: '2026-10-08',
    recipeMultiplier: '1.000',
    sourcePayload: {},
    notes: null,
  }
  const rows: Record<string, Record<string, unknown>[]> = {
    production_batches: [batch],
    production_batch_outputs: [
      { id: 11, productId: 3, plannedQuantity: '12.000', role: 'primary' },
      { id: 12, productId: 2, plannedQuantity: '6.000', role: 'co_product' },
    ],
    production_batch_losses: [],
    recipe_versions: [{ id: 1, name: 'Base', status: 'active', version: 1 }],
    production_profiles: [
      {
        id: 1,
        expectedYield: '24.000',
        productId: 3,
        productSku: 'PROD003',
        productName: 'Brownie',
        productUnit: 'unit',
        productType: 'finished_product',
        packagingId: null,
      },
      {
        id: 2,
        expectedYield: '12.000',
        productId: 2,
        productSku: 'PROD002',
        productName: 'Bordinhas',
        productUnit: 'unit',
        productType: 'finished_product',
        packagingId: null,
      },
    ],
    recipe_items: [
      {
        recipeItemId: 1,
        id: 10,
        productId: 10,
        quantity: '1.000',
        sku: 'ING001',
        name: 'Chocolate',
        unit: 'kg',
        type: 'ingredient',
      },
    ],
    production_profile_components: [],
    recipe_operational_requirements: [
      { type: 'energy', quantity: '1.000', unit: 'kwh' },
      { type: 'labor', quantity: '1.000', unit: 'hour' },
    ],
    operational_cost_rates: [
      {
        id: 1,
        type: 'energy',
        unitAmount: '1.00',
        effectiveFrom: '2026-10-01',
      },
      { id: 2, type: 'labor', unitAmount: '2.00', effectiveFrom: '2026-10-01' },
    ],
    stock_movements: [
      {
        productId: 10,
        quantityDelta: options.available ?? '10.000',
        unitCost: '2.000',
        allocatedCost: null,
      },
    ],
  }
  const journal: Array<{ kind: string; table?: string; sql?: string }> = []
  const committed: Write[] = []
  let pending: Write[] = []
  let nextId = 100
  const dialect = new PgDialect()
  const tx = {
    async execute(query: SQL) {
      journal.push({ kind: 'lock', sql: dialect.sqlToQuery(query).sql })
      return { rows: [] }
    },
    select() {
      return {
        from(table: Table) {
          const name = getTableName(table)
          if (!(name in rows)) throw new Error(`Unexpected selection: ${name}`)
          const query = {
            innerJoin: () => query,
            leftJoin: () => query,
            where: () => query,
            orderBy: () => query,
            then: (resolve: (value: Record<string, unknown>[]) => unknown) =>
              resolve(rows[name]),
          }
          return query
        },
      }
    },
    insert(table: Table) {
      const name = getTableName(table)
      return {
        values(input: Record<string, unknown> | Record<string, unknown>[]) {
          journal.push({ kind: 'insert', table: name })
          if (options.failAt === `insert:${name}`)
            throw new Error(`forced insert:${name}`)
          const values = Array.isArray(input) ? input : [input]
          pending.push({ kind: 'insert', table: name, values })
          return {
            returning: async () =>
              values.map((value) => ({ ...value, id: nextId++ })),
          }
        },
      }
    },
    update(table: Table) {
      const name = getTableName(table)
      return {
        set(values: Record<string, unknown>) {
          journal.push({ kind: 'update', table: name })
          if (options.failAt === `update:${name}`)
            throw new Error(`forced update:${name}`)
          return {
            where(predicate: SQL) {
              const params = dialect.sqlToQuery(predicate).params
              const target =
                name === 'production_batch_outputs'
                  ? rows[name].find((row) => row.productId === params[1])
                  : batch
              if (!target) throw new Error('Unexpected update target')
              pending.push({
                kind: 'update',
                table: name,
                values: [{ ...values, id: target.id }],
              })
              return {
                returning: async () =>
                  options.failAt === `returning:${name}`
                    ? []
                    : [{ ...target, ...values }],
              }
            },
          }
        },
      }
    },
  }
  const adapter = {
    async transaction<T>(work: (transaction: typeof tx) => Promise<T>) {
      journal.push({ kind: 'begin' })
      try {
        const result = await work(tx)
        committed.push(...pending)
        for (const write of pending)
          if (write.kind === 'update' && write.table === 'production_batches')
            Object.assign(batch, write.values[0])
        pending = []
        journal.push({ kind: 'commit' })
        return result
      } catch (error) {
        pending = []
        journal.push({ kind: 'rollback' })
        throw error
      }
    },
  }
  // Drizzle has adapter-private generics. Only this test boundary substitutes them.
  const db = adapter as unknown as Parameters<
    typeof persistProductionBatchCompletion
  >[0]
  return { db, journal, committed, batch }
}
