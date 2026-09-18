import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('histórico de compras permanece protegido, filtrado e paginado no servidor', async () => {
  const source = await readFile(
    new URL('../src/features/operations/functions.ts', import.meta.url),
    'utf8',
  )

  assert.match(
    source,
    /listPurchases = createServerFn[\s\S]*?requireServerFunctionPermission\('listPurchases'\)/,
  )
  assert.match(
    source,
    /listPurchases = createServerFn[\s\S]*?\.validator\(purchaseHistoryValues\)/,
  )
  assert.match(source, /ilike\(purchases\.supplierName/)
  assert.match(
    source,
    /\.limit\(purchaseHistoryPageSize\)[\s\S]*?\.offset\(pagination\.offset\)/,
  )
})

test('rota de compras usa filtros validados como dependências do loader', async () => {
  const source = await readFile(
    new URL('../src/routes/compras.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /validateSearch: purchaseSearch/)
  assert.match(source, /loaderDeps: \(\{ search \}\)/)
  assert.match(source, /pendingComponent: PurchasesPending/)
  assert.match(source, /errorComponent: PurchasesError/)
})
