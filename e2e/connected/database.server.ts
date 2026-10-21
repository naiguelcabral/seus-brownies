import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../../src/db/schema'

if (process.env.CACAU_CONNECTED_QA !== 'local-postgres17') {
  throw new Error('Connected QA is restricted to the isolated runner.')
}

export const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 5440,
  user: 'connected_fixture',
  password: 'synthetic-connected-only',
  database: 'cacau_connected',
  max: 4,
})
const database = drizzle(pool, { schema })
export function getDb() {
  return database
}
