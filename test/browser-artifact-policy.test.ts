import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Playwright keeps new browser artifacts outside Git and ignores fallback paths', async () => {
  const [gitignore, localConfig, hmlConfig] = await Promise.all([
    readFile(new URL('../.gitignore', import.meta.url), 'utf8'),
    readFile(new URL('../playwright.config.ts', import.meta.url), 'utf8'),
    readFile(
      new URL('../playwright.auth-hml.config.ts', import.meta.url),
      'utf8',
    ),
  ])

  assert.match(gitignore, /^playwright-report\/$/m)
  assert.match(gitignore, /^test-results\/$/m)
  assert.match(localConfig, /artifactRoot = '\/tmp\/seus-brownies-playwright'/)
  assert.match(localConfig, /outputDir: `\$\{artifactRoot\}\/results`/)
  assert.match(hmlConfig, /outputDir: '\/tmp\/seus-brownies-auth-hml-e2e'/)
  assert.match(hmlConfig, /trace: 'off'/)
  assert.match(hmlConfig, /screenshot: 'off'/)
  assert.match(hmlConfig, /video: 'off'/)
})
