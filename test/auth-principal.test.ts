import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AuthenticationRequiredError,
  assertPrincipalPermission,
  VerifiedEmailRequiredError,
} from '../src/features/auth/principal'
import type { AppPrincipal } from '../src/features/auth/principal'

const salesPrincipal: AppPrincipal = {
  id: 'identity-123',
  email: 'vendas@example.test',
  emailVerified: true,
  role: 'sales',
}

test('guarda exige principal autenticado e e-mail verificado', () => {
  assert.throws(
    () => assertPrincipalPermission(null, 'sales:write'),
    AuthenticationRequiredError,
  )
  assert.throws(
    () =>
      assertPrincipalPermission(
        { ...salesPrincipal, emailVerified: false },
        'sales:write',
      ),
    VerifiedEmailRequiredError,
  )
})

test('guarda retorna somente principal autorizado pelo servidor', () => {
  assert.equal(
    assertPrincipalPermission(salesPrincipal, 'sales:write'),
    salesPrincipal,
  )
  assert.throws(() =>
    assertPrincipalPermission(salesPrincipal, 'expenses:write'),
  )
  assert.throws(() =>
    assertPrincipalPermission(
      { ...salesPrincipal, role: 'manager' },
      'access:manage',
    ),
  )
})
