import { drizzle } from 'drizzle-orm/node-postgres'

import * as schema from './schema.ts'

/**
 * Opens the database only in a server operation that needs it. This keeps the
 * public storefront usable before local or Cloudflare secrets are configured.
 */
export function getDb() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL must be configured before creating orders.')
  }

  return drizzle(connectionString, { schema })
}
