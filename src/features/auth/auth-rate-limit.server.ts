import { createCloudflareTurnstileVerifier } from './turnstile-adapter.server'
import { createInMemoryAuthRateLimiter } from './auth-rate-limit'
import type { AuthRateLimitScope } from './auth-rate-limit'

const limiter = createInMemoryAuthRateLimiter()

type PublicAuthProtectionDependencies = {
  isDevelopment?: boolean
  limiter?: Pick<ReturnType<typeof createInMemoryAuthRateLimiter>, 'consume'>
  verifyTurnstile?: (input: {
    secretKey: string
    token: string
  }) => Promise<boolean>
}

function isDevelopment() {
  return import.meta.env.DEV === true
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
  dependencies: PublicAuthProtectionDependencies = {},
) {
  const pepper = environment.AUTH_LOGIN_HASH_PEPPER
  if (!pepper) {
    return {
      allowed: dependencies.isDevelopment ?? isDevelopment(),
      requiresChallenge: false,
    }
  }

  const opaqueIdentity = await hashAuthIdentity(
    input.scope,
    input.email,
    pepper,
  )
  const decision = (dependencies.limiter ?? limiter).consume(
    input.scope,
    opaqueIdentity,
  )
  if (decision.allowed) return decision

  const secretKey = environment.TURNSTILE_SECRET_KEY
  if (!secretKey || !input.turnstileToken) {
    return { ...decision, allowed: false }
  }

  try {
    const verified = dependencies.verifyTurnstile
      ? await dependencies.verifyTurnstile({
          secretKey,
          token: input.turnstileToken,
        })
      : (
          await createCloudflareTurnstileVerifier({ secretKey }).verify({
            token: input.turnstileToken,
          })
        ).success
    return { ...decision, allowed: verified }
  } catch {
    return { ...decision, allowed: false }
  }
}
