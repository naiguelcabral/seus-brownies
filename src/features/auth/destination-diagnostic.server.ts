type DiagnosticEnvironment = {
  AUTH_DESTINATION_DIAGNOSTIC_ENABLED?: string
  AUTH_DESTINATION_DIAGNOSTIC_UNTIL?: string
  AUTH_DESTINATION_EXPECTED_BASE_URL?: string
  NEON_AUTH_BASE_URL?: string
}

type DestinationEvent = {
  event: 'auth.destination-diagnostic'
  matchesExpected: boolean
}

function normalizedEndpoint(value: string | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
  } catch {
    return null
  }
}

/** Temporary server log only: never emits bindings, identity or credentials. */
export function reportNeonAuthDestination(
  environment: DiagnosticEnvironment,
  options: {
    now?: number
    emit?: (event: DestinationEvent) => void
  } = {},
): void {
  if (environment.AUTH_DESTINATION_DIAGNOSTIC_ENABLED !== 'true') return
  const until = Date.parse(environment.AUTH_DESTINATION_DIAGNOSTIC_UNTIL ?? '')
  const remaining = until - (options.now ?? Date.now())
  if (
    !Number.isFinite(remaining) ||
    remaining <= 0 ||
    remaining > 30 * 60_000
  ) {
    return
  }
  const expected = normalizedEndpoint(
    environment.AUTH_DESTINATION_EXPECTED_BASE_URL,
  )
  if (!expected) return
  const event: DestinationEvent = {
    event: 'auth.destination-diagnostic',
    matchesExpected:
      normalizedEndpoint(environment.NEON_AUTH_BASE_URL) === expected,
  }
  try {
    const emit =
      options.emit ?? ((value) => console.info(JSON.stringify(value)))
    emit(event)
  } catch {
    // Diagnostics must never affect authentication or disclose logger errors.
  }
}
