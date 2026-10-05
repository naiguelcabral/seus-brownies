import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { calculateProductionHistoryPage } from '../src/features/production/history'

test('paginação de produção limita o tamanho e ajusta páginas fora do intervalo', () => {
  assert.deepEqual(calculateProductionHistoryPage(0, 45), {
    page: 1,
    pageSize: 20,
    totalPages: 3,
    offset: 0,
  })
  assert.deepEqual(calculateProductionHistoryPage(9, 45), {
    page: 3,
    pageSize: 20,
    totalPages: 3,
    offset: 40,
  })
  assert.deepEqual(calculateProductionHistoryPage(4, 0), {
    page: 1,
    pageSize: 20,
    totalPages: 1,
    offset: 0,
  })
})

test('histórico de produção permanece protegido, filtrado e paginado no servidor', async () => {
  const source = await readFile(
    new URL('../src/features/production/functions.ts', import.meta.url),
    'utf8',
  )
  const workspace = source.slice(
    source.indexOf('export const getProductionWorkspace'),
    source.indexOf('export const previewProductionBatch'),
  )

  assert.match(
    workspace,
    /requireServerFunctionPermission\('getProductionWorkspace'\)/,
  )
  assert.match(workspace, /\.validator\(productionHistoryValues\)/)
  assert.match(workspace, /ilike\(recipeVersions\.name/)
  assert.match(workspace, /exists\(/)
  assert.match(workspace, /filterOutput\.productId/)
  assert.match(workspace, /productionBatches\.sourceId} is null/)
  assert.match(
    workspace,
    /\.limit\(productionHistoryPageSize\)[\s\S]*?\.offset\(pagination\.offset\)/,
  )
})

test('rota de produção usa filtros validados, estados explícitos e paginação acessível', async () => {
  const source = await readFile(
    new URL('../src/routes/producao.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /validateSearch: productionSearch/)
  assert.match(source, /loaderDeps: \(\{ search \}\)/)
  assert.match(source, /getProductionWorkspace\(\{ data: deps \}\)/)
  assert.match(source, /pendingComponent: ProductionPending/)
  assert.match(source, /errorComponent: ProductionError/)
  assert.match(source, /aria-label="Paginação dos lotes de produção"/)
  assert.match(source, /Nenhum lote real encontrado para esses filtros/)
})
