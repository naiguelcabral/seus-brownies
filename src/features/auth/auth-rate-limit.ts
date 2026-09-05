export type AuthRateLimitScope =
  'login' | 'sign-up' | 'verification-otp' | 'password-reset'

export type AuthRateLimitPolicy = {
  limit: number
  windowMs: number
}

export type AuthRateLimitDecision = {
  allowed: boolean
  requiresChallenge: boolean
  retryAfterMs: number
}

export const authRateLimitPolicies: Readonly<
  Record<AuthRateLimitScope, AuthRateLimitPolicy>
> = {
  login: { limit: 5, windowMs: 15 * 60 * 1000 },
  'sign-up': { limit: 3, windowMs: 15 * 60 * 1000 },
  'verification-otp': { limit: 3, windowMs: 10 * 60 * 1000 },
  'password-reset': { limit: 3, windowMs: 15 * 60 * 1000 },
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

/**
 * Per-isolate limiter for public auth actions. Its input must already be a
 * server-derived opaque identifier; it never receives an e-mail or token.
 * Durable login lockout remains the authoritative control across isolates.
 */
export function createInMemoryAuthRateLimiter(
  now: () => number = () => Date.now(),
) {
  const buckets = new Map<string, RateLimitBucket>()

  return {
    consume(
      scope: AuthRateLimitScope,
      opaqueIdentity: string,
    ): AuthRateLimitDecision {
      const policy = authRateLimitPolicies[scope]
      const currentTime = now()
      const key = `${scope}:${opaqueIdentity}`
      const existing = buckets.get(key)

      if (!existing || existing.resetAt <= currentTime) {
        buckets.set(key, {
          count: 1,
          resetAt: currentTime + policy.windowMs,
        })
        return { allowed: true, requiresChallenge: false, retryAfterMs: 0 }
      }

      if (existing.count >= policy.limit) {
        return {
          allowed: false,
          requiresChallenge: true,
          retryAfterMs: existing.resetAt - currentTime,
        }
      }

      existing.count += 1
      return { allowed: true, requiresChallenge: false, retryAfterMs: 0 }
    },
  }
}
