import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'

import * as schema from './schema'
import { createDatabaseScope } from './scope.server'

/** No unsupported session parameters in the PgBouncer startup packet. */
const databasePoolPolicy = {
  application_name: 'cacau-operation',
  max: 2,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 1_000,
  query_timeout: 20_000,
} as const

export function createPostgresDatabaseScope(readConfig: () => pg.PoolConfig) {
  return createDatabaseScope(() => {
    const pool = new pg.Pool({ ...readConfig(), ...databasePoolPolicy })
    // pg emits idle-client failures outside queries. Never log its error object,
    // which can contain SQL, connection information or operational values.
    pool.on('error', () => {
      console.error(
        JSON.stringify({
          event: 'database.pool',
          outcome: 'idle_client_error',
        }),
      )
    })
    const database = drizzle(pool, { schema })
    const transaction = database.transaction.bind(database)
    database.transaction = (work, config) =>
      transaction(async (tx) => {
        // SET LOCAL stays on the transaction's connection, including PgBouncer.
        await tx.execute(sql`set local statement_timeout = '15s'`)
        await tx.execute(
          sql`set local idle_in_transaction_session_timeout = '15s'`,
        )
        return work(tx)
      }, config)
    return { database, close: () => pool.end() }
  })
}
