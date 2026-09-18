export type NeonAuthRuntimeConfig = {
  baseUrl: string
  cookieSecret: string
}

type AuthEnvironment = {
  NEON_AUTH_BASE_URL?: string
  NEON_AUTH_COOKIE_SECRET?: string
}

/**
 * Reads only runtime bindings supplied by the host. It never loads files and
 * deliberately returns null until both human-managed server secrets exist.
 */
export function readNeonAuthRuntimeConfig(
  environment: AuthEnvironment,
): NeonAuthRuntimeConfig | null {
  const baseUrl = environment.NEON_AUTH_BASE_URL?.trim()
  const cookieSecret = environment.NEON_AUTH_COOKIE_SECRET

  if (!baseUrl || !cookieSecret) return null
  if (cookieSecret.length < 32) {
    throw new Error(
      'NEON_AUTH_COOKIE_SECRET precisa ter ao menos 32 caracteres.',
    )
  }

  return { baseUrl, cookieSecret }
}
