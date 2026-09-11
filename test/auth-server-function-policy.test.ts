import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { serverFunctionPolicies } from '../src/features/auth/server-function-policy'

test('toda Server Function operacional mapeada recebe uma permissão explícita', () => {
  assert.equal(Object.keys(serverFunctionPolicies).length, 45)
  assert.equal(serverFunctionPolicies.createSale, 'sales:write')
  assert.equal(
    serverFunctionPolicies.getOperationalReports,
    'reports:financial:read',
  )
  assert.equal(
    serverFunctionPolicies.recordPositiveAdjustmentLifecycle,
    'fifo:lifecycle:write',
  )
  assert.equal(serverFunctionPolicies.getFifoMigrationAudit, 'fifo:audit:read')
  assert.equal(serverFunctionPolicies.deliverSale, 'sales:write')
  assert.equal(
    serverFunctionPolicies.compensateDeliveredSale,
    'financial:compensation:write',
  )
  assert.equal(
    serverFunctionPolicies.closeFinancialPeriod,
    'financial:period:close',
  )
  assert.equal(
    serverFunctionPolicies.correctFinancialEvent,
    'financial:period:correct',
  )
  assert.equal(
    serverFunctionPolicies.getFinancialOverview,
    'reports:financial:read',
  )
})

test('as 45 Server Functions inventariadas aplicam o middleware no servidor', async () => {
  const source = await Promise.all(
    [
      'src/features/catalog/functions.ts',
      'src/features/action-plans/functions.ts',
      'src/features/locations/functions.ts',
      'src/features/management/functions.ts',
      'src/features/operations/functions.ts',
      'src/features/production/functions.ts',
      'src/features/reports/functions.ts',
      'src/features/inventory/fifo-migration-audit.ts',
      'src/features/inventory/lifecycle-writers.ts',
      'src/features/finance/functions.ts',
    ].map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')),
  )
  const combined = source.join('\n')

  for (const name of Object.keys(serverFunctionPolicies)) {
    assert.match(
      combined,
      new RegExp(`requireServerFunctionPermission\\('${name}'\\)`),
    )
  }
})

test('a instância global declara CSRF para métodos mutáveis', async () => {
  const source = await readFile(
    new URL('../src/start.ts', import.meta.url),
    'utf8',
  )
  assert.match(source, /createCsrfMiddleware\(\{/)
  assert.match(
    source,
    /\['POST', 'PUT', 'PATCH', 'DELETE'\]\.includes\(request\.method\)/,
  )
})
