import type { getDb } from '../src/db/index'
import type {
  DatabaseReader,
  DatabaseTransaction,
  TransactionalDatabase,
} from '../src/db/contracts'
import {
  financialEvents,
  inventoryCostAllocations,
  sales,
} from '../src/db/schema'
import type { DeliverSaleInput } from '../src/features/finance/contracts'
import { persistSaleDelivery } from '../src/features/finance/functions'

// Compile-only fixture, included by tsc and Knip. Never invoke it or open a DB.
function databaseContracts(
  database: ReturnType<typeof getDb>,
  tx: DatabaseTransaction,
  delivery: DeliverSaleInput,
) {
  const writer: TransactionalDatabase = database
  const reader: DatabaseReader = tx
  const transactionResult = writer.transaction(async () => 42)
  // @ts-expect-error Transaction results must retain their inferred type.
  const wrongTransactionResult: Promise<string> = transactionResult

  // @ts-expect-error Money uses decimal strings, never number payloads.
  tx.update(financialEvents).set({ amount: 10 })
  // @ts-expect-error Invalid enum values must be rejected by the schema.
  tx.update(inventoryCostAllocations).set({ eventType: 'invalid_event' })
  // @ts-expect-error A read boundary cannot perform writes.
  reader.insert(financialEvents)

  const rows = reader.select({ id: sales.id }).from(sales)
  const inspect = async () => {
    const first = (await rows)[0]
    // @ts-expect-error Query projections must not expose unselected columns.
    void first?.totalAmount
    const result = await persistSaleDelivery(writer, delivery, 'fixture-actor')
    // @ts-expect-error Writer results must not fall back to an untyped value.
    void result.unknownField
    return first?.id
  }
  void [wrongTransactionResult, inspect]
}

void databaseContracts
