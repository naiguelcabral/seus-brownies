import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { hasPermission } from '../src/features/auth/authorization'
import {
  homeRouteForRole,
  requiredPermissionForRoute,
} from '../src/features/auth/ui-access'

test('funcionário inicia em compras e preserva a matriz aprovada', () => {
  assert.equal(homeRouteForRole('employee'), '/compras')
  assert.equal(requiredPermissionForRoute('/'), 'dashboard:read')
  assert.equal(requiredPermissionForRoute('/compras'), 'purchases:write')
  assert.equal(requiredPermissionForRoute('/vendas'), 'sales:write')
  assert.equal(requiredPermissionForRoute('/locais'), 'catalog:write')
  assert.equal(requiredPermissionForRoute('/parametros'), 'access:manage')
  assert.equal(requiredPermissionForRoute('/plano-de-acao'), 'access:manage')

  assert.equal(hasPermission('employee', 'catalog:read'), true)
  assert.equal(hasPermission('employee', 'purchases:write'), true)
  assert.equal(hasPermission('employee', 'sales:write'), true)
  assert.equal(hasPermission('employee', 'dashboard:read'), false)
  assert.equal(hasPermission('employee', 'purchases:read'), false)
  assert.equal(hasPermission('employee', 'sales:read'), false)
  assert.equal(hasPermission('employee', 'catalog:write'), false)
  assert.equal(hasPermission('employee', 'fifo:lifecycle:write'), false)
})

test('loaders de compra e venda não consultam histórico sem permissão', async () => {
  const [purchases, sales] = await Promise.all([
    readFile(new URL('../src/routes/compras.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/vendas.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(purchases, /hasPermission\(context\.appRole, 'purchases:read'\)/)
  assert.match(
    purchases,
    /canReadHistory[\s\S]*?\? await listPurchases\(\{ data: deps \}\)[\s\S]*?: \{ purchases: \[\]/,
  )
  assert.match(sales, /hasPermission\(context\.appRole, 'sales:read'\)/)
  assert.match(
    sales,
    /canReadHistory[\s\S]*?\? await listSales\(\{ data: deps \}\)[\s\S]*?: \{ sales: \[\]/,
  )
  assert.match(sales, /canManageLifecycle && canCancelSale/)
})

test('catálogo permanece consultável e oculta mutações do funcionário', async () => {
  const [categories, products] = await Promise.all([
    readFile(new URL('../src/routes/categorias.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/produtos.tsx', import.meta.url), 'utf8'),
  ])

  for (const source of [categories, products]) {
    assert.match(source, /hasPermission\(appRole, 'catalog:write'\)/)
    assert.match(source, /canWrite \? \(/)
  }
})
