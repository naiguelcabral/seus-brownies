import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { products, purchaseItems } from '../src/db/schema'
import {
  calculateReorderStatus,
  normalizeReorderPoint,
} from '../src/features/inventory/reorder'
import {
  calculateInventoryPage,
  endOfInventoryDay,
} from '../src/features/inventory/history'

test('normaliza ponto de reposição na unidade canônica sem ponto flutuante', () => {
  assert.equal(normalizeReorderPoint('0,5'), '0.500')
  assert.equal(normalizeReorderPoint('90071992547.125'), '90071992547.125')
  assert.equal(normalizeReorderPoint('100000000000.125'), null)
  assert.equal(normalizeReorderPoint('-1'), null)
  assert.equal(normalizeReorderPoint('1.0001'), null)
  assert.equal(normalizeReorderPoint(''), null)
})

test('classifica reposição no limite exato sem converter a quantidade para Number', () => {
  assert.equal(calculateReorderStatus('4.999', '5.000'), 'reorder')
  assert.equal(calculateReorderStatus('5.000', '5.000'), 'reorder')
  assert.equal(calculateReorderStatus('5.001', '5.000'), 'ok')
  assert.equal(
    calculateReorderStatus('90071992547.001', '90071992547.000'),
    'ok',
  )
  assert.equal(calculateReorderStatus('0.000', null), 'not_configured')
})

test('compra inclui lote e validade no hash idempotente e na mesma transação', async () => {
  const source = await readFile(
    new URL('../src/features/operations/functions.ts', import.meta.url),
    'utf8',
  )
  const writer = source.slice(
    source.indexOf('export const createPurchase'),
    source.indexOf('export const listInventory'),
  )
  assert.match(writer, /supplierLot: item\.supplierLot\?\.trim\(\) \|\| null/)
  assert.match(writer, /expiresOn: item\.expiresOn \|\| null/)
  assert.match(writer, /onConflictDoNothing/)
  assert.match(writer, /appendOperationalAudit/)
  assert.match(source, /eq\(stockMovements\.referenceType, 'purchase_item'\)/)
  assert.match(source, /leftJoin\(purchases/)
})

test('schema e migration de estoque gerencial são somente aditivos', async () => {
  assert.equal(products.reorderPoint.name, 'reorder_point')
  assert.equal(purchaseItems.supplierLot.name, 'supplier_lot')
  assert.equal(purchaseItems.expiresOn.name, 'expires_on')
  const migration = await readFile(
    new URL('../drizzle/0021_short_korvac.sql', import.meta.url),
    'utf8',
  )
  assert.match(migration, /products.*reorder_point/s)
  assert.match(migration, /purchase_items.*supplier_lot/s)
  assert.match(migration, /purchase_items.*expires_on/s)
  assert.doesNotMatch(migration, /DROP|TRUNCATE|DELETE FROM/i)
})

test('tela de estoque decide alerta pelo status exato calculado no servidor', async () => {
  const source = await readFile(
    new URL('../src/routes/estoque.tsx', import.meta.url),
    'utf8',
  )
  assert.match(source, /item\.reorderStatus === 'reorder'/)
  assert.doesNotMatch(source, /Number\(item\.balance\)/)
})

test('paginação e período do razão de estoque preservam limites', () => {
  assert.deepEqual(calculateInventoryPage(0, 41, 20), {
    page: 1,
    pageSize: 20,
    totalPages: 3,
    offset: 0,
  })
  assert.deepEqual(calculateInventoryPage(9, 41, 20), {
    page: 3,
    pageSize: 20,
    totalPages: 3,
    offset: 40,
  })
  assert.equal(
    endOfInventoryDay('2026-09-10').toISOString(),
    '2026-09-11T00:00:00.000Z',
  )
})

test('consulta de estoque filtra no servidor e mantém produtos das ações separados', async () => {
  const source = await readFile(
    new URL('../src/features/operations/functions.ts', import.meta.url),
    'utf8',
  )
  const inventory = source.slice(
    source.indexOf('const inventorySearchValues'),
    source.indexOf('const saleValues'),
  )

  assert.match(inventory, /\.validator\(inventorySearchValues\)/)
  assert.match(inventory, /ilike\(products\.name/)
  assert.match(inventory, /data\.reorderStatus/)
  assert.match(inventory, /movementFilters/)
  assert.match(inventory, /\.limit\(inventoryMovementPageSize\)/)
  assert.match(inventory, /\.offset\(movementPagination\.offset\)/)
  assert.match(inventory, /actionProducts/)
})

test('dashboard usa ponto de reposição e não converte saldo para Number', async () => {
  const source = await readFile(
    new URL('../src/features/operations/functions.ts', import.meta.url),
    'utf8',
  )
  const dashboard = source.slice(source.indexOf('export const getDashboard'))

  assert.match(dashboard, /reorderPoint: products\.reorderPoint/)
  assert.match(dashboard, /calculateReorderStatus/)
  assert.doesNotMatch(dashboard, /Number\(item\.balance\)/)
})

test('rota de estoque usa busca validada, paginação e estados explícitos', async () => {
  const source = await readFile(
    new URL('../src/routes/estoque.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /validateSearch: inventorySearch/)
  assert.match(source, /loaderDeps: \(\{ search \}\)/)
  assert.match(source, /listInventory\(\{ data: deps \}\)/)
  assert.match(source, /pendingComponent: InventoryPending/)
  assert.match(source, /errorComponent: InventoryError/)
  assert.match(source, /Paginação do razão de estoque/)
})
