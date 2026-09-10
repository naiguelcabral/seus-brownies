import assert from 'node:assert/strict'
import test from 'node:test'

import { requireDatabaseEnvironment } from '../src/lib/env'

test('configuração de banco aceita URL PostgreSQL injetada pelo runtime', () => {
  const result = requireDatabaseEnvironment({
    DATABASE_URL: 'postgresql://user:password@example.test:5432/cacau',
  })

  assert.equal(
    result.DATABASE_URL,
    'postgresql://user:password@example.test:5432/cacau',
  )
})

test('configuração de banco falha sem expor valor ausente ou inválido', () => {
  assert.throws(
    () => requireDatabaseEnvironment({}),
    /Configuração de ambiente inválida: DATABASE_URL\./,
  )
  assert.throws(
    () => requireDatabaseEnvironment({ DATABASE_URL: 'https://example.test' }),
    /Configuração de ambiente inválida: DATABASE_URL\./,
  )
})
