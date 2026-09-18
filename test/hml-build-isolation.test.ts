import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('build HML usa HEAD limpo e ambiente isolado', async () => {
  const [script, packageJson] = await Promise.all([
    readFile(
      new URL('../scripts/build-hml-isolated.sh', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ])
  const scripts = JSON.parse(packageJson).scripts as Record<string, string>

  assert.match(script, /git -C "\$repository_root" archive --format=tar HEAD/)
  assert.match(script, /env -i/)
  assert.match(script, /CLOUDFLARE_ENV=hml/)
  assert.match(script, /CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false/)
  assert.match(
    script,
    /WRANGLER_LOG_PATH="\$temporary_directory\/wrangler\.log"/,
  )
  assert.match(script, /WRANGLER_LOG_SANITIZE=true/)
  assert.match(script, /wrangler deploy --env hml/)
  assert.doesNotMatch(script, /dotenv|source\s+.*\.env/)
  assert.equal(scripts['build:hml'], 'bash scripts/build-hml-isolated.sh')
  assert.equal(
    scripts['deploy:hml'],
    'HML_DEPLOY=1 bash scripts/build-hml-isolated.sh',
  )
})
