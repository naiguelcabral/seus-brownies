import { isAppRole } from './authorization'
import type { AppPrincipal } from './principal'

export type NeonAuthSessionClient = {
  getSession: () => Promise<{
    data: { user: { id: string; email: string; emailVerified: boolean } } | null
  }>
}

export type CacauAccessReader = (authUserId: string) => Promise<{
  role: unknown
  isActive: boolean
} | null>

/**
 * Bridges a Neon Auth-compatible session client to Cacau's own role table.
 * Client construction remains outside this module because it requires the
 * provisioned endpoint and cookie secret.
 */
export function createNeonPrincipalResolver(
  sessionClient: NeonAuthSessionClient,
  readAccess: CacauAccessReader,
) {
  return async (): Promise<AppPrincipal | null> => {
    const { data } = await sessionClient.getSession()
    if (!data) return null
    const access = await readAccess(data.user.id)
    if (!access?.isActive || !isAppRole(access.role)) return null
    return { ...data.user, role: access.role }
  }
}
