import { isIP } from 'node:net'
import { hashAuthIdentity } from './auth-rate-limit.server'
import { getCloudflareAuthBudgetLimiters } from './cloudflare-rate-limit.server'
import type { CloudflareRateLimitBinding } from './cloudflare-rate-limit.server'

type BudgetBindings = {
  origin?: CloudflareRateLimitBinding
  aggregate?: CloudflareRateLimitBinding
}

/** Headers alone cannot make a Node request a trusted Cloudflare request. */
export function trustedClientAddress(request: Request): string | undefined {
  if (!('cf' in request) || !request.cf || typeof request.cf !== 'object')
    return undefined
  const address = request.headers.get('CF-Connecting-IP')?.trim()
  return address && isIP(address) ? address : undefined
}

/** Applied before handlers and DB access; these budgets cannot be bypassed by CAPTCHA. */
export async function publicAuthRequestAllowed(
  request: Request,
  environment: Record<string, string | undefined>,
  resolveBindings: () => Promise<BudgetBindings> = getCloudflareAuthBudgetLimiters,
): Promise<boolean> {
  if (environment.AUTH_RATE_LIMITER_REQUIRED !== 'true') return true
  const pepper = environment.AUTH_LOGIN_HASH_PEPPER
  const address = trustedClientAddress(request)
  if (!pepper || !address) return false
  try {
    const { origin, aggregate } = await resolveBindings()
    if (!origin || !aggregate) return false
    // One shared budget across public auth surfaces in each Cloudflare location.
    if (!(await aggregate.limit({ key: 'public-auth:v1' })).success)
      return false
    const key = await hashAuthIdentity('login', `network:v1:${address}`, pepper)
    return (await origin.limit({ key: `network:v1:${key}` })).success === true
  } catch {
    return false
  }
}
