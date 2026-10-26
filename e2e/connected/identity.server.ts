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
          'approved-employee',
        ]
        if (!token || !identities.includes(token)) return { data: null }
        return {
          data: {
            user: {
              id:
                token === 'approved-employee'
                  ? 'b1f5fcd8-7d94-4c51-9856-128930a030e5'
                  : `qa-${token}`,
              email: `${token}@example.test`,
              emailVerified: token !== 'unverified',
            },
            session: {
              createdAt: getCookie('cacau-connected-qa-issued-at') ?? 'invalid',
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
          roleUpdatedAt: appUserAccess.roleUpdatedAt,
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
