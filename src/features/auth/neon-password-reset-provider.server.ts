import type { NeonAuthRuntimeConfig } from './runtime-config.server'

export const passwordResetProviderTimeoutMs = 12_000

export type PasswordResetProviderReasonCode =
  | 'provider_timeout'
  | 'provider_network_error'
  | 'provider_http_error'
  | 'provider_success'

export type PasswordResetProviderResult = {
  ok: boolean
  reasonCode: PasswordResetProviderReasonCode
}

export type PasswordResetRequestBindings = {
  getRequest: () => Request
}

export type PasswordResetFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

type PasswordResetProviderOptions = {
  bindings: PasswordResetRequestBindings
  fetch?: PasswordResetFetch
  timeoutMs?: number
}

/**
 * The installed Neon Auth server client drops fetch options. This narrow
 * endpoint call retains the same request context while aborting its fetch.
 */
export async function requestNeonPasswordReset(
  config: NeonAuthRuntimeConfig,
  input: { email: string; redirectTo: string },
  {
    bindings,
    fetch: fetchImplementation = fetch,
    timeoutMs = passwordResetProviderTimeoutMs,
  }: PasswordResetProviderOptions,
): Promise<PasswordResetProviderResult> {
  const request = bindings.getRequest()
  const url = new URL(
    'request-password-reset',
    config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`,
  )
  const controller = new AbortController()
  const timeoutState = { didTimeout: false }
  const timeout = setTimeout(() => {
    timeoutState.didTimeout = true
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetchImplementation(url, {
      method: 'POST',
      headers: {
        Cookie: request.headers.get('cookie') ?? '',
        Origin: request.headers.get('origin') ?? new URL(request.url).origin,
        'Content-Type': 'application/json',
        'x-neon-auth-proxy': 'tanstack-start',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    })
    return response.ok
      ? { ok: true, reasonCode: 'provider_success' }
      : { ok: false, reasonCode: 'provider_http_error' }
  } catch {
    return timeoutState.didTimeout
      ? { ok: false, reasonCode: 'provider_timeout' }
      : { ok: false, reasonCode: 'provider_network_error' }
  } finally {
    clearTimeout(timeout)
  }
}
