export type CloudflareRateLimitBinding = {
  limit: (input: { key: string }) => Promise<{ success: boolean }>
}

type CloudflareAuthEnvironment = {
  AUTH_RATE_LIMITER?: CloudflareRateLimitBinding
}

/**
 * Resolves the optional Workers binding without making it a requirement for
 * Node-only tests or local development. The binding method is called only
 * from a request handler.
 */
export async function getCloudflareAuthRateLimiter(): Promise<
  CloudflareRateLimitBinding | undefined
> {
  try {
    const { env } = (await import('cloudflare:workers')) as {
      env: CloudflareAuthEnvironment
    }
    return typeof env.AUTH_RATE_LIMITER?.limit === 'function'
      ? env.AUTH_RATE_LIMITER
      : undefined
  } catch {
    return undefined
  }
}
