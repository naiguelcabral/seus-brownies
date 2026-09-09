import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('catálogo permanece protegido, filtrado e paginado no servidor', async () => {
  const source = await readFile(
    new URL('../src/features/catalog/functions.ts', import.meta.url),
    'utf8',
  )

  assert.match(
    source,
    /listProducts = createServerFn[\s\S]*?requireServerFunctionPermission\('listProducts'\)/,
  )
  assert.match(
    source,
    /listProducts = createServerFn[\s\S]*?\.validator\(productHistoryValues\)/,
  )
  assert.match(source, /ilike\(products\.name/)
  assert.match(source, /ilike\(products\.sku/)
  assert.match(source, /eq\(products\.isActive, data\.activity === 'active'\)/)
  assert.match(
    source,
    /\.limit\(productHistoryPageSize\)[\s\S]*?\.offset\(pagination\.offset\)/,
  )
})

test('rota de produtos usa filtros validados como dependências do loader', async () => {
  const source = await readFile(
    new URL('../src/routes/produtos.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /validateSearch: productSearch/)
  assert.match(source, /loaderDeps: \(\{ search \}\)/)
  assert.match(source, /pendingComponent: ProductsPending/)
  assert.match(source, /errorComponent: ProductsError/)
})
