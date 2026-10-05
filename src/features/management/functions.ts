import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { managementSettings } from '#/db/schema'
import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'
import { appendOperationalAudit } from '#/features/operations/audit'
import {
  managementSettingsValues,
  normalizeManagementSettings,
} from '#/features/management/settings'

const singletonId = 1

export const getManagementSettings = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('getManagementSettings')])
  .handler(async () => {
    const { getDb } = await import('#/db/index')
    const row = (
      await getDb()
        .select()
        .from(managementSettings)
        .where(eq(managementSettings.id, singletonId))
        .limit(1)
    ).at(0)
    if (!row)
      throw new Error(
        'Parâmetros gerenciais indisponíveis. Revise a migration pendente.',
      )
    return row
  })

export const updateManagementSettings = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('updateManagementSettings')])
  .validator(
    managementSettingsValues.and(
      z.object({ expectedVersion: z.number().int().positive() }),
    ),
  )
  .handler(async ({ data, context }) => {
    const normalized = normalizeManagementSettings(data)
    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      const updated = (
        await tx
          .update(managementSettings)
          .set({
            ...normalized,
            version: data.expectedVersion + 1,
            updatedByAuthUserId: context.principal!.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(managementSettings.id, singletonId),
              eq(managementSettings.version, data.expectedVersion),
            ),
          )
          .returning({
            id: managementSettings.id,
            version: managementSettings.version,
          })
      ).at(0)
      if (!updated)
        throw new Error(
          'Os parâmetros foram alterados por outra sessão. Recarregue antes de salvar.',
        )
      await appendOperationalAudit(tx, {
        actorAuthUserId: context.principal!.id,
        action: 'management_settings.update',
        entityType: 'management_settings',
        entityId: singletonId,
        operationReference: `management-settings:version:${updated.version}`,
        reason: `Versão ${data.expectedVersion} substituída pela versão ${updated.version}.`,
      })
      return updated
    })
  })
