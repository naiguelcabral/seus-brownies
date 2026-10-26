import assert from 'node:assert/strict'
import test from 'node:test'

import { hasPermission } from '../src/features/auth/authorization'
import {
  readSessionCreatedAt,
  sessionFollowsRoleChange,
  createNeonSessionResolver,
} from '../src/features/auth/neon-adapter'
import {
  registrationApprovalInput,
  assertEligibleRegistration,
  registrationRevision,
  RegistrationApprovalError,
} from '../src/features/auth/registration-approval'
import { requiredPermissionForRoute } from '../src/features/auth/ui-access'

const user = {
  id: 'synthetic-registration-1',
  name: 'Pessoa de teste',
  email: 'fixture@example.test',
  emailVerified: true,
  banned: false,
  updatedAt: new Date('2026-10-26T10:00:00Z'),
}
const input = {
  authUserId: user.id,
  revision: 'a'.repeat(64),
  reason: 'Cadastro conferido com a equipe',
  operationReference: 'e0b7d11b-cc09-483c-b4e2-a09340038ffd',
}

test('aprovação tem permissão própria, sem delegar administração ao gerente', () => {
  assert.equal(hasPermission('owner', 'access:approve'), true)
  assert.equal(hasPermission('manager', 'access:approve'), true)
  assert.equal(hasPermission('manager', 'access:manage'), false)
  for (const role of [
    'admin',
    'employee',
    'production',
    'sales',
    'viewer',
  ] as const) {
    assert.equal(hasPermission(role, 'access:approve'), false)
  }
  assert.equal(requiredPermissionForRoute('/acessos'), 'access:approve')
})

test('aprovação recusa papel, ator e indicadores de validação enviados pelo cliente', () => {
  assert.deepEqual(registrationApprovalInput.parse(input), input)
  for (const extra of [
    { role: 'owner' },
    { actorAuthUserId: 'owner' },
    { emailVerified: true },
    { isActive: true },
  ]) {
    assert.equal(
      registrationApprovalInput.safeParse({ ...input, ...extra }).success,
      false,
    )
  }
  for (const bad of [
    { ...input, operationReference: 'reused-free-text' },
    { ...input, revision: 'invalid' },
    { ...input, reason: ' ' },
    { ...input, reason: 'x'.repeat(501) },
    { ...input, authUserId: '' },
  ])
    assert.equal(registrationApprovalInput.safeParse(bad).success, false)
})

test('cadastro incompleto, não verificado, bloqueado ou ausente não é elegível', () => {
  assert.deepEqual(assertEligibleRegistration(user), user)
  for (const bad of [
    null,
    { ...user, name: '' },
    { ...user, email: 'invalid' },
    { ...user, emailVerified: false },
    { ...user, banned: true },
    { ...user, updatedAt: 'invalid' },
  ]) {
    assert.throws(
      () => assertEligibleRegistration(bad),
      RegistrationApprovalError,
    )
  }
})

test('revisão detecta alteração da identidade exibida antes da aprovação', async () => {
  const revision = await registrationRevision(user)
  assert.match(revision, /^[a-f0-9]{64}$/)
  assert.equal(await registrationRevision({ ...user }), revision)
  for (const changed of [
    { ...user, id: 'other' },
    { ...user, name: 'Outro cadastro' },
    { ...user, email: 'other@example.test' },
    { ...user, emailVerified: false },
    { ...user, banned: true },
    { ...user, updatedAt: new Date('2026-10-26T10:01:00Z') },
  ])
    assert.notEqual(await registrationRevision(changed), revision)
})

test('sessão anterior ou igual à mudança de papel não recebe os novos privilégios', () => {
  const changed = new Date('2026-10-26T10:00:00Z')
  for (const started of [
    null,
    undefined,
    Number.NaN,
    changed.getTime() - 1,
    changed.getTime(),
  ]) {
    assert.equal(sessionFollowsRoleChange(started, changed), false)
  }
  assert.equal(sessionFollowsRoleChange(changed.getTime() + 1, changed), true)
  assert.equal(sessionFollowsRoleChange(Date.now(), new Date('invalid')), false)
  assert.equal(sessionFollowsRoleChange(Date.now(), undefined), false)
  assert.equal(readSessionCreatedAt('invalid'), null)
  assert.equal(readSessionCreatedAt(123), null)
  assert.equal(readSessionCreatedAt(changed), changed.getTime())
})

test('resolver exige nova sessão do provedor após a primeira liberação', async () => {
  let createdAt = '2026-10-26T09:00:00Z'
  let roleUpdatedAt = new Date('2026-10-26T10:00:00Z')
  const identity = { id: user.id, email: user.email, emailVerified: true }
  const resolve = createNeonSessionResolver(
    {
      getSession: async () => ({
        data: { user: identity, session: { createdAt } },
      }),
    },
    async () => ({ role: 'employee', isActive: true, roleUpdatedAt }),
  )
  assert.equal((await resolve()).principal, null)
  createdAt = '2026-10-26T10:00:01Z'
  assert.equal((await resolve()).principal?.role, 'employee')
  roleUpdatedAt = new Date('2026-10-26T10:00:02Z')
  assert.equal((await resolve()).principal, null)
})

test('sessão sem timestamp confiável não satisfaz a atualização de papel', async () => {
  const resolve = createNeonSessionResolver(
    { getSession: async () => ({ data: { user } }) },
    async () => ({
      role: 'owner',
      isActive: true,
      roleUpdatedAt: user.updatedAt,
    }),
  )
  assert.equal((await resolve()).principal, null)
})
