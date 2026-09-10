import { drizzle } from 'drizzle-orm/node-postgres'

import * as schema from './schema.ts'
import { requireDatabaseEnvironment } from '#/lib/env'

/**
 * Opens the database only in a server operation that needs it. This keeps the
 * public storefront usable before local or Cloudflare secrets are configured.
 */
export function getDb() {
  const { DATABASE_URL: connectionString } = requireDatabaseEnvironment(
    process.env,
  )

  return drizzle(connectionString, { schema })
}
