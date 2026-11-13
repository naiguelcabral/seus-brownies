import { hashAuthIdentity } from '#/features/auth/auth-rate-limit.server'
import { getCloudflareAuthBudgetLimiters } from '#/features/auth/cloudflare-rate-limit.server'
import { trustedClientAddress } from '#/features/auth/public-request-budget.server'

/** Separate keys use the existing per-origin and aggregate bindings, never local fallback. */
export async function allowWahaRequest(
  request: Request,
  env: Record<string, string | undefined>,
  resolve = getCloudflareAuthBudgetLimiters,
) {
  const pepper = env.AUTH_LOGIN_HASH_PEPPER
  const address = trustedClientAddress(request)
  if (!pepper || !address) return false
  try {
    const { origin, aggregate } = await resolve()
    if (!origin || !aggregate) return false
    if (!(await aggregate.limit({ key: 'waha:aggregate:v1' })).success)
      return false
    const hash = await hashAuthIdentity(
      'login',
      `waha:network:v1:${address}`,
      pepper,
    )
    return (
      (await origin.limit({ key: `waha:network:v1:${hash}` })).success === true
    )
  } catch {
    return false
  }
}
