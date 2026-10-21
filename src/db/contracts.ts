import type { getDb } from './index'

type Database = ReturnType<typeof getDb>

/** Inferred from the configured driver/schema; importing types opens no pool. */
export type DatabaseTransaction = Pick<
  Parameters<Parameters<Database['transaction']>[0]>[0],
  'select' | 'insert' | 'update' | 'execute'
>

/** Reads work both on the database and inside an existing transaction. */
export type DatabaseReader = Pick<Database, 'select'>

/** Retains Drizzle's generic callback/result contract. */
export type TransactionalDatabase = {
  transaction: <T>(work: (tx: DatabaseTransaction) => Promise<T>) => Promise<T>
}
