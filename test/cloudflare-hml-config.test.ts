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
      secrets: { required: string[] }
    }
  }
}

test('Worker HML é separado e preserva a compatibilidade do Worker principal', async () => {
  const text = await readFile(
    new URL('../wrangler.jsonc', import.meta.url),
    'utf8',
  )
  const config = JSON.parse(text) as WranglerConfig

  assert.equal(config.name, 'cacau-v1')
  assert.equal(config.compatibility_date, '2025-09-02')
  assert.deepEqual(config.compatibility_flags, ['nodejs_compat'])
  assert.equal(config.env.hml.name, 'cacau-v1-hml')
  assert.equal(config.env.hml.workers_dev, false)
  assert.deepEqual(config.env.hml.secrets.required, [
    'DATABASE_URL',
    'NEON_AUTH_BASE_URL',
    'NEON_AUTH_COOKIE_SECRET',
    'TURNSTILE_SECRET_KEY',
  ])
})
