import assert from 'node:assert/strict'
import test from 'node:test'

import { createAuthorizationGuard } from '../src/features/auth/guard'
import { AuthenticationRequiredError } from '../src/features/auth/principal'

test('guard resolve principal no servidor antes de autorizar', async () => {
  const guard = createAuthorizationGuard(async () => ({
    id: 'identity-1',
    email: 'gestor@example.test',
    emailVerified: true,
    role: 'manager',
  }))
  assert.equal((await guard('purchases:write')).role, 'manager')
})

test('guard nega quando resolvedor não encontra sessão', async () => {
  const guard = createAuthorizationGuard(async () => null)
  await assert.rejects(() => guard('catalog:read'), AuthenticationRequiredError)
})
