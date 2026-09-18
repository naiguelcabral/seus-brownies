import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('histórico de despesas permanece protegido, filtrado e paginado no servidor', async () => {
  const source = await readFile(
    new URL('../src/features/operations/functions.ts', import.meta.url),
    'utf8',
  )

  assert.match(
    source,
    /listExpenses = createServerFn[\s\S]*?requireServerFunctionPermission\('listExpenses'\)/,
  )
  assert.match(
    source,
    /listExpenses = createServerFn[\s\S]*?\.validator\(expenseHistoryValues\)/,
  )
  assert.match(source, /ilike\(expenses\.description/)
  assert.match(source, /ilike\(expenses\.category/)
  assert.match(
    source,
    /\.limit\(expenseHistoryPageSize\)[\s\S]*?\.offset\(pagination\.offset\)/,
  )
})

test('rota de despesas usa filtros validados como dependências do loader', async () => {
  const source = await readFile(
    new URL('../src/routes/despesas.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /validateSearch: expenseSearch/)
  assert.match(source, /loaderDeps: \(\{ search \}\)/)
  assert.match(source, /pendingComponent: ExpensesPending/)
  assert.match(source, /errorComponent: ExpensesError/)
})
