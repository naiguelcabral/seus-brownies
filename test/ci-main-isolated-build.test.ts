import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

test('CI separates the main build from the HML build without deploy commands', async () => {
  const [workflow, packageJson, ciBuild] = await Promise.all([
    readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(
      new URL('../scripts/build-ci-isolated.sh', import.meta.url),
      'utf8',
    ),
  ])
  const scripts = JSON.parse(packageJson).scripts as Record<string, string>

  assert.equal(scripts['build:ci-isolated'], 'bash scripts/build-ci-isolated.sh')
  assert.match(
    workflow,
    /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'\n\s*run: npm run build:ci-isolated/,
  )
  assert.match(
    workflow,
    /if: github\.event_name == 'pull_request' \|\| github\.ref != 'refs\/heads\/main'\n\s*run: npm run build:hml/,
  )
  assert.doesNotMatch(workflow, /npm run (?:deploy|deploy:hml)/)
  assert.match(ciBuild, /git -C "\$repository_root" archive --format=tar HEAD/)
  assert.match(ciBuild, /env -i/)
  assert.match(ciBuild, /CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false/)
  assert.match(
    ciBuild,
    /VITE_TURNSTILE_SITE_KEY="\$\{VITE_TURNSTILE_SITE_KEY\}"/,
  )
  assert.doesNotMatch(ciBuild, /HML_DEPLOY|wrangler deploy|dotenv|source\s+.*\.env/)
})

test('main isolated build uses only the archived HEAD and explicit public input', () => {
  const root = mkdtempSync(join(tmpdir(), 'cacau-ci-isolation-fixture-'))
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, stdio: 'pipe' })
  try {
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'node_modules'))
    mkdirSync(join(root, 'bin'))
    for (const name of ['build-ci-isolated.sh', 'git-sensitive-paths.py']) {
      copyFileSync(
        new URL(`../scripts/${name}`, import.meta.url),
        join(root, 'scripts', name),
      )
    }
    writeFileSync(join(root, '.gitignore'), '.env*\nnode_modules\nbin\n')
    writeFileSync(join(root, 'package.json'), '{"private":true}')
    writeFileSync(
      join(root, 'bin/npm'),
      [
        '#!/bin/bash',
        'set -eu',
        'test "$1 $2" = "run build"',
        'test "${VITE_TURNSTILE_SITE_KEY}" = "public-test-key"',
        'test "${CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV}" = "false"',
        'test -z "${CLOUDFLARE_ENV:-}"',
        'test -z "${SYNTHETIC_PRIVATE_INPUT:-}"',
        'test -z "${HML_DEPLOY:-}"',
        'test ! -e .env.production',
        'test ! -e .env.local',
        'test ! -e "$HOME/private-marker"',
        'test -d "$HOME"',
        'test -d "$XDG_CONFIG_HOME"',
        'test -L node_modules',
        'echo CI_ISOLATION_VERIFIED',
        '',
      ].join('\n'),
      { mode: 0o755 },
    )
    git('init', '-b', 'main')
    git('config', 'user.name', 'Fixture')
    git('config', 'user.email', 'fixture@example.invalid')
    git('add', 'scripts', '.gitignore', 'package.json')
    git('commit', '-m', 'fixture')
    writeFileSync(join(root, '.env.production'), 'SYNTHETIC_PRIVATE_INPUT=fake')
    writeFileSync(join(root, '.env.local'), 'SYNTHETIC_PRIVATE_INPUT=fake')
    const run = (key: string, environment: Record<string, string> = {}) =>
      spawnSync('bash', ['scripts/build-ci-isolated.sh'], {
        cwd: root,
        encoding: 'utf8',
        env: {
          PATH: `${join(root, 'bin')}:${process.env.PATH}`,
          HOME: root,
          VITE_TURNSTILE_SITE_KEY: key,
          SYNTHETIC_PRIVATE_INPUT: 'fake',
          HML_DEPLOY: '1',
          ...environment,
        },
      })
    for (const key of ['', '   ', 'bad key']) assert.equal(run(key).status, 1)
    const result = run('public-test-key')
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /CI_ISOLATION_VERIFIED/)
    git('add', '-f', '.env.production')
    git('commit', '-m', 'synthetic forbidden source')
    assert.equal(run('public-test-key').status, 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('build HML remains blocked when called directly from main', () => {
  const root = mkdtempSync(join(tmpdir(), 'cacau-hml-main-fixture-'))
  try {
    mkdirSync(join(root, 'scripts'))
    for (const name of ['build-hml-isolated.sh', 'git-sensitive-paths.py']) {
      copyFileSync(
        new URL(`../scripts/${name}`, import.meta.url),
        join(root, 'scripts', name),
      )
    }
    execFileSync('git', ['init', '-b', 'main'], { cwd: root, stdio: 'pipe' })
    execFileSync('git', ['config', 'user.name', 'Fixture'], {
      cwd: root,
      stdio: 'pipe',
    })
    execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], {
      cwd: root,
      stdio: 'pipe',
    })
    execFileSync('git', ['add', 'scripts'], { cwd: root, stdio: 'pipe' })
    execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root, stdio: 'pipe' })
    const result = spawnSync('bash', ['scripts/build-hml-isolated.sh'], {
      cwd: root,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        VITE_TURNSTILE_SITE_KEY: 'public-test-key',
      },
    })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /main é bloqueada/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
