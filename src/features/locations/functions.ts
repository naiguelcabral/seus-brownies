import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, ilike } from 'drizzle-orm'
import { z } from 'zod'

import { salesLocations } from '#/db/schema'
import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'
import { appendOperationalAudit } from '#/features/operations/audit'
import {
  calculateSalesLocationPage,
  salesLocationPageSize,
} from '#/features/locations/pagination'

export const salesLocationClassifications = [
  'unclassified',
  'physical',
  'online',
  'event',
  'partner',
] as const

const locationShape = z.object({
  name: z.string().trim().min(2).max(120),
  classification: z.enum(salesLocationClassifications),
  frequency: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1_000).optional(),
})

const locationFilters = z.object({
  query: z.string().trim().max(100).optional(),
  classification: z.enum(salesLocationClassifications).optional(),
  activity: z.enum(['active', 'inactive']).optional(),
  page: z.number().int().min(1).max(10_000).default(1),
})

function optionalText(value?: string) {
  return value?.trim() || null
}

function throwReadableLocationError(error: unknown): never {
  if (
    typeof error === 'object' &&
    error &&
    'code' in error &&
    error.code === '23505'
  ) {
    throw new Error('Já existe um local ou canal com esse nome.')
  }
  throw error
}

export const listSalesLocations = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('listSalesLocations')])
  .validator(locationFilters)
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')
    const database = getDb()
    const filters = and(
      data.query ? ilike(salesLocations.name, `%${data.query}%`) : undefined,
      data.classification
        ? eq(salesLocations.classification, data.classification)
        : undefined,
      data.activity
        ? eq(salesLocations.isActive, data.activity === 'active')
        : undefined,
    )
    const [{ total }] = await database
      .select({ total: count() })
      .from(salesLocations)
      .where(filters)
    const pagination = calculateSalesLocationPage(data.page, Number(total))
    const rows = await database
      .select()
      .from(salesLocations)
      .where(filters)
      .orderBy(asc(salesLocations.name), asc(salesLocations.id))
      .limit(salesLocationPageSize)
      .offset(pagination.offset)
    return { locations: rows, total: Number(total), ...pagination }
  })

export const listActiveSalesLocations = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('listActiveSalesLocations')])
  .handler(async () => {
    const { getDb } = await import('#/db/index')
    return getDb()
      .select({
        id: salesLocations.id,
        name: salesLocations.name,
        classification: salesLocations.classification,
      })
      .from(salesLocations)
      .where(eq(salesLocations.isActive, true))
      .orderBy(asc(salesLocations.name), asc(salesLocations.id))
  })

export const createSalesLocation = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('createSalesLocation')])
  .validator(locationShape)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    try {
      return await getDb().transaction(async (tx) => {
        const created = (
          await tx
            .insert(salesLocations)
            .values({
              name: data.name,
              classification: data.classification,
              frequency: optionalText(data.frequency),
              notes: optionalText(data.notes),
            })
            .returning({ id: salesLocations.id })
        ).at(0)
        if (!created) throw new Error('Não foi possível criar o local.')
        await appendOperationalAudit(tx, {
          actorAuthUserId: context.principal!.id,
          action: 'sales_location.create',
          entityType: 'sales_location',
          entityId: created.id,
        })
        return created
      })
    } catch (error) {
      throwReadableLocationError(error)
    }
  })

export const updateSalesLocation = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('updateSalesLocation')])
  .validator(locationShape.extend({ id: z.number().int().positive() }))
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    try {
      return await getDb().transaction(async (tx) => {
        const updated = (
          await tx
            .update(salesLocations)
            .set({
              name: data.name,
              classification: data.classification,
              frequency: optionalText(data.frequency),
              notes: optionalText(data.notes),
              updatedAt: new Date(),
            })
            .where(eq(salesLocations.id, data.id))
            .returning({ id: salesLocations.id })
        ).at(0)
        if (!updated) throw new Error('Local ou canal não encontrado.')
        await appendOperationalAudit(tx, {
          actorAuthUserId: context.principal!.id,
          action: 'sales_location.update',
          entityType: 'sales_location',
          entityId: updated.id,
        })
        return updated
      })
    } catch (error) {
      throwReadableLocationError(error)
    }
  })

export const setSalesLocationActive = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('setSalesLocationActive')])
  .validator(
    z.object({ id: z.number().int().positive(), isActive: z.boolean() }),
  )
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      const updated = (
        await tx
          .update(salesLocations)
          .set({ isActive: data.isActive, updatedAt: new Date() })
          .where(eq(salesLocations.id, data.id))
          .returning({ id: salesLocations.id })
      ).at(0)
      if (!updated) throw new Error('Local ou canal não encontrado.')
      await appendOperationalAudit(tx, {
        actorAuthUserId: context.principal!.id,
        action: data.isActive
          ? 'sales_location.activate'
          : 'sales_location.deactivate',
        entityType: 'sales_location',
        entityId: updated.id,
      })
      return updated
    })
  })
