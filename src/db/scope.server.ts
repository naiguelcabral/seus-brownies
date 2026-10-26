import { AsyncLocalStorage } from 'node:async_hooks'

/** The store is a context carrier; it never owns a resource outside a call. */
export function createDatabaseScope<Database>(
  open: () => { database: Database; close: () => Promise<void> },
) {
  type Resource = ReturnType<typeof open>
  const storage = new AsyncLocalStorage<{
    resource?: Resource
    closed: boolean
  }>()

  return {
    getDb(): Database {
      const scope = storage.getStore()
      if (!scope || scope.closed) {
        throw new Error('Database access requires an active operation scope.')
      }
      scope.resource ??= open()
      return scope.resource.database
    },
    async run<T>(work: () => Promise<T>): Promise<T> {
      const parent = storage.getStore()
      if (parent) {
        if (parent.closed)
          throw new Error('Database operation scope is closed.')
        return work()
      }
      const scope: { resource?: Resource; closed: boolean } = { closed: false }
      return storage.run(scope, async () => {
        try {
          return await work()
        } finally {
          scope.closed = true
          await scope.resource?.close()
        }
      })
    },
  }
}
