import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { z } from 'zod'

const hmlUrl = 'https://cacau-v1-hml.naiguelcabral.workers.dev'

test('spec HML de auth exige opt-in antes de qualquer navegador ou rede', async () => {
  const config = await readFile('playwright.auth-hml.config.ts', 'utf8')

  assert.match(config, /CACAU_HML_AUTH_E2E !== 'authorized'/)
  const configuredUrls = config.match(/https?:\/\/[^'\s]+/g)
  assert.deepEqual(configuredUrls, [hmlUrl])
  assert.ok(configuredUrls)
  for (const url of configuredUrls) {
    assert.equal(new URL(url).origin, hmlUrl)
  }
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

const run = promisify(execFile)
const collectedTest = z.object({
  expectedStatus: z.string(),
  annotations: z.array(z.object({ type: z.string() })),
})
const collectionReport = z.object({
  suites: z.array(
    z.object({
      specs: z.array(
        z.object({
          title: z.string(),
          tests: z.array(collectedTest),
        }),
      ),
    }),
  ),
})

function assertExecutableCase(
  result: z.infer<typeof collectedTest>,
  title: string,
) {
  assert.equal(result.expectedStatus, 'passed', title)
  // Playwright 1.64 reports suite scheduling as an inherited annotation.
  // Only serial is neutral here: skip/fixme/fail and unknown types still fail.
  assert.deepEqual(
    result.annotations.filter(({ type }) => type !== 'serial'),
    [],
    title,
  )
}

test('coleta aceita metadado serial sem dispensar execução', () => {
  for (const annotations of [[], [{ type: 'serial' }]]) {
    assertExecutableCase(
      { expectedStatus: 'passed', annotations },
      'synthetic-executable-case',
    )
  }
})

test('coleta rejeita dispensa de execução mesmo junto ao metadado serial', () => {
  for (const type of ['skip', 'fixme', 'fail', 'slow', 'unexpected']) {
    for (const annotations of [[{ type }], [{ type: 'serial' }, { type }]]) {
      assert.throws(
        () =>
          assertExecutableCase(
            { expectedStatus: 'passed', annotations },
            'synthetic-executable-case',
          ),
        { code: 'ERR_ASSERTION' },
      )
    }
  }
  for (const expectedStatus of ['skipped', 'failed']) {
    assert.throws(
      () =>
        assertExecutableCase(
          { expectedStatus, annotations: [{ type: 'serial' }] },
          'synthetic-executable-case',
        ),
      { code: 'ERR_ASSERTION' },
    )
  }
})

test('coleta offline mantém seis casos executáveis e quatro etapas humanas pendentes', async () => {
  // --list only collects tests: no browser, provider request or real identity.
  const identity = {
    email: 'synthetic@example.invalid',
    password: 'synthetic-not-a-password',
  }
  const identities = Object.fromEntries(
    ['owner', 'noAllowlist', 'inactive', 'insufficientRole', 'unverified'].map(
      (role) => [role, identity],
    ),
  )
  const { stdout } = await run(
    process.execPath,
    [
      fileURLToPath(import.meta.resolve('@playwright/test/cli')),
      'test',
      '--config=playwright.auth-hml.config.ts',
      '--list',
      '--reporter=json',
    ],
    {
      env: {
        PATH: process.env.PATH ?? '',
        CACAU_HML_AUTH_E2E: 'authorized',
        CACAU_HML_AUTH_E2E_INPUT: JSON.stringify({ identities }),
      },
      timeout: 30_000,
      maxBuffer: 1_000_000,
    },
  )
  const report = collectionReport.parse(JSON.parse(stdout))
  assert.equal(report.suites.length, 1)
  const suite = report.suites[0]
  assert.ok(suite)
  assert.equal(suite.specs.length, 10)
  const executable = suite.specs.slice(0, 6)
  for (const spec of executable) {
    assert.equal(spec.tests.length, 1)
    for (const result of spec.tests) {
      assertExecutableCase(result, spec.title)
    }
  }
  const manual = suite.specs.slice(6)
  for (const spec of manual) {
    assert.equal(spec.tests.length, 1)
    for (const result of spec.tests) {
      assert.equal(result.expectedStatus, 'skipped', spec.title)
      assert.ok(result.annotations.some(({ type }) => type === 'fixme'))
    }
  }
})
