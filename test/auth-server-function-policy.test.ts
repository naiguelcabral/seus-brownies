import assert from 'node:assert/strict'
import test from 'node:test'

import { serverFunctionPolicies } from '../src/features/auth/server-function-policy'

test('toda Server Function operacional mapeada recebe uma permissão explícita', () => {
  assert.equal(Object.keys(serverFunctionPolicies).length, 30)
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
})
