import assert from 'node:assert/strict'
import test from 'node:test'

import { readNeonAuthRuntimeConfig } from '../src/features/auth/runtime-config.server'

test('configuração Neon Auth permanece inativa sem os dois bindings server-side', () => {
  assert.equal(readNeonAuthRuntimeConfig({}), null)
  assert.equal(
    readNeonAuthRuntimeConfig({
      NEON_AUTH_BASE_URL: 'https://auth.example.test',
    }),
    null,
  )
})

test('configuração aceita valores injetados sem carregar arquivos locais', () => {
  const config = readNeonAuthRuntimeConfig({
    NEON_AUTH_BASE_URL: 'https://auth.example.test',
    NEON_AUTH_COOKIE_SECRET: 'x'.repeat(32),
  })
  assert.deepEqual(config, {
    baseUrl: 'https://auth.example.test',
    cookieSecret: 'x'.repeat(32),
  })
})

test('segredo curto é rejeitado sem expor seu conteúdo', () => {
  assert.throws(
    () =>
      readNeonAuthRuntimeConfig({
        NEON_AUTH_BASE_URL: 'https://auth.example.test',
        NEON_AUTH_COOKIE_SECRET: 'curto',
      }),
    /ao menos 32 caracteres/,
  )
})
