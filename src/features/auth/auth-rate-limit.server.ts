import { createCloudflareTurnstileVerifier } from './turnstile-adapter.server'
import { createInMemoryAuthRateLimiter } from './auth-rate-limit'
import type { AuthRateLimitScope } from './auth-rate-limit'
import { getCloudflareAuthRateLimiter } from './cloudflare-rate-limit.server'
import type { CloudflareRateLimitBinding } from './cloudflare-rate-limit.server'

const limiter = createInMemoryAuthRateLimiter()

type PublicAuthProtectionDependencies = {
  isDevelopment?: boolean
  limiter?: Pick<ReturnType<typeof createInMemoryAuthRateLimiter>, 'consume'>
  verifyTurnstile?: (input: {
    secretKey: string
    token: string
  }) => Promise<boolean>
  distributedLimiter?: CloudflareRateLimitBinding | null
  resolveDistributedLimiter?: () => Promise<
    CloudflareRateLimitBinding | undefined
  >
}

type PublicAuthProtectionOptions = {
  forceChallenge?: boolean
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
  identifier: string
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
  options: PublicAuthProtectionOptions = {},
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
    input.identifier,
    pepper,
  )
  const distributedLimiter =
    dependencies.distributedLimiter === null
      ? undefined
      : (dependencies.distributedLimiter ??
        (await (
          dependencies.resolveDistributedLimiter ?? getCloudflareAuthRateLimiter
        )()))

  // HML enables this explicitly so a missing Workers binding cannot silently
  // downgrade a public endpoint to the isolate-local fallback limiter.
  if (
    !distributedLimiter &&
    environment.AUTH_RATE_LIMITER_REQUIRED === 'true'
  ) {
    return {
      allowed: false,
      requiresChallenge: false,
      retryAfterMs: 0,
    }
  }

  if (distributedLimiter) {
    try {
      const distributed = await distributedLimiter.limit({
        key: `${input.scope}:${opaqueIdentity}`,
      })
      if (!distributed.success) {
        return {
          allowed: false,
          requiresChallenge: false,
          retryAfterMs: 0,
        }
      }
    } catch {
      return {
        allowed: false,
        requiresChallenge: false,
        retryAfterMs: 0,
      }
    }
  }
  const decision = (dependencies.limiter ?? limiter).consume(
    input.scope,
    opaqueIdentity,
  )
  const requiresChallenge =
    options.forceChallenge === true || decision.requiresChallenge
  if (!requiresChallenge) return decision

  const challengeDecision = {
    ...decision,
    allowed: false,
    requiresChallenge: true,
  }

  const secretKey = environment.TURNSTILE_SECRET_KEY
  if (!secretKey || !input.turnstileToken) {
    return challengeDecision
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
    return { ...challengeDecision, allowed: verified }
  } catch {
    return challengeDecision
  }
}
