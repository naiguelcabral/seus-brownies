import { createServerFn } from '@tanstack/react-start'
import { getRequestHost } from '@tanstack/react-start/server'
import { sql } from 'drizzle-orm'

import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'

export const positiveAdjustmentG6Prefix = 'HML2-POS-G6-20260902'

export function assertFifoMigrationAuditOrigin(input: {
  nodeEnv: string | undefined
  host: string | undefined
}) {
  if (input.nodeEnv !== 'development')
    throw new Error('Auditoria FIFO disponível somente em development.')
  const hostname = input.host?.split(':')[0]
  if (hostname !== '127.0.0.1' && hostname !== 'localhost')
    throw new Error('Auditoria FIFO disponível somente no runtime local.')
}

export type AuditQueryState<T> =
  | { state: 'present'; value: T }
  | { state: 'absent' }
  | { state: 'query_error'; error: { code: string; object: string } }

type AuditCatalog = {
  migrationHistory: AuditQueryState<{ count: number | string }>
  schema: {
    inventory_cost_reversals: AuditQueryState<boolean>
    layerOrigins: AuditQueryState<unknown>
    allocationEvents: AuditQueryState<unknown>
    layerColumns: AuditQueryState<unknown>
    allocationColumns: AuditQueryState<unknown>
    reversalFks: AuditQueryState<number | string>
    reversalChecks: AuditQueryState<number | string>
    lifecycleIndexes: AuditQueryState<number | string>
    reversalKeys: AuditQueryState<number | string>
  }
}

function sanitizeAuditError(error: unknown, object: string) {
  const candidate =
    typeof error === 'object' && error !== null
      ? (error as { code?: unknown })
      : undefined
  const code =
    typeof candidate?.code === 'string' && /^[A-Z0-9_]+$/i.test(candidate.code)
      ? candidate.code
      : 'query_error'
  return { code, object }
}

/** Runs each probe in sequence so a failed read cannot hide another result. */
export async function readFifoMigrationAuditGroups<
  T extends Record<string, unknown>,
>(
  readers: { [K in keyof T]: () => Promise<T[K]> },
  absent: Partial<{ [K in keyof T]: (value: T[K]) => boolean }> = {},
): Promise<{ [K in keyof T]: AuditQueryState<T[K]> }> {
  const result = {} as { [K in keyof T]: AuditQueryState<T[K]> }
  for (const key of Object.keys(readers) as Array<keyof T>) {
    try {
      const value = await readers[key]()
      result[key] = absent[key]?.(value)
        ? { state: 'absent' }
        : { state: 'present', value }
    } catch (error) {
      result[key] = {
        state: 'query_error',
        error: sanitizeAuditError(error, String(key)),
      }
    }
  }
  return result
}

type DrizzleMigrationSchema = 'drizzle' | 'public'

export async function readDrizzleMigrationHistory<T>(input: {
  discover: () => Promise<Array<{ table_schema: string }>>
  readDrizzle: () => Promise<T>
  readPublic: () => Promise<T>
}): Promise<T | undefined> {
  const accessibleSchemas = new Set(
    (await input.discover()).map((row) => row.table_schema),
  )
  const schema: DrizzleMigrationSchema | undefined = ['drizzle', 'public'].find(
    (candidate): candidate is DrizzleMigrationSchema =>
      accessibleSchemas.has(candidate),
  )
  if (!schema) return undefined
  return schema === 'drizzle' ? input.readDrizzle() : input.readPublic()
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.map(String).sort() : []
}

function isExpectedList(value: unknown, expected: string[]) {
  return JSON.stringify(asList(value)) === JSON.stringify([...expected].sort())
}

function isPresent<T>(
  state: AuditQueryState<T>,
): state is { state: 'present'; value: T } {
  return state.state === 'present'
}

export function classifyFifoMigrationAudit(audit: AuditCatalog) {
  const { migrationHistory, schema } = audit
  if (!isPresent(migrationHistory)) return 'indeterminada' as const

  const schemaStates = Object.values(schema)
  const schemaApplied =
    isPresent(schema.inventory_cost_reversals) &&
    isPresent(schema.layerOrigins) &&
    isPresent(schema.allocationEvents) &&
    isPresent(schema.layerColumns) &&
    isPresent(schema.allocationColumns) &&
    isPresent(schema.reversalFks) &&
    isPresent(schema.reversalChecks) &&
    isPresent(schema.lifecycleIndexes) &&
    isPresent(schema.reversalKeys) &&
    schema.inventory_cost_reversals.value &&
    isExpectedList(schema.layerOrigins.value, [
      'production',
      'purchase',
      'adjustment',
    ]) &&
    isExpectedList(schema.allocationEvents.value, [
      'sale',
      'loss',
      'adjustment_negative',
    ]) &&
    isExpectedList(schema.layerColumns.value, ['origin']) &&
    isExpectedList(schema.allocationColumns.value, [
      'event_type',
      'event_reference_type',
      'event_reference_id',
    ]) &&
    Number(schema.reversalFks.value) === 2 &&
    Number(schema.reversalChecks.value) === 2 &&
    Number(schema.lifecycleIndexes.value) === 2 &&
    Number(schema.reversalKeys.value) === 2
  if (Number(migrationHistory.value.count) === 14 && schemaApplied)
    return 'aplicada' as const

  const schemaAbsent = schemaStates.every((part) => part.state === 'absent')
  if (Number(migrationHistory.value.count) === 13 && schemaAbsent)
    return 'não aplicada' as const
  return 'indeterminada' as const
}

function firstRow<T>(result: { rows: T[] } | T[]): T | undefined {
  if (Array.isArray(result)) return result[0]
  return result.rows[0]
}

type AuditScalar = string | number | boolean | null
type AuditRow = Record<string, AuditScalar>

/**
 * Temporary, parameterless GET-only bridge. A route is intentionally not
 * registered in this change, so this code cannot be reached until explicitly
 * authorized for the next audit attempt.
 */
export const getFifoMigrationAudit = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('getFifoMigrationAudit')])
  .handler(async () => {
    assertFifoMigrationAuditOrigin({
      nodeEnv: process.env.NODE_ENV,
      host: getRequestHost(),
    })
    const { getDb } = await import('#/db/index')
    const database = getDb()
    const catalog = await readFifoMigrationAuditGroups(
      {
        migrationHistory: async () =>
          (await readDrizzleMigrationHistory({
            discover: async () =>
              (
                await database.execute<{ table_schema: string }>(sql`
          select table_schema
          from information_schema.tables
          where table_name = '__drizzle_migrations'
            and table_schema in ('drizzle', 'public')
          order by case table_schema when 'drizzle' then 0 else 1 end
        `)
              ).rows,
            readDrizzle: async () =>
              firstRow(
                await database.execute<{
                  count: number
                  last_created_at: string | null
                }>(sql`
          select count(*)::int as count, max(created_at)::text as last_created_at
          from drizzle.__drizzle_migrations
        `),
              ),
            readPublic: async () =>
              firstRow(
                await database.execute<{
                  count: number
                  last_created_at: string | null
                }>(sql`
          select count(*)::int as count, max(created_at)::text as last_created_at
          from public.__drizzle_migrations
        `),
              ),
          })) ?? { count: 0, last_created_at: null },
        inventory_cost_reversals: async () =>
          Boolean(
            firstRow(
              await database.execute<{
                present: boolean
              }>(sql`
        select to_regclass('public.inventory_cost_reversals') is not null as present
      `),
            )?.present,
          ),
        layerOrigins: async () =>
          firstRow(
            await database.execute<{
              values: string[]
            }>(sql`
        select coalesce(json_agg(enumlabel order by enumlabel), '[]'::json) as values
        from pg_enum join pg_type on pg_type.oid = pg_enum.enumtypid
        where typname = 'inventory_cost_layer_origin'
      `),
          )?.values ?? [],
        allocationEvents: async () =>
          firstRow(
            await database.execute<{
              values: string[]
            }>(sql`
        select coalesce(json_agg(enumlabel order by enumlabel), '[]'::json) as values
        from pg_enum join pg_type on pg_type.oid = pg_enum.enumtypid
        where typname = 'inventory_cost_allocation_event_type'
      `),
          )?.values ?? [],
        layerColumns: async () =>
          firstRow(
            await database.execute<{
              values: string[]
            }>(sql`
        select coalesce(json_agg(column_name order by column_name), '[]'::json) as values
        from information_schema.columns
        where table_schema = 'public' and table_name = 'inventory_cost_layers' and column_name = 'origin'
      `),
          )?.values ?? [],
        allocationColumns: async () =>
          firstRow(
            await database.execute<{
              values: string[]
            }>(sql`
        select coalesce(json_agg(column_name order by column_name), '[]'::json) as values
        from information_schema.columns
        where table_schema = 'public' and table_name = 'inventory_cost_allocations'
          and column_name in ('event_type', 'event_reference_type', 'event_reference_id')
      `),
          )?.values ?? [],
        reversalFks: async () =>
          firstRow(
            await database.execute<{ value: number }>(sql`
        select count(*)::int as value from pg_constraint
        where conrelid = to_regclass('public.inventory_cost_reversals') and contype = 'f'
      `),
          )?.value ?? 0,
        reversalChecks: async () =>
          firstRow(
            await database.execute<{ value: number }>(sql`
        select count(*)::int as value from pg_constraint
        where conrelid = to_regclass('public.inventory_cost_reversals') and contype = 'c'
      `),
          )?.value ?? 0,
        lifecycleIndexes: async () =>
          firstRow(
            await database.execute<{ value: number }>(sql`
        select count(*)::int as value from pg_indexes
        where schemaname = 'public'
          and indexname in ('inventory_cost_reversals_reference_idx', 'inventory_cost_allocations_event_reference_idx')
      `),
          )?.value ?? 0,
        reversalKeys: async () =>
          firstRow(
            await database.execute<{ value: number }>(sql`
        select count(*)::int as value from pg_constraint
        where conrelid = to_regclass('public.inventory_cost_reversals') and contype in ('p', 'u')
      `),
          )?.value ?? 0,
      },
      {
        migrationHistory: (history) => history.count === 0,
        inventory_cost_reversals: (present) => !present,
        layerOrigins: (values) => asList(values).length === 0,
        allocationEvents: (values) => asList(values).length === 0,
        layerColumns: (values) => asList(values).length === 0,
        allocationColumns: (values) => asList(values).length === 0,
        reversalFks: (count) => Number(count) === 0,
        reversalChecks: (count) => Number(count) === 0,
        lifecycleIndexes: (count) => Number(count) === 0,
        reversalKeys: (count) => Number(count) === 0,
      },
    )
    const audit = {
      migrationHistory: catalog.migrationHistory,
      schema: {
        inventory_cost_reversals: catalog.inventory_cost_reversals,
        layerOrigins: catalog.layerOrigins,
        allocationEvents: catalog.allocationEvents,
        layerColumns: catalog.layerColumns,
        allocationColumns: catalog.allocationColumns,
        reversalFks: catalog.reversalFks,
        reversalChecks: catalog.reversalChecks,
        lifecycleIndexes: catalog.lifecycleIndexes,
        reversalKeys: catalog.reversalKeys,
      },
    }
    const facts = await readFifoMigrationAuditGroups({
      runtimeIdentity: async () =>
        firstRow(
          await database.execute<{
            database_name: string
            schema_name: string
            user_name: string
            search_path: string
          }>(sql`
        select current_database() as database_name,
          current_schema() as schema_name,
          current_user as user_name,
          current_setting('search_path') as search_path
      `),
        ),
      layers: async () =>
        firstRow(
          await database.execute<{ count: number }>(sql`
        select count(*)::int as count from public.inventory_cost_layers
      `),
        )?.count ?? 0,
      allocations: async () =>
        firstRow(
          await database.execute<{ count: number }>(sql`
        select count(*)::int as count from public.inventory_cost_allocations
      `),
        )?.count ?? 0,
      reversals: async () =>
        firstRow(
          await database.execute<{ count: number }>(sql`
        select count(*)::int as count from public.inventory_cost_reversals
      `),
        )?.count ?? 0,
      hmlLayers: async () =>
        (
          await database.execute<AuditRow>(sql`
        select id, product_id, original_quantity, original_cost, remaining_quantity, remaining_cost
        from public.inventory_cost_layers where id in (1, 2) order by id
      `)
        ).rows,
      hmlAllocations: async () =>
        (
          await database.execute<AuditRow>(sql`
        select id, inventory_cost_layer_id, outgoing_stock_movement_id, sale_item_id, quantity, allocated_cost
        from public.inventory_cost_allocations where id in (1, 2) order by id
      `)
        ).rows,
      hmlSales: async () =>
        (
          await database.execute<AuditRow>(sql`
        select id, status, subtotal_amount, total_amount, affects_stock
        from public.sales where id in (1, 2) order by id
      `)
        ).rows,
      hmlBatch: async () =>
        (
          await database.execute<AuditRow>(sql`
        select id, status, actual_quantity, total_cost, unit_cost
        from public.production_batches where id = 18
      `)
        ).rows,
      positiveAdjustmentPrefix: async () =>
        (
          await database.execute<AuditRow>(sql`
        select id, product_id, source_key, reference_type
        from public.stock_movements
        where source_key like ${`fifo-lifecycle:adjustment-positive:%:${positiveAdjustmentG6Prefix}`}
        order by id
      `)
        ).rows,
      positiveAdjustmentDetails: async () =>
        (
          await database.execute<AuditRow>(sql`
        select movement.id as movement_id, movement.product_id, movement.quantity_delta,
          movement.allocated_cost, movement.source_key, movement.reference_type, movement.notes,
          layer.id as layer_id, layer.origin, layer.original_quantity, layer.original_cost,
          layer.remaining_quantity, layer.remaining_cost
        from public.stock_movements movement
        join public.inventory_cost_layers layer on layer.source_stock_movement_id = movement.id
        where movement.source_key like ${`fifo-lifecycle:adjustment-positive:%:${positiveAdjustmentG6Prefix}`}
        order by movement.id
      `)
        ).rows,
      positiveAdjustmentProducts: async () =>
        (
          await database.execute<AuditRow>(sql`
        select p.id, p.sku, p.name, p.product_type, p.measurement_unit,
          count(l.id)::int as fifo_layer_count
        from public.products p
        left join public.inventory_cost_layers l on l.product_id = p.id
        where p.is_active = true
        group by p.id, p.sku, p.name, p.product_type, p.measurement_unit
        order by p.id
      `)
        ).rows,
    })
    return {
      ...audit,
      runtimeIdentity: facts.runtimeIdentity,
      fifoCounts: {
        layers: facts.layers,
        allocations: facts.allocations,
        reversals: facts.reversals,
      },
      hmlInvariants: {
        layers: facts.hmlLayers,
        allocations: facts.hmlAllocations,
        sales: facts.hmlSales,
        batch: facts.hmlBatch,
      },
      g6PositiveAdjustment: {
        prefix: positiveAdjustmentG6Prefix,
        existingMovements: facts.positiveAdjustmentPrefix,
        details: facts.positiveAdjustmentDetails,
        activeProducts: facts.positiveAdjustmentProducts,
      },
      classification: classifyFifoMigrationAudit(audit),
    }
  })
