import { createCloudflareTurnstileVerifier } from './turnstile-adapter.server'
import { createInMemoryAuthRateLimiter } from './auth-rate-limit'
import type { AuthRateLimitScope } from './auth-rate-limit'

const limiter = createInMemoryAuthRateLimiter()

function isDevelopment(environment: Record<string, string | undefined>) {
  return environment.NODE_ENV === 'development'
}

export async function hashAuthIdentity(
  scope: AuthRateLimitScope,
  email: string,
  pepper: string,
) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${scope}:${email.trim().toLowerCase()}`),
  )
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export type PublicAuthProtectionInput = {
  scope: AuthRateLimitScope
  email: string
  turnstileToken?: string
}

/**
 * Applies a short per-isolate limit before a public auth action. Production
 * fails closed if the HMAC pepper is unavailable; development remains usable
 * without local secrets. A challenge is verified server-side only when the
 * limiter requires one.
 */
export async function protectPublicAuthAction(
  input: PublicAuthProtectionInput,
  environment: Record<string, string | undefined>,
) {
  const pepper = environment.AUTH_LOGIN_HASH_PEPPER
  if (!pepper) {
    return { allowed: isDevelopment(environment), requiresChallenge: false }
  }

  const opaqueIdentity = await hashAuthIdentity(
    input.scope,
    input.email,
    pepper,
  )
  const decision = limiter.consume(input.scope, opaqueIdentity)
  if (decision.allowed) return decision

  const secretKey = environment.TURNSTILE_SECRET_KEY
  if (!secretKey || !input.turnstileToken) {
    return { ...decision, allowed: false }
  }

  try {
    const verified = await createCloudflareTurnstileVerifier({
      secretKey,
    }).verify({
      token: input.turnstileToken,
    })
    return { ...decision, allowed: verified.success }
  } catch {
    return { ...decision, allowed: false }
  }
}
