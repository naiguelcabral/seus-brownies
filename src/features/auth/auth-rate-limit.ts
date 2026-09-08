export type AuthRateLimitScope =
  | 'login'
  | 'sign-up'
  | 'verification-otp'
  | 'password-reset'
  | 'password-reset-completion'

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
  'password-reset-completion': { limit: 3, windowMs: 15 * 60 * 1000 },
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
  let nextExpiry = Number.POSITIVE_INFINITY

  function pruneExpired(currentTime: number) {
    if (currentTime < nextExpiry) return
    nextExpiry = Number.POSITIVE_INFINITY
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= currentTime) buckets.delete(key)
      else nextExpiry = Math.min(nextExpiry, bucket.resetAt)
    }
  }

  return {
    consume(
      scope: AuthRateLimitScope,
      opaqueIdentity: string,
    ): AuthRateLimitDecision {
      const policy = authRateLimitPolicies[scope]
      const currentTime = now()
      pruneExpired(currentTime)
      const key = `${scope}:${opaqueIdentity}`
      const existing = buckets.get(key)

      if (!existing) {
        const bucket = {
          count: 1,
          resetAt: currentTime + policy.windowMs,
        }
        buckets.set(key, bucket)
        nextExpiry = Math.min(nextExpiry, bucket.resetAt)
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
    activeBucketCount() {
      pruneExpired(now())
      return buckets.size
    },
  }
}
