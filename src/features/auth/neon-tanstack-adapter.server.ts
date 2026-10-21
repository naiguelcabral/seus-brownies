import {
  createAuthServer,
  NEON_AUTH_SESSION_COOKIE_NAME,
  parseCookieValue,
  serializeSetCookie,
} from '@neondatabase/neon-js/auth/server'
import type {
  CookieOptions,
  NeonAuthServer,
} from '@neondatabase/neon-js/auth/server'
import { appendResponseHeader, getRequest } from '@tanstack/react-start/server'

import type { NeonAuthRuntimeConfig } from './runtime-config.server'
import { requestNeonPasswordReset } from './neon-password-reset-provider.server'
import type { PasswordResetProviderResult } from './neon-password-reset-provider.server'
import { createSessionProviderLogger } from './session-provider-telemetry.server'

export type TanStackRequestBindings = {
  getRequest: () => Request
  appendSetCookie: (value: string) => void
}

function defaultBindings(): TanStackRequestBindings {
  return {
    getRequest,
    appendSetCookie: (value) => appendResponseHeader('set-cookie', value),
  }
}

export function requestTanStackNeonPasswordReset(
  config: NeonAuthRuntimeConfig,
  input: { email: string; redirectTo: string },
): Promise<PasswordResetProviderResult> {
  return requestNeonPasswordReset(config, input, {
    bindings: defaultBindings(),
  })
}

/**
 * Creates the framework adapter required by Neon Auth without reading or
 * storing configuration. TanStack Start's request context is AsyncLocalStorage
 * backed, so each auth call observes only the active request and response.
 */
export function createTanStackNeonAuthServer(
  config: NeonAuthRuntimeConfig,
  bindings: TanStackRequestBindings = defaultBindings(),
): NeonAuthServer {
  return createAuthServer({
    baseUrl: config.baseUrl,
    cookieSecret: config.cookieSecret,
    sameSite: 'strict',
    log: createSessionProviderLogger(),
    context: () => {
      const request = bindings.getRequest()
      return {
        getCookies: () => request.headers.get('cookie') ?? '',
        setCookie: (name: string, value: string, options: CookieOptions) => {
          bindings.appendSetCookie(
            serializeSetCookie({ name, value, ...options }),
          )
        },
        getHeader: (name: string) => request.headers.get(name),
        getOrigin: () =>
          request.headers.get('origin') ?? new URL(request.url).origin,
        getFramework: () => 'tanstack-start',
      }
    },
  })
}

export async function readTanStackNeonSession(
  auth: Pick<NeonAuthServer, 'getSession'>,
  bindings: TanStackRequestBindings = defaultBindings(),
) {
  const cookies = bindings.getRequest().headers.get('cookie') ?? ''
  // A visitor with no session token cannot have a provider session. Avoid
  // making public pages depend on an unnecessary upstream request. A token
  // still goes through the SDK and the Cacau access check, including errors.
  if (!parseCookieValue(cookies, NEON_AUTH_SESSION_COOKIE_NAME)) {
    return { data: null, error: null }
  }
  return auth.getSession()
}
