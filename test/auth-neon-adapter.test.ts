import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AuthSessionUnavailableError,
  createNeonPrincipalResolver,
  createNeonSessionResolver,
} from '../src/features/auth/neon-adapter'

test('adapter Neon converte sessão e vínculo Cacau em principal', async () => {
  const resolvePrincipal = createNeonPrincipalResolver(
    {
      getSession: async () => ({
        data: {
          user: { id: 'neon-1', email: 'a@example.test', emailVerified: true },
        },
      }),
    },
    async (id) =>
      id === 'neon-1' ? { role: 'manager', isActive: true } : null,
  )
  assert.deepEqual(await resolvePrincipal(), {
    id: 'neon-1',
    email: 'a@example.test',
    emailVerified: true,
    role: 'manager',
  })
})

test('adapter Neon falha fechado sem sessão ou vínculo ativo', async () => {
  const noSession = createNeonPrincipalResolver(
    { getSession: async () => ({ data: null }) },
    async () => ({ role: 'admin', isActive: true }),
  )
  const inactive = createNeonPrincipalResolver(
    {
      getSession: async () => ({
        data: {
          user: { id: 'neon-1', email: 'a@example.test', emailVerified: true },
        },
      }),
    },
    async () => ({ role: 'admin', isActive: false }),
  )
  assert.equal(await noSession(), null)
  assert.equal(await inactive(), null)
})

test('identidade Neon válida sem app_user_access não recebe principal', async () => {
  const resolvePrincipal = createNeonPrincipalResolver(
    {
      getSession: async () => ({
        data: {
          user: {
            id: 'neon-without-access',
            email: 'externo@example.test',
            emailVerified: true,
          },
        },
      }),
    },
    async () => null,
  )
  assert.equal(await resolvePrincipal(), null)
})

test('adapter Neon nega vínculo sem papel canônico válido', async () => {
  const resolvePrincipal = createNeonPrincipalResolver(
    {
      getSession: async () => ({
        data: {
          user: {
            id: 'neon-1',
            email: 'a@example.test',
            emailVerified: true,
          },
        },
      }),
    },
    async () => ({ role: 'administrator', isActive: true }),
  )
  assert.equal(await resolvePrincipal(), null)
})

test('status e principal usam a mesma leitura de sessão sem consulta duplicada', async () => {
  let calls = 0
  const user = { id: 'neon-1', email: 'a@example.test', emailVerified: true }
  const resolveSession = createNeonSessionResolver(
    {
      getSession: async () => {
        calls += 1
        return { data: { user }, error: null }
      },
    },
    async () => ({ role: 'manager', isActive: true }),
  )
  assert.deepEqual(await resolveSession(), {
    user,
    principal: { ...user, role: 'manager' },
  })
  assert.equal(calls, 1)
})

for (const status of [429, 500, 503]) {
  test(`erro ${status} do provedor não vira sessão anônima nem permite acesso`, async () => {
    let reads = 0
    const resolvePrincipal = createNeonPrincipalResolver(
      { getSession: async () => ({ data: null, error: { status } }) },
      async () => {
        reads += 1
        return { role: 'owner', isActive: true }
      },
    )
    await assert.rejects(resolvePrincipal, AuthSessionUnavailableError)
    assert.equal(reads, 0)
  })
}

test('falha de rede é sanitizada e não impede recuperação na próxima leitura', async () => {
  let calls = 0
  const user = { id: 'neon-1', email: 'a@example.test', emailVerified: true }
  const resolveSession = createNeonSessionResolver(
    {
      getSession: async () => {
        if (++calls === 1) throw new Error('synthetic-private-provider-detail')
        return { data: { user } }
      },
    },
    async () => ({ role: 'manager', isActive: true }),
  )
  await assert.rejects(resolveSession, (error: unknown) => {
    assert.ok(error instanceof AuthSessionUnavailableError)
    assert.equal(error.statusCode, 503)
    assert.equal(error.message.includes('private'), false)
    return true
  })
  assert.equal((await resolveSession()).principal?.id, user.id)
})

test('identidade e acesso são revalidados, sem cache global ou acesso revogado retido', async () => {
  let active = true
  let id = 'neon-1'
  const resolveSession = createNeonSessionResolver(
    {
      getSession: async () => ({
        data: { user: { id, email: 'a@example.test', emailVerified: true } },
      }),
    },
    async () => ({ role: 'manager', isActive: active }),
  )
  assert.equal((await resolveSession()).principal?.id, 'neon-1')
  id = 'neon-2'
  assert.equal((await resolveSession()).principal?.id, 'neon-2')
  active = false
  const revoked = await resolveSession()
  assert.equal(revoked.user?.id, 'neon-2')
  assert.equal(revoked.principal, null)
})

test('resposta com erro e dados de usuário não autoriza o principal', async () => {
  const resolveSession = createNeonSessionResolver(
    {
      getSession: async () => ({
        data: {
          user: { id: 'neon-1', email: 'a@example.test', emailVerified: true },
        },
        error: { status: 429 },
      }),
    },
    async () => ({ role: 'owner', isActive: true }),
  )
  await assert.rejects(resolveSession, AuthSessionUnavailableError)
})

test('sessão rejeitada explicitamente com 401 continua anônima e sem acesso', async () => {
  const resolveSession = createNeonSessionResolver(
    { getSession: async () => ({ data: null, error: { status: 401 } }) },
    async () => {
      assert.fail('Não consultar vínculo para sessão rejeitada')
    },
  )
  assert.deepEqual(await resolveSession(), { user: null, principal: null })
})
