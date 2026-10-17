import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'

import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'

const requireProbeEnabled = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    setResponseHeader('Cache-Control', 'no-store')
    if (process.env.SQL_CONNECTION_PROBE_ENABLED !== 'true') {
      throw new Error('Diagnóstico de conexão desativado.')
    }
    return next()
  },
)

export const checkSqlConnection = createServerFn({ method: 'POST' })
  .middleware([
    requireProbeEnabled,
    requireServerFunctionPermission('checkSqlConnection'),
  ])
  .handler(async () => {
    const { probeRuntimeSqlConnection } =
      await import('./connection-probe.server')
    return probeRuntimeSqlConnection()
  })
