import {
  createAuthServer,
  serializeSetCookie,
} from '@neondatabase/neon-js/auth/server'
import type {
  CookieOptions,
  NeonAuthServer,
} from '@neondatabase/neon-js/auth/server'
import { getRequest, getResponseHeaders } from '@tanstack/react-start/server'

import type { NeonAuthRuntimeConfig } from './runtime-config.server'
import { requestNeonPasswordReset } from './neon-password-reset-provider.server'
import type { PasswordResetProviderResult } from './neon-password-reset-provider.server'

export type TanStackRequestBindings = {
  getRequest: () => Request
  appendSetCookie: (value: string) => void
}

function defaultBindings(): TanStackRequestBindings {
  return {
    getRequest,
    appendSetCookie: (value) =>
      getResponseHeaders().append('set-cookie', value),
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
