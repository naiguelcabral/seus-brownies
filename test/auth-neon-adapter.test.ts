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
