import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
    /VITE_TURNSTILE_SITE_KEY="\$\{VITE_TURNSTILE_SITE_KEY\}"/,
  )
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

test('isolated build runs from clean archive with explicit public inputs only', () => {
  const root = mkdtempSync(join(tmpdir(), 'cacau-isolation-fixture-'))
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, stdio: 'pipe' })
  try {
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'node_modules'))
    mkdirSync(join(root, 'bin'))
    for (const name of ['build-hml-isolated.sh', 'git-sensitive-paths.py']) {
      copyFileSync(
        new URL(`../scripts/${name}`, import.meta.url),
        join(root, 'scripts', name),
      )
    }
    writeFileSync(join(root, '.gitignore'), '.env*\nnode_modules\nbin\n')
    writeFileSync(join(root, 'package.json'), '{"private":true}')
    // This fake npm verifies the boundary without invoking Vite or an external service.
    writeFileSync(
      join(root, 'bin/npm'),
      `#!/bin/bash
set -eu
test "$1 $2" = "run build"
test "\${VITE_TURNSTILE_SITE_KEY}" = "public-test-key"
test "\${CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV}" = "false"
test -z "\${SYNTHETIC_PRIVATE_INPUT:-}"
test -z "\${NODE_OPTIONS:-}"
test ! -e .env.production
test ! -e .env.local
test ! -e "$HOME/private-marker"
test -d "$HOME"
test -d "$XDG_CONFIG_HOME"
test -L node_modules
echo ISOLATION_VERIFIED
`,
      { mode: 0o755 },
    )
    git('init', '-b', 'fixture')
    git('config', 'user.name', 'Fixture')
    git('config', 'user.email', 'fixture@example.invalid')
    git('add', 'scripts', '.gitignore', 'package.json')
    git('commit', '-m', 'fixture')
    writeFileSync(join(root, '.env.production'), 'SYNTHETIC_PRIVATE_INPUT=fake')
    writeFileSync(join(root, '.env.local'), 'SYNTHETIC_PRIVATE_INPUT=fake')
    const run = (key: string, environment: Record<string, string> = {}) =>
      spawnSync('bash', ['scripts/build-hml-isolated.sh'], {
        cwd: root,
        encoding: 'utf8',
        env: {
          PATH: `${join(root, 'bin')}:${process.env.PATH}`,
          HOME: root,
          VITE_TURNSTILE_SITE_KEY: key,
          SYNTHETIC_PRIVATE_INPUT: 'fake',
          ...environment,
        },
      })
    for (const key of ['', '   ', 'bad key']) assert.equal(run(key).status, 1)
    const result = run('public-test-key')
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /ISOLATION_VERIFIED/)
    git('checkout', '--detach')
    assert.equal(run('public-test-key').status, 1)
    assert.equal(
      run('public-test-key', {
        CI: 'true',
        GITHUB_HEAD_REF: 'fixture',
      }).status,
      0,
    )
    assert.equal(
      run('public-test-key', {
        CI: 'true',
        GITHUB_HEAD_REF: 'fixture',
        HML_DEPLOY: '1',
      }).status,
      1,
    )
    git('add', '-f', '.env.production')
    git('commit', '-m', 'synthetic forbidden source')
    assert.equal(run('public-test-key').status, 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
