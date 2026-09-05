import type { NeonAuthServer } from '@neondatabase/neon-js/auth/server'

import { createTanStackNeonAuthServer } from './neon-tanstack-adapter.server'
import { readNeonAuthRuntimeConfig } from './runtime-config.server'

/** Creates the request-scoped Neon Auth proxy only when its bindings exist. */
export function createConfiguredNeonAuthServer(
  environment: Record<string, string | undefined>,
): NeonAuthServer | null {
  const config = readNeonAuthRuntimeConfig(environment)
  return config ? createTanStackNeonAuthServer(config) : null
}
