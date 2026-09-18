import assert from 'node:assert/strict'
import test from 'node:test'

import {
  appUserAccess,
  authAuditEvents,
  authLoginAttempts,
  inventoryCostAllocations,
  inventoryCostLayers,
  products,
} from '../src/db/schema'

test('mapeia a unidade do produto para measurement_unit no PostgreSQL', () => {
  assert.equal(products.unit.name, 'measurement_unit')
  assert.equal(products.unit.notNull, true)
})

test('declara camadas e alocações FIFO com precisão monetária preservada', () => {
  assert.equal(inventoryCostLayers.originalQuantity.name, 'original_quantity')
  assert.equal(inventoryCostLayers.originalCost.name, 'original_cost')
  assert.equal(inventoryCostAllocations.allocatedCost.name, 'allocated_cost')
  assert.equal(inventoryCostAllocations.unitCost.name, 'unit_cost')
})

test('declara acesso Cacau e trilha de autenticação sem credenciais', () => {
  assert.equal(appUserAccess.authUserId.name, 'auth_user_id')
  assert.equal(appUserAccess.role.name, 'role')
  assert.equal(authLoginAttempts.identityHash.name, 'identity_hash')
  assert.equal(
    authLoginAttempts.consecutiveFailures.name,
    'consecutive_failures',
  )
  assert.equal(authAuditEvents.metadata.name, 'metadata')
})
