import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, withDatabaseScope } from '#/db/index'
import { appUserAccess, messageProcessingRecords } from '#/db/schema'
import { handleWahaWebhook } from './waha-webhook.server'
import { allowWahaRequest } from './waha-budget.server'
import type { WahaDependencies } from './waha-webhook.server'

const storedSchema = z.object({
  actor: z.string(),
  fingerprint: z.string(),
  text: z.string(),
})

export async function receiveWahaWebhook(
  request: Request,
  allowRequest = allowWahaRequest,
): Promise<Response> {
  return withDatabaseScope(async () => {
    const deps: WahaDependencies = {
      allowRequest: () => allowRequest(request, process.env),
      async isActiveUser(id) {
        const [row] = await getDb()
          .select({ active: appUserAccess.isActive })
          .from(appUserAccess)
          .where(eq(appUserAccess.authUserId, id))
          .limit(1)
        return row?.active === true
      },
      async record(message) {
        const payload = {
          actor: message.actor,
          fingerprint: message.fingerprint,
          text: message.text,
        }
        return getDb().transaction(async (tx) => {
          // Serialize the acceptance with deactivation of the linked Cacau user.
          const [access] = await tx
            .select({ active: appUserAccess.isActive })
            .from(appUserAccess)
            .where(eq(appUserAccess.authUserId, message.actor))
            .for('update')
          if (access?.active !== true) return 'denied'
          const inserted = await tx
            .insert(messageProcessingRecords)
            .values({
              providerMessageId: message.id,
              status: 'received',
              payload,
            })
            .onConflictDoNothing({
              target: messageProcessingRecords.providerMessageId,
            })
            .returning({ id: messageProcessingRecords.id })
          if (inserted.length === 1) return 'new'
          const [prior] = await tx
            .select({ payload: messageProcessingRecords.payload })
            .from(messageProcessingRecords)
            .where(eq(messageProcessingRecords.providerMessageId, message.id))
            .limit(1)
          const parsed = storedSchema.safeParse(prior?.payload)
          return parsed.success &&
            parsed.data.fingerprint === message.fingerprint &&
            parsed.data.actor === message.actor
            ? 'duplicate'
            : 'conflict'
        })
      },
    }
    try {
      return await handleWahaWebhook(request, process.env, deps)
    } catch {
      return Response.json(
        { state: 'unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }
  })
}
