import { Client } from 'pg'

import { requireDatabaseEnvironment } from '#/lib/env'
import { probeSqlConnection } from './connection-probe'

export function probeRuntimeSqlConnection() {
  return probeSqlConnection(
    process.env.SQL_CONNECTION_PROBE_ENABLED === 'true',
    () => {
      const { DATABASE_URL } = requireDatabaseEnvironment(process.env)
      const client = new Client({
        connectionString: DATABASE_URL,
        connectionTimeoutMillis: 5000,
        query_timeout: 5000,
        statement_timeout: 5000,
      })
      // Never log driver errors; the result is a fixed, sanitized status.
      client.on('error', () => {})
      return client
    },
  )
}
