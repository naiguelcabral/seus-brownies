import assert from 'node:assert/strict'
import test from 'node:test'
import {
  persistScenarioVersionCreate,
  ScenarioSchemaUnavailableError,
} from '../src/features/scenarios/functions'

type ScenarioDatabase = Parameters<typeof persistScenarioVersionCreate>[0]
type ScenarioTransaction = Parameters<
  Parameters<ScenarioDatabase['transaction']>[0]
>[0]

// Failure-only adapter for query-result edge cases PostgreSQL normally cannot
// produce. Actual driver compatibility and atomic writes are covered by the
// connected PostgreSQL suite, rather than by this incomplete query journal.
function failingVersionDatabase(
  responses: Array<Array<Record<string, unknown>>>,
  queryError?: unknown,
) {
  const journal: string[] = []
  const tx = {
    async execute() {
      journal.push('lock')
      if (queryError !== undefined) throw queryError
    },
    select() {
      const result = responses.shift() ?? []
      const query = {
        from: () => query,
        innerJoin: () => query,
        where: () => query,
        orderBy: () => query,
        limit: () => query,
        then: (resolve: (rows: typeof result) => unknown) => resolve(result),
      }
      return query
    },
    insert() {
      journal.push('insert')
      throw new Error('Must fail before writing')
    },
  }
  const database: ScenarioDatabase = {
    async transaction<T>(work: (value: ScenarioTransaction) => Promise<T>) {
      journal.push('begin')
      try {
        const result = await work(tx as unknown as ScenarioTransaction)
        journal.push('commit')
        return result
      } catch (error) {
        journal.push('rollback')
        throw error
      }
    },
  }
  return { database, journal }
}

for (const [label, responses, message] of [
  ['fonte ausente', [[]], /Cenário não encontrado/],
  [
    'agregado de versão ausente',
    [
      [{ id: 1, scenarioKey: 'synthetic', status: 'active', version: 2 }],
      [],
      [],
    ],
    /Resultado obrigatório ausente/,
  ],
] as const) {
  test(`criação de versão: ${label} falha controladamente antes de escrever`, async () => {
    const mock = failingVersionDatabase(
      structuredClone(responses).map((rows) => [...rows]),
    )
    await assert.rejects(
      persistScenarioVersionCreate(
        mock.database,
        { sourceScenarioId: 1, reason: 'Revisão QA' },
        'qa-owner',
      ),
      message,
    )
    assert.deepEqual(mock.journal, ['begin', 'lock', 'rollback'])
  })
}

test('criação de versão mantém erro de schema e reverte a transação', async () => {
  for (const code of ['42P01', '42703']) {
    const mock = failingVersionDatabase(
      [],
      Object.assign(new Error('synthetic'), { code }),
    )
    await assert.rejects(
      persistScenarioVersionCreate(
        mock.database,
        { sourceScenarioId: 1, reason: 'Revisão QA' },
        'qa-owner',
      ),
      ScenarioSchemaUnavailableError,
    )
    assert.deepEqual(mock.journal, ['begin', 'lock', 'rollback'])
  }
})
