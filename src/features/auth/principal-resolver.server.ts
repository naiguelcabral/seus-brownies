import { eq } from 'drizzle-orm'

import { getDb } from '#/db/index'
import { appUserAccess } from '#/db/schema'

import { createNeonPrincipalResolver } from './neon-adapter'
import { createTanStackNeonAuthServer } from './neon-tanstack-adapter.server'
import type { PrincipalResolver } from './guard'
import { readNeonAuthRuntimeConfig } from './runtime-config.server'

async function readCacauAccess(authUserId: string) {
  const [access] = await getDb()
    .select({ role: appUserAccess.role, isActive: appUserAccess.isActive })
    .from(appUserAccess)
    .where(eq(appUserAccess.authUserId, authUserId))
    .limit(1)
  return access
}

/**
 * Resolves identity only after the host supplies both server-side Neon Auth
 * bindings. Missing configuration is intentionally indistinguishable from an
 * anonymous request, keeping every protected Server Function closed.
 */
export function createConfiguredPrincipalResolver(
  environment: Record<string, string | undefined>,
): PrincipalResolver {
  const config = readNeonAuthRuntimeConfig(environment)
  if (!config) return async () => null

  const auth = createTanStackNeonAuthServer(config)
  return createNeonPrincipalResolver(
    {
      getSession: async () => {
        const result = await auth.getSession()
        const user = result.data?.user
        if (!user) return { data: null }
        return {
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
