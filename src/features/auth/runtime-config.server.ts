export type NeonAuthRuntimeConfig = {
  baseUrl: string
  cookieSecret: string
}

type AuthEnvironment = {
  NEON_AUTH_BASE_URL?: string
  NEON_AUTH_COOKIE_SECRET?: string
  PASSWORD_RESET_REDIRECT_ORIGIN?: string
}

const localPasswordResetRedirectTo =
  'http://localhost:3000/login/redefinir-senha'

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

export function readPasswordResetRedirectTo(
  environment: AuthEnvironment,
  options: { development: boolean },
) {
  const configuredOrigin = environment.PASSWORD_RESET_REDIRECT_ORIGIN?.trim()
  if (!configuredOrigin) {
    if (options.development) return localPasswordResetRedirectTo
    throw new Error('PASSWORD_RESET_REDIRECT_ORIGIN não configurada.')
  }

  const origin = new URL(configuredOrigin)
  const isHttp = origin.protocol === 'http:' || origin.protocol === 'https:'
  const isOriginOnly =
    origin.username === '' &&
    origin.password === '' &&
    origin.pathname === '/' &&
    origin.search === '' &&
    origin.hash === ''
  const isSecure =
    origin.protocol === 'https:' ||
    (options.development && origin.hostname === 'localhost')

  if (!isHttp || !isOriginOnly || !isSecure) {
    throw new Error('PASSWORD_RESET_REDIRECT_ORIGIN inválida.')
  }

  return new URL('/login/redefinir-senha', origin).toString()
}
