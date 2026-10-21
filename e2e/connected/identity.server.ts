import { getCookie } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { createNeonSessionResolver } from '../../src/features/auth/neon-adapter'
import { appUserAccess } from '../../src/db/schema'
import { getDb } from './database.server'

// Test-only provider adapter. No production module imports this file.
// The role always comes from PostgreSQL, never from the browser's cookie.
export function createConfiguredSessionResolver() {
  return createNeonSessionResolver(
    {
      getSession: async () => {
        const token = getCookie('cacau-connected-qa')
        const identities = [
          'owner',
          'manager',
          'production',
          'employee',
          'inactive',
          'unverified',
          'no-access',
        ]
        if (!token || !identities.includes(token)) return { data: null }
        return {
          data: {
            user: {
              id: `qa-${token}`,
              email: `${token}@example.test`,
              emailVerified: token !== 'unverified',
            },
          },
        }
      },
    },
    async (id) => {
      const [access] = await getDb()
        .select({
          role: appUserAccess.role,
          isActive: appUserAccess.isActive,
        })
        .from(appUserAccess)
        .where(eq(appUserAccess.authUserId, id))
        .limit(1)
      return access ?? null
    },
  )
}

export async function resolveCurrentPrincipal() {
  return (await createConfiguredSessionResolver()()).principal
}
