import type { TurnstileVerifier } from './external-contracts'

export type TurnstileAdapterConfig = {
  secretKey: string
  expectedHostname: string
  expectedAction: string
  fetch?: typeof fetch
  timeoutMs?: number
}

const providerErrorCodes = [
  'missing-input-secret',
  'invalid-input-secret',
  'missing-input-response',
  'invalid-input-response',
  'bad-request',
  'timeout-or-duplicate',
  'internal-error',
] as const

/**
 * The secret remains server-only. No request is sent until a login or recovery
 * flow explicitly asks the verifier to validate a browser challenge token.
 */
export function createCloudflareTurnstileVerifier(
  config: TurnstileAdapterConfig,
): TurnstileVerifier {
  const request = config.fetch ?? globalThis.fetch

  return {
    verify: async ({ token, remoteAddress }) => {
      if (
        !token ||
        token.length > 2048 ||
        !config.expectedHostname ||
        !config.expectedAction
      ) {
        return { success: false, reasonCode: 'invalid_verification_input' }
      }
      const body = new URLSearchParams({
        secret: config.secretKey,
        response: token,
      })
      if (remoteAddress) body.set('remoteip', remoteAddress)

      const response = await request(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          body,
          signal: AbortSignal.timeout(config.timeoutMs ?? 10_000),
        },
      )
      if (!response.ok) {
        return { success: false, reasonCode: 'provider_http_error' }
      }
      let result: unknown
      try {
        result = await response.json()
      } catch {
        return { success: false, reasonCode: 'provider_invalid_response' }
      }
      if (!result || typeof result !== 'object' || !('success' in result)) {
        return { success: false, reasonCode: 'provider_invalid_response' }
      }
      if (result.success !== true) {
        const codes =
          'error-codes' in result && Array.isArray(result['error-codes'])
            ? result['error-codes']
            : []
        return {
          success: false,
          reasonCode:
            providerErrorCodes.find((code) => codes.includes(code)) ??
            'provider_rejected',
        }
      }
      if (
        !('hostname' in result) ||
        result.hostname !== config.expectedHostname
      ) {
        return { success: false, reasonCode: 'hostname_mismatch' }
      }
      if (!('action' in result) || result.action !== config.expectedAction) {
        return { success: false, reasonCode: 'action_mismatch' }
      }
      return { success: true }
    },
  }
}
