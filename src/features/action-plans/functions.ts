import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm'
import { z } from 'zod'

import { actionPlanHistory, actionPlans } from '#/db/schema'
import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'
import { appendOperationalAudit } from '#/features/operations/audit'
import {
  actionPlanPageSize,
  calculateActionPlanPage,
} from '#/features/action-plans/pagination'

export const actionPlanPriorities = [
  'low',
  'medium',
  'high',
  'critical',
] as const
export const actionPlanStatuses = [
  'open',
  'in_progress',
  'completed',
  'cancelled',
] as const

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional()

const actionPlanValues = z.object({
  alert: z.string().trim().min(2).max(1_000),
  probableCause: optionalText(2_000),
  action: z.string().trim().min(2).max(2_000),
  priority: z.enum(actionPlanPriorities),
  kpi: optionalText(160),
  responsible: optionalText(160),
  dueDate: z.string().date().optional(),
  status: z.enum(actionPlanStatuses),
})

const filters = z.object({
  query: z.string().trim().max(100).optional(),
  priority: z.enum(actionPlanPriorities).optional(),
  status: z.enum(actionPlanStatuses).optional(),
  page: z.number().int().min(1).max(10_000).default(1),
})

function emptyToNull(value?: string) {
  return value?.trim() || null
}

function snapshot(data: z.infer<typeof actionPlanValues>) {
  return {
    alert: data.alert,
    probableCause: emptyToNull(data.probableCause),
    action: data.action,
    priority: data.priority,
    kpi: emptyToNull(data.kpi),
    responsible: emptyToNull(data.responsible),
    dueDate: data.dueDate || null,
    status: data.status,
  }
}

export const listActionPlans = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('listActionPlans')])
  .validator(filters)
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')
    const database = getDb()
    const where = and(
      data.query
        ? or(
            ilike(actionPlans.alert, `%${data.query}%`),
            ilike(actionPlans.action, `%${data.query}%`),
            ilike(actionPlans.kpi, `%${data.query}%`),
            ilike(actionPlans.responsible, `%${data.query}%`),
          )
        : undefined,
      data.priority ? eq(actionPlans.priority, data.priority) : undefined,
      data.status ? eq(actionPlans.status, data.status) : undefined,
    )
    const [{ total }] = await database
      .select({ total: count() })
      .from(actionPlans)
      .where(where)
    const pagination = calculateActionPlanPage(data.page, Number(total))
    const rows = await database
      .select()
      .from(actionPlans)
      .where(where)
      .orderBy(
        asc(actionPlans.status),
        asc(actionPlans.dueDate),
        desc(actionPlans.id),
      )
      .limit(actionPlanPageSize)
      .offset(pagination.offset)
    return { actionPlans: rows, total: Number(total), ...pagination }
  })

export const createActionPlan = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('createActionPlan')])
  .validator(actionPlanValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      const actor = context.principal!.id
      const values = snapshot(data)
      const created = (
        await tx
          .insert(actionPlans)
          .values({
            ...values,
            createdByAuthUserId: actor,
            updatedByAuthUserId: actor,
          })
          .returning({ id: actionPlans.id, version: actionPlans.version })
      ).at(0)
      if (!created) throw new Error('Não foi possível criar a ação.')
      await tx.insert(actionPlanHistory).values({
        actionPlanId: created.id,
        version: created.version,
        event: 'created',
        actorAuthUserId: actor,
        snapshot: values,
      })
      await appendOperationalAudit(tx, {
        actorAuthUserId: actor,
        action: 'action_plan.create',
        entityType: 'action_plan',
        entityId: created.id,
      })
      return created
    })
  })

export const updateActionPlan = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('updateActionPlan')])
  .validator(
    actionPlanValues.and(
      z.object({
        id: z.number().int().positive(),
        expectedVersion: z.number().int().positive(),
      }),
    ),
  )
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      const actor = context.principal!.id
      const values = snapshot(data)
      const updated = (
        await tx
          .update(actionPlans)
          .set({
            ...values,
            version: data.expectedVersion + 1,
            updatedByAuthUserId: actor,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(actionPlans.id, data.id),
              eq(actionPlans.version, data.expectedVersion),
            ),
          )
          .returning({ id: actionPlans.id, version: actionPlans.version })
      ).at(0)
      if (!updated)
        throw new Error(
          'A ação foi alterada por outra sessão ou não existe. Recarregue antes de salvar.',
        )
      await tx.insert(actionPlanHistory).values({
        actionPlanId: updated.id,
        version: updated.version,
        event: 'updated',
        actorAuthUserId: actor,
        snapshot: values,
      })
      await appendOperationalAudit(tx, {
        actorAuthUserId: actor,
        action: 'action_plan.update',
        entityType: 'action_plan',
        entityId: updated.id,
        reason: `Versão ${data.expectedVersion} substituída pela versão ${updated.version}.`,
      })
      return updated
    })
  })
