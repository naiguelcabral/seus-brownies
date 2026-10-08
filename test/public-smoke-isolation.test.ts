import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('runner público usa somente HEAD e inputs sintéticos; árvore suja e secrets versionados bloqueiam', () => {
  const root = mkdtempSync(join(tmpdir(), 'cacau-public-smoke-fixture-'))
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, stdio: 'pipe' })
  try {
    for (const dir of ['scripts', 'node_modules', 'bin'])
      mkdirSync(join(root, dir))
    for (const name of [
      'test-public-smoke-isolated.sh',
      'git-sensitive-paths.py',
    ])
      copyFileSync(
        new URL(`../scripts/${name}`, import.meta.url),
        join(root, 'scripts', name),
      )
    writeFileSync(join(root, '.gitignore'), '.env*\nnode_modules\nbin\n')
    writeFileSync(
      join(root, 'bin/node'),
      [
        '#!/bin/bash',
        'set -eu',
        'test "$*" = "node_modules/@playwright/test/cli.js test --config playwright.public-local.config.ts"',
        'test "${CACAU_PUBLIC_SMOKE_ISOLATED}" = "1"',
        'test "${VITE_TURNSTILE_SITE_KEY}" = "1x00000000000000000000AA"',
        'test "${CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV}" = "false"',
        'test -z "${SYNTHETIC_PRIVATE_INPUT:-}"',
        'test -z "${CLOUDFLARE_ENV:-}"',
        'test -z "${DATABASE_URL:-}"',
        'test ! -e .env.local',
        'test -d "$HOME"',
        'test -d "$XDG_CONFIG_HOME"',
        'test -L node_modules',
        'echo PUBLIC_ISOLATION_VERIFIED',
        '',
      ].join('\n'),
      { mode: 0o755 },
    )
    git('init', '-b', 'main')
    git('config', 'user.name', 'Fixture')
    git('config', 'user.email', 'fixture@example.invalid')
    git('add', 'scripts', '.gitignore')
    git('commit', '-m', 'fixture')
    writeFileSync(join(root, '.env.local'), 'SYNTHETIC_PRIVATE_INPUT=fake')
    const run = () =>
      spawnSync('bash', ['scripts/test-public-smoke-isolated.sh'], {
        cwd: root,
        encoding: 'utf8',
        env: {
          PATH: `${join(root, 'bin')}:${process.env.PATH}`,
          SYNTHETIC_PRIVATE_INPUT: 'fake',
          DATABASE_URL: 'synthetic-value',
          CLOUDFLARE_ENV: 'hml',
        },
      })
    const success = run()
    assert.equal(success.status, 0, success.stderr)
    assert.match(success.stdout, /PUBLIC_ISOLATION_VERIFIED/)
    writeFileSync(join(root, 'dirty.txt'), 'fixture')
    assert.equal(run().status, 1)
    rmSync(join(root, 'dirty.txt'))
    git('add', '-f', '.env.local')
    git('commit', '-m', 'synthetic forbidden path')
    assert.equal(run().status, 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('config dedicada evita outros cenários, servidor existente e artefatos; spec bloqueia rede externa e POST', async () => {
  const [config, spec] = await Promise.all([
    readFile(
      new URL('../playwright.public-local.config.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../e2e/auth-public-routes.spec.ts', import.meta.url),
      'utf8',
    ),
  ])
  assert.match(config, /testMatch: 'auth-public-routes\.spec\.ts'/)
  assert.match(config, /reuseExistingServer: false/)
  assert.match(config, /http:\/\/127\.0\.0\.1:3459/)
  for (const artifact of ['trace', 'screenshot', 'video'])
    assert.match(config, new RegExp(`${artifact}: 'off'`))
  assert.match(config, /CACAU_PUBLIC_SMOKE_ISOLATED !== '1'/)
  assert.match(spec, /url\.origin === baseURL/)
  assert.match(spec, /\['GET', 'HEAD'\]\.includes\(request\.method\(\)\)/)
  assert.match(spec, /route\.abort\(\)/)
})
