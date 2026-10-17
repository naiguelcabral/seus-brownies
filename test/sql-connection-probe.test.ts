import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { probeSqlConnection } from '../src/features/diagnostics/connection-probe'
import type { ProbeClient } from '../src/features/diagnostics/connection-probe'
import { assertPrincipalPermission } from '../src/features/auth/principal'
import { serverFunctionPolicies } from '../src/features/auth/server-function-policy'
import { appRoles } from '../src/features/auth/authorization'
import { requiredPermissionForRoute } from '../src/features/auth/ui-access'

function fixture(failAt?: string, readOnly = 'on') {
  const calls: string[] = []
  const client: ProbeClient = {
    connect: async () => {
      calls.push('connect')
      if (failAt === 'connect') throw new Error('private DSN/password')
    },
    query: async (statement) => {
      calls.push(statement)
      if (statement.startsWith(failAt ?? 'NEVER')) {
        throw new Error('private DSN/password')
      }
      return { rows: [{ connection_ok: 1, read_only: readOnly }] }
    },
    end: async () => {
      calls.push('end')
      if (failAt === 'end') throw new Error('private DSN/password')
    },
  }
  return { calls, client }
}

test('probe desativado não cria cliente nem inicia conexão', async () => {
  const result = await probeSqlConnection(false, () => {
    throw new Error('não deve criar cliente')
  })
  assert.equal(result.status, 'disabled')
  assert.equal(result.ok, false)
})

test('sucesso exige READ ONLY e rollback antes de fechar', async () => {
  const { calls, client } = fixture()
  const result = await probeSqlConnection(true, () => client)
  assert.equal(result.status, 'connected')
  assert.equal(result.ok, true)
  assert.deepEqual(calls, [
    'connect',
    'BEGIN READ ONLY',
    "SELECT 1 AS connection_ok, current_setting('transaction_read_only') AS read_only",
    'ROLLBACK',
    'end',
  ])
  assert.deepEqual(Object.keys(result).sort(), ['checkedAt', 'ok', 'status'])
})

for (const stage of ['connect', 'BEGIN', 'SELECT', 'ROLLBACK', 'end']) {
  test(`falha em ${stage} fecha conexão e não expõe erro privado`, async () => {
    const { calls, client } = fixture(stage)
    const result = await probeSqlConnection(true, () => client)
    assert.equal(result.status, 'unavailable')
    assert.equal(result.ok, false)
    assert.equal(calls.at(-1), 'end')
    if (stage === 'SELECT') assert.ok(calls.includes('ROLLBACK'))
    assert.doesNotMatch(JSON.stringify(result), /private|DSN|password/)
  })
}

test('resultado não confirma sucesso sem modo READ ONLY', async () => {
  const { client } = fixture(undefined, 'off')
  assert.equal((await probeSqlConnection(true, () => client)).ok, false)
})

test('somente papéis já autorizados para administração podem diagnosticar', () => {
  const permission = serverFunctionPolicies.checkSqlConnection
  assert.equal(requiredPermissionForRoute('/diagnostico-conexao'), permission)
  assert.throws(() => assertPrincipalPermission(null, permission))
  for (const role of appRoles) {
    const principal = {
      id: 'test',
      email: 'test@example.com',
      emailVerified: true,
      role,
    }
    if (role === 'owner' || role === 'admin') {
      assert.doesNotThrow(() =>
        assertPrincipalPermission(principal, permission),
      )
    } else {
      assert.throws(() => assertPrincipalPermission(principal, permission))
    }
  }
  assert.throws(() =>
    assertPrincipalPermission(
      {
        id: 'test',
        email: 'test@example.com',
        emailVerified: false,
        role: 'owner',
      },
      permission,
    ),
  )
})

test('ponte usa POST/CSRF existente, no-store e gate antes da autorização SQL', () => {
  const source = readFileSync('src/features/diagnostics/functions.ts', 'utf8')
  assert.match(source, /method: 'POST'/)
  assert.match(source, /'Cache-Control', 'no-store'/)
  assert.match(source, /SQL_CONNECTION_PROBE_ENABLED !== 'true'/)
  assert.match(
    source,
    /requireProbeEnabled,\s+requireServerFunctionPermission\('checkSqlConnection'\)/,
  )
})
