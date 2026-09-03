import { getDb } from '#/db/index'
import { authAuditEvents } from '#/db/schema'

import { createAuthAuditEvent } from './audit'
import type { AuthAuditInput } from './audit'

export type AuthAuditWriter = {
  append: (input: AuthAuditInput) => Promise<void>
}

/** Persists only the allowlisted audit contract; it never receives credentials. */
export function createDatabaseAuthAuditWriter(): AuthAuditWriter {
  return {
    append: async (input) => {
      const event = createAuthAuditEvent(input)
      await getDb().insert(authAuditEvents).values(event)
    },
  }
}
