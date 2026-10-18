import { isAppRole } from './authorization'
import type { AppPrincipal, AuthenticatedIdentity } from './principal'

export type NeonAuthSessionClient = {
  getSession: () => Promise<{
    data: { user: { id: string; email: string; emailVerified: boolean } } | null
    error?: unknown
  }>
}

export type CacauAccessReader = (authUserId: string) => Promise<{
  role: unknown
  isActive: boolean
} | null>

/** Provider failure must not masquerade as an expired or absent session. */
export class AuthSessionUnavailableError extends Error {
  readonly statusCode = 503

  constructor() {
    super('Não foi possível verificar a sessão. Aguarde e tente novamente.')
    this.name = 'AuthSessionUnavailableError'
  }
}

/** Reads identity and Cacau access from the same provider response, once per call. */
export function createNeonSessionResolver(
  sessionClient: NeonAuthSessionClient,
  readAccess: CacauAccessReader,
) {
  return async (): Promise<{
    user: AuthenticatedIdentity | null
    principal: AppPrincipal | null
  }> => {
    let result: Awaited<ReturnType<NeonAuthSessionClient['getSession']>>
    try {
      result = await sessionClient.getSession()
    } catch {
      throw new AuthSessionUnavailableError()
    }
    // A throttled/unavailable provider is not proof that the session expired.
    // Fail closed without reporting the user as anonymous to route guards.
    if (result.error) {
      if (
        typeof result.error === 'object' &&
        'status' in result.error &&
        result.error.status === 401
      ) {
        return { user: null, principal: null }
      }
      throw new AuthSessionUnavailableError()
    }
    const { data } = result
    if (!data) return { user: null, principal: null }
    const access = await readAccess(data.user.id)
    const principal =
      access?.isActive && isAppRole(access.role)
        ? { ...data.user, role: access.role }
        : null
    return { user: data.user, principal }
  }
}

export function createNeonPrincipalResolver(
  sessionClient: NeonAuthSessionClient,
  readAccess: CacauAccessReader,
) {
  const resolveSession = createNeonSessionResolver(sessionClient, readAccess)
  return async () => (await resolveSession()).principal
}
