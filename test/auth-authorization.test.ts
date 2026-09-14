import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AuthorizationError,
  assertPermission,
  hasPermission,
  isAppRole,
} from '../src/features/auth/authorization'

test('dono recebe todas as permissões definidas pela aplicação', () => {
  assert.equal(hasPermission('owner', 'access:manage'), true)
  assert.equal(hasPermission('owner', 'fifo:lifecycle:write'), true)
  // Existing links remain safe until migration 0016 is applied in HML.
  assert.equal(hasPermission('admin', 'access:manage'), true)
  assert.equal(hasPermission('owner', 'financial:period:correct'), true)
  assert.equal(hasPermission('admin', 'financial:period:correct'), false)
  assert.equal(hasPermission('owner', 'scenarios:write'), true)
  assert.equal(hasPermission('admin', 'scenarios:write'), false)
  assert.equal(hasPermission('admin', 'scenarios:read'), true)
})

test('papéis operacionais recebem apenas o menor privilégio já decidido', () => {
  assert.equal(hasPermission('production', 'production:write'), true)
  assert.equal(hasPermission('production', 'sales:write'), false)
  assert.equal(hasPermission('sales', 'sales:write'), true)
  assert.equal(hasPermission('sales', 'inventory:read'), false)
  assert.equal(hasPermission('viewer', 'catalog:read'), true)
  assert.equal(hasPermission('viewer', 'reports:financial:read'), false)
  assert.equal(hasPermission('manager', 'fifo:lifecycle:write'), false)
  assert.equal(hasPermission('manager', 'financial:compensation:write'), true)
  assert.equal(hasPermission('sales', 'financial:compensation:write'), false)
  assert.equal(hasPermission('manager', 'financial:period:close'), false)
  assert.equal(hasPermission('manager', 'financial:period:correct'), false)
  assert.equal(hasPermission('manager', 'scenarios:read'), true)
  assert.equal(hasPermission('manager', 'scenarios:write'), false)
})

test('funcionário só pode registrar compra e venda sem acesso a relatórios', () => {
  assert.equal(hasPermission('employee', 'catalog:read'), true)
  assert.equal(hasPermission('employee', 'purchases:write'), true)
  assert.equal(hasPermission('employee', 'sales:write'), true)
  assert.equal(hasPermission('employee', 'purchases:read'), false)
  assert.equal(hasPermission('employee', 'sales:read'), false)
  assert.equal(hasPermission('employee', 'dashboard:read'), false)
  assert.equal(hasPermission('employee', 'reports:financial:read'), false)
  assert.equal(hasPermission('employee', 'access:manage'), false)
  assert.equal(hasPermission('employee', 'scenarios:read'), false)
  assert.equal(hasPermission('employee', 'scenarios:write'), false)
})

test('validação e falha de autorização não aceitam papel fornecido livremente', () => {
  assert.equal(isAppRole('manager'), true)
  assert.equal(isAppRole('owner'), true)
  assert.equal(isAppRole('employee'), true)
  assert.equal(isAppRole('gestor'), false)
  assert.equal(isAppRole('administrator'), false)

  assert.throws(
    () => assertPermission('sales', 'expenses:write'),
    (error: unknown) => error instanceof AuthorizationError,
  )
})
