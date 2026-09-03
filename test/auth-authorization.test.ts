import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AuthorizationError,
  assertPermission,
  hasPermission,
  isAppRole,
} from '../src/features/auth/authorization'

test('admin recebe todas as permissões definidas pela aplicação', () => {
  assert.equal(hasPermission('admin', 'access:manage'), true)
  assert.equal(hasPermission('admin', 'fifo:lifecycle:write'), true)
})

test('papéis operacionais recebem apenas o menor privilégio já decidido', () => {
  assert.equal(hasPermission('production', 'production:write'), true)
  assert.equal(hasPermission('production', 'sales:write'), false)
  assert.equal(hasPermission('sales', 'sales:write'), true)
  assert.equal(hasPermission('sales', 'inventory:read'), false)
  assert.equal(hasPermission('viewer', 'catalog:read'), true)
  assert.equal(hasPermission('viewer', 'reports:financial:read'), false)
  assert.equal(hasPermission('manager', 'fifo:lifecycle:write'), false)
})

test('validação e falha de autorização não aceitam papel fornecido livremente', () => {
  assert.equal(isAppRole('manager'), true)
  assert.equal(isAppRole('gestor'), false)
  assert.equal(isAppRole('administrator'), false)

  assert.throws(
    () => assertPermission('sales', 'expenses:write'),
    (error: unknown) => error instanceof AuthorizationError,
  )
})
