import assert from 'node:assert/strict'
import test from 'node:test'

import {
  readNeonAuthRuntimeConfig,
  readPasswordResetRedirectTo,
} from '../src/features/auth/runtime-config.server'

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

test('callback de reset é explícito fora do desenvolvimento', () => {
  assert.throws(
    () => readPasswordResetRedirectTo({}, { development: false }),
    /não configurada/,
  )
  assert.equal(
    readPasswordResetRedirectTo(
      { PASSWORD_RESET_REDIRECT_ORIGIN: 'https://app.example.test' },
      { development: false },
    ),
    'https://app.example.test/login/redefinir-senha',
  )
})

test('callback rejeita credenciais, caminho e HTTP fora do desenvolvimento', () => {
  for (const origin of [
    'https://user:pass@app.example.test',
    'https://app.example.test/rota',
    'https://app.example.test?token=ficticio',
    'http://app.example.test',
  ]) {
    assert.throws(
      () =>
        readPasswordResetRedirectTo(
          { PASSWORD_RESET_REDIRECT_ORIGIN: origin },
          { development: false },
        ),
      /inválida/,
    )
  }
})

test('callback local possui fallback somente no desenvolvimento', () => {
  assert.equal(
    readPasswordResetRedirectTo({}, { development: true }),
    'http://localhost:3000/login/redefinir-senha',
  )
})
