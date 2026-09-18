import assert from 'node:assert/strict'
import test from 'node:test'

import { createAuthAuditEvent } from '../src/features/auth/audit'

test('evento de autenticação aceita apenas metadados explicitamente tipados', () => {
  assert.deepEqual(
    createAuthAuditEvent({
      action: 'login',
      outcome: 'blocked',
      metadata: { challengeRequired: true, reasonCode: 'cooldown' },
    }),
    {
      action: 'login',
      outcome: 'blocked',
      metadata: { challengeRequired: true, reasonCode: 'cooldown' },
    },
  )
})
