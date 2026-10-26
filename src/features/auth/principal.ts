import { assertPermission } from './authorization'
import type { AppRole, Permission } from './authorization'

export type AuthenticatedIdentity = {
  id: string
  email: string
  emailVerified: boolean
}

export type AppPrincipal = AuthenticatedIdentity & {
  role: AppRole
  /** Provider session creation time; never supplied by an RPC caller. */
  sessionCreatedAt?: number
}

export class AuthenticationRequiredError extends Error {
  readonly statusCode = 401

  constructor() {
    super('Autenticação obrigatória para esta operação.')
    this.name = 'AuthenticationRequiredError'
  }
}

export class VerifiedEmailRequiredError extends Error {
  readonly statusCode = 403

  constructor() {
    super('Confirme o e-mail antes de continuar.')
    this.name = 'VerifiedEmailRequiredError'
  }
}

/**
 * This boundary accepts a principal only after a server-side provider adapter
 * and the Cacau access lookup have produced it. It must never deserialize a
 * role sent by a browser.
 */
function assertAuthenticated(
  principal: AppPrincipal | null | undefined,
): AppPrincipal {
  if (!principal) throw new AuthenticationRequiredError()
  return principal
}

function assertVerifiedPrincipal(principal: AppPrincipal) {
  if (!principal.emailVerified) throw new VerifiedEmailRequiredError()
  return principal
}

export function assertPrincipalPermission(
  principal: AppPrincipal | null | undefined,
  permission: Permission,
) {
  const authenticated = assertVerifiedPrincipal(assertAuthenticated(principal))
  assertPermission(authenticated.role, permission)
  return authenticated
}
