import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

type WranglerConfig = {
  name: string
  compatibility_date: string
  compatibility_flags: string[]
  env: {
    hml: {
      name: string
      workers_dev: boolean
      vars: { AUTH_RATE_LIMITER_REQUIRED: string }
      ratelimits: Array<{
        name: string
        namespace_id: string
        simple: { limit: number; period: number }
      }>
      secrets: { required: string[] }
    }
  }
  routes?: unknown
}

function parseJsonc(text: string) {
  return JSON.parse(text.replace(/,\s*([}\]])/g, '$1')) as WranglerConfig
}

test('Worker HML é separado e preserva a compatibilidade do Worker principal', async () => {
  const text = await readFile(
    new URL('../wrangler.jsonc', import.meta.url),
    'utf8',
  )
  const config = parseJsonc(text)

  assert.equal(config.name, 'cacau-v1')
  assert.equal(config.compatibility_date, '2025-09-02')
  assert.deepEqual(config.compatibility_flags, ['nodejs_compat'])
  assert.equal(config.env.hml.name, 'cacau-v1-hml')
  assert.equal(config.env.hml.workers_dev, true)
  assert.deepEqual(config.env.hml.vars, {
    AUTH_RATE_LIMITER_REQUIRED: 'true',
  })
  assert.deepEqual(config.env.hml.ratelimits, [
    {
      name: 'AUTH_RATE_LIMITER',
      namespace_id: '2026091001',
      simple: { limit: 20, period: 60 },
    },
  ])
  assert.equal(config.routes, undefined)
  assert.deepEqual(config.env.hml.secrets.required, [
    'DATABASE_URL',
    'NEON_AUTH_BASE_URL',
    'NEON_AUTH_COOKIE_SECRET',
    'TURNSTILE_SECRET_KEY',
    'AUTH_LOGIN_HASH_PEPPER',
  ])
})

test('build HML isolado só repassa a site key pública de Turnstile', async () => {
  const script = await readFile(
    new URL('../scripts/build-hml-isolated.sh', import.meta.url),
    'utf8',
  )

  assert.match(script, /CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false/)
  assert.match(
    script,
    /VITE_TURNSTILE_SITE_KEY="\$\{VITE_TURNSTILE_SITE_KEY\}"/,
  )
  assert.match(
    script,
    /Build HML exige VITE_TURNSTILE_SITE_KEY pública explícita/,
  )
  assert.doesNotMatch(script, /TURNSTILE_SECRET_KEY=/)
})
