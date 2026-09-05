import { eq, sql } from 'drizzle-orm'

import { getDb } from '#/db/index'
import { authLoginAttempts } from '#/db/schema'

import {
  decideLoginAttempt,
  maxConsecutiveLoginFailures,
} from './login-security'
import type { LoginAttemptState } from './login-security'

const loginCooldownMs = 15 * 60 * 1000

export type LoginAttemptStore = {
  read: (identityHash: string) => Promise<LoginAttemptState | null>
  record: (identityHash: string, succeeded: boolean) => Promise<void>
}

/** Stores only a keyed identity hash; raw e-mail and credentials never reach it. */
export function createDatabaseLoginAttemptStore(): LoginAttemptStore {
  return {
    read: async (identityHash) => {
      const attempts = await getDb()
        .select({
          consecutiveFailures: authLoginAttempts.consecutiveFailures,
          cooldownUntil: authLoginAttempts.cooldownUntil,
        })
        .from(authLoginAttempts)
        .where(eq(authLoginAttempts.identityHash, identityHash))
        .limit(1)
      return attempts.length > 0 ? attempts[0] : null
    },
    record: async (identityHash, succeeded) => {
      if (succeeded) {
        await getDb()
          .update(authLoginAttempts)
          .set({
            consecutiveFailures: 0,
            cooldownUntil: null,
            lastAttemptAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(authLoginAttempts.identityHash, identityHash))
        return
      }

      await getDb()
        .insert(authLoginAttempts)
        .values({ identityHash, consecutiveFailures: 1 })
        .onConflictDoUpdate({
          target: authLoginAttempts.identityHash,
          set: {
            consecutiveFailures: sql`${authLoginAttempts.consecutiveFailures} + 1`,
            cooldownUntil: sql`CASE WHEN ${authLoginAttempts.consecutiveFailures} + 1 >= ${maxConsecutiveLoginFailures} THEN now() + interval '15 minutes' ELSE NULL END`,
            lastAttemptAt: new Date(),
            updatedAt: new Date(),
          },
        })
    },
  }
}

export async function isLoginAttemptAllowed(
  store: Pick<LoginAttemptStore, 'read'>,
  identityHash: string,
  now: Date = new Date(),
) {
  const state = await store.read(identityHash)
  return decideLoginAttempt({
    state,
    succeeded: true,
    now,
    policy: { cooldownMs: loginCooldownMs },
  }).allowed
}
