import type { Permission } from './authorization'
import { assertPrincipalPermission } from './principal'
import type { AppPrincipal } from './principal'

export type PrincipalResolver = () => Promise<AppPrincipal | null>

/**
 * Adapter-neutral server guard. The future Neon Auth adapter owns session
 * resolution; writers receive only this verified principal boundary.
 */
export function createAuthorizationGuard(resolvePrincipal: PrincipalResolver) {
  return async (permission: Permission) => {
    const principal = await resolvePrincipal()
    return assertPrincipalPermission(principal, permission)
  }
}
