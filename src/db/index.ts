import { requireDatabaseEnvironment } from '#/lib/env'
import { createPostgresDatabaseScope } from './postgres-scope.server'

const scope = createPostgresDatabaseScope(() => {
  const { DATABASE_URL: connectionString } = requireDatabaseEnvironment(
    process.env,
  )
  return { connectionString }
})

/** Lazy, shared only inside the active Server Function or explicit script scope. */
export const getDb = scope.getDb
export const withDatabaseScope = scope.run
