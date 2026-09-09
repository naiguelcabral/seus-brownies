import type { TurnstileVerifier } from './external-contracts'

export type TurnstileAdapterConfig = {
  secretKey: string
  fetch?: typeof fetch
}

type TurnstileResponse = {
  success?: boolean
  'error-codes'?: string[]
}

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
      const body = new URLSearchParams({
        secret: config.secretKey,
        response: token,
      })
      if (remoteAddress) body.set('remoteip', remoteAddress)

      const response = await request(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { method: 'POST', body },
      )
      if (!response.ok) {
        return { success: false, reasonCode: 'provider_http_error' }
      }
      let result: TurnstileResponse
      try {
        result = (await response.json()) as TurnstileResponse
      } catch {
        return { success: false, reasonCode: 'provider_invalid_response' }
      }
      return {
        success: result.success === true,
        reasonCode: result['error-codes']?.[0],
      }
    },
  }
}
