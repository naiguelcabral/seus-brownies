import { operationalAuditEvents } from '#/db/schema'

export type OperationalAuditEvent = {
  actorAuthUserId?: string | null
  action: string
  entityType: string
  entityId: number | string
  operationReference?: string | null
  reason?: string | null
}

/**
 * Append inside the business transaction. A persistence failure must abort the
 * mutation so callers never receive success without its required audit fact.
 */
export async function appendOperationalAudit(
  transaction: {
    insert: (table: typeof operationalAuditEvents) => {
      values: (
        value: typeof operationalAuditEvents.$inferInsert,
      ) => Promise<unknown>
    }
  },
  event: OperationalAuditEvent,
) {
  await transaction.insert(operationalAuditEvents).values({
    actorAuthUserId: event.actorAuthUserId ?? null,
    action: event.action,
    entityType: event.entityType,
    entityId: String(event.entityId),
    operationReference: event.operationReference ?? null,
    reason: event.reason?.trim() || null,
  })
}
