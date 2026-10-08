/** Local diagnostic contract. No probes, network, secrets or public endpoint. */
const components = ['application', 'database', 'audit', 'rateLimiter'] as const
type Component = (typeof components)[number]
type State = 'available' | 'unavailable' | 'unknown'
export type LocalObservations = Partial<Record<Component, unknown>>
export type LocalReadiness = {
  status: 'ready' | 'not-ready' | 'unknown'
  checks: Array<{ component: Component; state: State }>
}

export function evaluateLocalReadiness(
  input: LocalObservations,
): LocalReadiness {
  const checks = components.map((component) => {
    const value = input[component]
    const state: State =
      value === 'available' || value === 'unavailable' ? value : 'unknown'
    return { component, state }
  })
  return {
    status: checks.some((check) => check.state === 'unavailable')
      ? 'not-ready'
      : checks.every((check) => check.state === 'available')
        ? 'ready'
        : 'unknown',
    checks,
  }
}

export type LocalSignal = LocalReadiness & {
  event: 'operational_readiness_changed'
  previous: LocalReadiness['status'] | null
}

/** An injected local hook only; delivery, retention and scheduling are external. */
export function createLocalSignalTracker(
  emit: (signal: LocalSignal) => void | Promise<void>,
) {
  let previous: LocalReadiness | null = null
  return async (input: LocalObservations) => {
    const readiness = evaluateLocalReadiness(input)
    const changed =
      !previous ||
      readiness.checks.some(
        (check, index) => check.state !== previous!.checks[index].state,
      )
    if (!changed) return { readiness, delivery: 'unchanged' as const }
    const signal: LocalSignal = {
      ...readiness,
      event: 'operational_readiness_changed',
      previous: previous?.status ?? null,
    }
    try {
      // Isolate retained state from a hook that mutates its argument.
      await emit(structuredClone(signal))
      previous = structuredClone(readiness)
      return { readiness, delivery: 'delivered' as const }
    } catch {
      // Preserve the previous successful state so the next observation retries.
      return { readiness, delivery: 'failed' as const }
    }
  }
}
