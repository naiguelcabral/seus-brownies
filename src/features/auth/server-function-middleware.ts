import { createMiddleware } from '@tanstack/react-start'

import { assertPrincipalPermission } from './principal'
import { serverFunctionPolicies } from './server-function-policy'
import type { ProtectedServerFunction } from './server-function-policy'

/** Applies the policy inventory at the Server Function boundary, never in UI. */
export function requireServerFunctionPermission(
  serverFunction: ProtectedServerFunction,
) {
  return createMiddleware({ type: 'function' }).server(async ({ next }) => {
    const { resolveCurrentPrincipal } =
      await import('./principal-resolver.server')
    const principal = await resolveCurrentPrincipal()
    assertPrincipalPermission(principal, serverFunctionPolicies[serverFunction])
    return next({ context: { principal } })
  })
}
