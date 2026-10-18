import { eq } from 'drizzle-orm'

import { getDb } from '#/db/index'
import { appUserAccess } from '#/db/schema'

import { createNeonSessionResolver } from './neon-adapter'
import { createConfiguredNeonAuthServer } from './configured-neon-auth.server'
import type { PrincipalResolver } from './guard'

async function readCacauAccess(authUserId: string) {
  const [access] = await getDb()
    .select({ role: appUserAccess.role, isActive: appUserAccess.isActive })
    .from(appUserAccess)
    .where(eq(appUserAccess.authUserId, authUserId))
    .limit(1)
  return access ?? null
}

/**
 * Resolves identity only after the host supplies both server-side Neon Auth
 * bindings. Missing configuration is intentionally indistinguishable from an
 * anonymous request, keeping every protected Server Function closed.
 */
function createConfiguredPrincipalResolver(
  environment: Record<string, string | undefined>,
): PrincipalResolver {
  const resolveSession = createConfiguredSessionResolver(environment)
  return async () => (await resolveSession()).principal
}

export function createConfiguredSessionResolver(
  environment: Record<string, string | undefined>,
) {
  const auth = createConfiguredNeonAuthServer(environment)
  if (!auth) return async () => ({ user: null, principal: null })
  return createNeonSessionResolver(
    {
      getSession: async () => {
        const result = await auth.getSession()
        const user = result.data?.user
        if (!user) return { data: null, error: result.error }
        return {
          error: result.error,
          data: {
            user: {
              id: user.id,
              email: user.email,
              emailVerified: Boolean(user.emailVerified),
            },
          },
        }
      },
    },
    readCacauAccess,
  )
}

export function resolveCurrentPrincipal() {
  return createConfiguredPrincipalResolver(process.env)()
}
