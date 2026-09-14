import {
  financialEvents,
  financialPeriods,
  inventoryCostAllocations,
  inventoryCostLayers,
  inventoryCostReversals,
  operationalAuditEvents,
  saleItems,
  sales,
  stockMovements,
} from '../../src/db/schema'

type Rows = Record<string, Array<Record<string, unknown>>>
type SelectionResponses = Partial<
  Record<string, Array<Array<Record<string, unknown>>>>
>

export function createLifecycleDrizzleMock(
  input: Partial<Rows> = {},
  selectionResponses: SelectionResponses = {},
) {
  const rows: Rows = {
    sales: input.sales ?? [],
    saleItems: input.saleItems ?? [],
    allocations: input.allocations ?? [],
    layers: input.layers ?? [],
    reversals: input.reversals ?? [],
    movements: input.movements ?? [],
    financialEvents: input.financialEvents ?? [],
    financialPeriods: input.financialPeriods ?? [],
  }
  const journal: Array<{ kind: string; table?: string; values?: unknown }> = []
  const committed: Array<{
    kind: 'insert' | 'update'
    table: string
    values: unknown
  }> = []
  let pending: Array<{
    kind: 'insert' | 'update'
    table: string
    values: unknown
  }> = []
  let failAt: string | undefined
  let nextId = 100
  let executeCount = 0
  const name = (table: unknown) => {
    if (table === sales) return 'sales'
    if (table === saleItems) return 'saleItems'
    if (table === inventoryCostAllocations) return 'allocations'
    if (table === inventoryCostLayers) return 'layers'
    if (table === inventoryCostReversals) return 'reversals'
    if (table === stockMovements) return 'movements'
    if (table === operationalAuditEvents) return 'operationalAudit'
    if (table === financialEvents) return 'financialEvents'
    if (table === financialPeriods) return 'financialPeriods'
    return 'unknown'
  }
  const select = () => ({
    from(table: unknown) {
      const tableName = name(table)
      const values = selectionResponses[tableName]?.shift() ?? rows[tableName]
      const query = {
        where: () => query,
        orderBy: () => query,
        limit: () => query,
        then: (resolve: (value: typeof values) => unknown) => resolve(values),
      }
      return query
    },
  })
  const tx = {
    async execute(_query: { sql?: string }) {
      const kind = executeCount++ === 0 ? 'schema' : 'lock'
      journal.push({ kind })
      if (failAt === kind || failAt === 'execute')
        throw new Error(`forced ${kind} failure`)
      return {
        rows: [
          {
            lifecycle_table:
              failAt === 'schema-missing' ? null : 'inventory_cost_reversals',
            financial_events:
              failAt === 'finance-schema-missing' ? null : 'financial_events',
          },
        ],
      }
    },
    select,
    insert(table: unknown) {
      return {
        values(values: unknown) {
          journal.push({ kind: 'insert', table: name(table), values })
          if (failAt === `insert:${name(table)}` || failAt === name(table))
            throw new Error(`forced insert:${name(table)} failure`)
          pending.push({ kind: 'insert', table: name(table), values })
          return { returning: async () => [{ id: nextId++ }] }
        },
      }
    },
    update(table: unknown) {
      return {
        set(values: unknown) {
          journal.push({ kind: 'update', table: name(table), values })
          if (failAt === `update:${name(table)}` || failAt === name(table))
            throw new Error(`forced update:${name(table)} failure`)
          pending.push({ kind: 'update', table: name(table), values })
          return {
            where: () => ({
              returning: async () =>
                failAt === `returning:${name(table)}`
                  ? []
                  : [{ id: nextId++ }],
            }),
          }
        },
      }
    },
  }
  const db = {
    async transaction(work: (transaction: typeof tx) => Promise<unknown>) {
      journal.push({ kind: 'begin' })
      try {
        const result = await work(tx)
        committed.push(...pending)
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
  return {
    db,
    journal,
    rows,
    committed,
    fail(at: string) {
      failAt = at
    },
  }
}
