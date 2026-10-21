import type { getDb } from '../src/db/index'
import type {
  DatabaseReader,
  DatabaseTransaction,
  TransactionalDatabase,
} from '../src/db/contracts'
import {
  financialEvents,
  inventoryCostAllocations,
  managementScenarios,
  managementScenarioMix,
  sales,
} from '../src/db/schema'
import type { DeliverSaleInput } from '../src/features/finance/contracts'
import { persistSaleDelivery } from '../src/features/finance/functions'

import {
  persistScenarioCreate,
  persistScenarioDraftUpdate,
  persistScenarioVersionCreate,
  persistScenarioActivation,
  persistScenarioArchive,
} from '../src/features/scenarios/functions'
import type { ScenarioDraftInput } from '../src/features/scenarios/contracts'

// Compile-only fixture, included by tsc and Knip. Never invoke it or open a DB.
function databaseContracts(
  database: ReturnType<typeof getDb>,
  tx: DatabaseTransaction,
  delivery: DeliverSaleInput,
  draft: ScenarioDraftInput,
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

  // @ts-expect-error Scenario money retains the decimal string contract.
  tx.update(managementScenarios).set({ monthlyProfitGoal: 10000 })
  // @ts-expect-error Scenario status is the schema enum, not arbitrary text.
  tx.update(managementScenarios).set({ status: 'published' })
  // @ts-expect-error Persisted mix costs remain decimal strings.
  tx.update(managementScenarioMix).set({ plannedUnitCost: 0.923 })
  // @ts-expect-error Deletion is not part of the shared transaction boundary.
  tx.delete(managementScenarioMix)

  const scenarioResults = Promise.all([
    persistScenarioCreate(database, draft, 'fixture-actor'),
    persistScenarioDraftUpdate(
      database,
      { ...draft, id: 1, expectedRevision: 1 },
      'fixture-actor',
    ),
    persistScenarioVersionCreate(
      database,
      { sourceScenarioId: 1, reason: 'Revisão' },
      'fixture-actor',
    ),
    persistScenarioActivation(
      database,
      { id: 1, expectedRevision: 1 },
      'fixture-actor',
    ),
    persistScenarioArchive(
      database,
      { id: 1, expectedRevision: 1, reason: 'Arquivo' },
      'fixture-actor',
    ),
  ])
  const inspectScenarios = async () => {
    const results = await scenarioResults
    for (const result of results) {
      const id: number = result.id
      const version: number = result.version
      const revision: number = result.revision
      // @ts-expect-error Scenario writer results cannot become untyped.
      void result.unknownField
      // @ts-expect-error Revisions are integers, not decimal strings.
      const invalidRevision: string = result.revision
      void [id, version, revision, invalidRevision]
    }
  }
  void inspectScenarios

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
