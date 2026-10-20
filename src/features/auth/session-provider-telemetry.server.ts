const networkCodes = [
  'NETWORK_ERROR',
  'NETWORK_DNS',
  'NETWORK_REFUSED',
  'NETWORK_TIMEOUT',
  'NETWORK_TLS',
  'NETWORK_RESET',
  'NETWORK_ABORT',
] as const

/** SDK metadata can contain URLs, cookies and raw errors: allowlist only. */
export function createSessionProviderLogger() {
  const record = (_message: string, metadata?: Record<string, unknown>) => {
    if (
      metadata?.component !== 'server-api' ||
      typeof metadata.path !== 'string' ||
      !metadata.path.endsWith('/get-session')
    )
      return

    const status =
      typeof metadata.status === 'number' &&
      Number.isInteger(metadata.status) &&
      metadata.status >= 400 &&
      metadata.status <= 599
        ? metadata.status
        : null
    // An explicitly rejected session is an ordinary anonymous request.
    if (status === 401) return
    const code = networkCodes.find((known) => known === metadata.code) ?? null
    console.warn(
      JSON.stringify({
        event: 'auth.session.provider',
        stage: status ? 'http_error' : code ? 'transport_error' : 'unexpected',
        status,
        code,
      }),
    )
  }
  return { error: record, warn: record, info: record, debug: () => {} }
}
