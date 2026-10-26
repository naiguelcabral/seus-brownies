import pg from 'pg'
import { createPostgresDatabaseScope } from '../../src/db/postgres-scope.server'

if (process.env.CACAU_CONNECTED_QA !== 'local-postgres17') {
  throw new Error('Connected QA is restricted to the isolated runner.')
}

const connection = {
  host: '127.0.0.1',
  port: 5440,
  user: 'connected_fixture',
  password: 'synthetic-connected-only',
  database: 'cacau_connected',
}
export const pool = new pg.Pool({ ...connection, max: 4 })
const scope = createPostgresDatabaseScope(() => connection)
export const getDb = scope.getDb
export const withDatabaseScope = scope.run
