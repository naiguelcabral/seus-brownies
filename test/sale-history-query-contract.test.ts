import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('histórico de vendas permanece protegido, filtrado e paginado no servidor', async () => {
  const source = await readFile(
    new URL('../src/features/operations/functions.ts', import.meta.url),
    'utf8',
  )

  assert.match(
    source,
    /listSales = createServerFn[\s\S]*?requireServerFunctionPermission\('listSales'\)/,
  )
  assert.match(
    source,
    /listSales = createServerFn[\s\S]*?\.validator\(saleHistoryValues\)/,
  )
  assert.match(source, /ilike\(sales\.customerName/)
  assert.match(source, /eq\(sales\.status, data\.status\)/)
  assert.match(source, /eq\(sales\.locationId, data\.locationId\)/)
  assert.match(source, /eq\(saleItems\.productId, data\.productId\)/)
  assert.match(source, /lt\(sales\.soldAt, endAt\)/)
  assert.match(
    source,
    /\.limit\(saleHistoryPageSize\)[\s\S]*?\.offset\(pagination\.offset\)/,
  )
})

test('rota de vendas usa filtros validados como dependências do loader', async () => {
  const source = await readFile(
    new URL('../src/routes/vendas.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /validateSearch: saleSearch/)
  assert.match(source, /loaderDeps: \(\{ search \}\)/)
  assert.match(source, /pendingComponent: SalesPending/)
  assert.match(source, /errorComponent: SalesError/)
  assert.match(source, /locationId: search\.locationId/)
  assert.match(source, /productId: search\.productId/)
})
