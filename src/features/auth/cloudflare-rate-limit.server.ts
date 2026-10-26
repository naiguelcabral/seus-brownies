/** Structural contract verified against Workers types 5.20261025.1. */
export type CloudflareRateLimitBinding = {
  limit: (input: { key: string }) => Promise<{ success: boolean }>
}

function isRateLimiter(value: unknown): value is CloudflareRateLimitBinding {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'limit' in value &&
    typeof value.limit === 'function',
  )
}

async function readBinding(
  name: string,
): Promise<CloudflareRateLimitBinding | undefined> {
  try {
    const { env } = await import('cloudflare:workers')
    const value: unknown = Reflect.get(env, name)
    return isRateLimiter(value) ? value : undefined
  } catch {
    return undefined
  }
}

export function getCloudflareAuthRateLimiter() {
  return readBinding('AUTH_RATE_LIMITER')
}

export async function getCloudflareAuthBudgetLimiters() {
  const [origin, aggregate] = await Promise.all([
    readBinding('AUTH_ORIGIN_RATE_LIMITER'),
    readBinding('AUTH_AGGREGATE_RATE_LIMITER'),
  ])
  return { ...(origin ? { origin } : {}), ...(aggregate ? { aggregate } : {}) }
}
