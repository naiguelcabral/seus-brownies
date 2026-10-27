const networkCodes = [
  'NETWORK_ERROR',
  'NETWORK_DNS',
  'NETWORK_REFUSED',
  'NETWORK_TIMEOUT',
  'NETWORK_TLS',
  'NETWORK_RESET',
  'NETWORK_ABORT',
] as const

const rejectionCodes = [
  'invalid_credentials',
  'bad_jwt',
  'email_not_confirmed',
  'validation_failed',
  'user_not_found',
  'session_not_found',
  'over_request_rate_limit',
] as const

/** Only normalized SDK codes are safe; never log the provider error itself. */
export function reportLoginProviderRejection(error: unknown) {
  const details = error && typeof error === 'object' ? error : null
  const rawCode = details && 'code' in details ? details.code : null
  const rawStatus = details && 'status' in details ? details.status : null
  const status =
    typeof rawStatus === 'number' &&
    Number.isInteger(rawStatus) &&
    rawStatus >= 400 &&
    rawStatus <= 599
      ? rawStatus
      : null
  console.warn(
    JSON.stringify({
      event: 'auth.login.rejection',
      status,
      code: rejectionCodes.find((known) => known === rawCode) ?? 'unclassified',
    }),
  )
}

/** SDK metadata can contain URLs, cookies and raw errors: allowlist only. */
export function createSessionProviderLogger() {
  const record = (_message: string, metadata?: Record<string, unknown>) => {
    if (
      metadata?.component !== 'server-api' ||
      typeof metadata.path !== 'string'
    )
      return

    const operation = metadata.path.endsWith('/get-session')
      ? 'session'
      : metadata.path.endsWith('/sign-in/email')
        ? 'login'
        : null
    if (!operation) return
    const status =
      typeof metadata.status === 'number' &&
      Number.isInteger(metadata.status) &&
      metadata.status >= 400 &&
      metadata.status <= 599
        ? metadata.status
        : null
    // An explicitly rejected session is an ordinary anonymous request.
    if (operation === 'session' && status === 401) return
    const code = networkCodes.find((known) => known === metadata.code) ?? null
    console.warn(
      JSON.stringify({
        event: `auth.${operation}.provider`,
        stage: status ? 'http_error' : code ? 'transport_error' : 'unexpected',
        status,
        code,
      }),
    )
  }
  return { error: record, warn: record, info: record, debug: () => {} }
}
