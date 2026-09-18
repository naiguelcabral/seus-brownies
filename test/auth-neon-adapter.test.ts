import assert from 'node:assert/strict'
import test from 'node:test'

import { createNeonPrincipalResolver } from '../src/features/auth/neon-adapter'

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
