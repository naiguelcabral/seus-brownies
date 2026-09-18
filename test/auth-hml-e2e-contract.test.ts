import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const hmlUrl = 'https://cacau-v1-hml.naiguelcabral.workers.dev'

test('spec HML de auth exige opt-in antes de qualquer navegador ou rede', async () => {
  const config = await readFile('playwright.auth-hml.config.ts', 'utf8')

  assert.match(config, /CACAU_HML_AUTH_E2E !== 'authorized'/)
  assert.match(config, new RegExp(hmlUrl.replace(/[./]/g, '\\$&')))
  assert.deepEqual(config.match(/https?:\/\/[^'\s]+/g), [hmlUrl])
  assert.equal(config.includes('webServer'), false)
  assert.doesNotMatch(config, /baseURL:\s*process\.env/i)
})

test('spec HML de auth não registra credenciais nem coleta artefatos', async () => {
  const config = await readFile('playwright.auth-hml.config.ts', 'utf8')
  const spec = await readFile('e2e/auth-hml-non-destructive.spec.ts', 'utf8')

  assert.match(spec, /CACAU_HML_AUTH_E2E_INPUT/)
  assert.match(config, /trace: 'off'/)
  assert.match(config, /screenshot: 'off'/)
  assert.match(config, /video: 'off'/)
  assert.doesNotMatch(
    spec,
    /console\.(log|info|warn|error)|headers|storageState|context\(\)\.cookies/i,
  )
  assert.match(spec, /test\.fixme\([\s\S]*OTP real/)
  assert.match(spec, /test\.fixme\([\s\S]*recuperação real/)
  assert.match(spec, /test\.fixme\([\s\S]*auditoria persistida/)
})
