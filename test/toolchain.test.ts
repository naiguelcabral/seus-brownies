import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')

test('reconciled tooling retains locked blocking checks and all CodeQL languages', () => {
  const readJson = (file: string) =>
    JSON.parse(readFileSync(join(root, file), 'utf8')) as Record<
      string,
      unknown
    >
  const manifest = readJson('package.json')
  const scripts = manifest.scripts as Record<string, string>
  const dependencies = manifest.devDependencies as Record<string, string>
  const lock = readJson('package-lock.json')
  const packages = lock.packages as Record<
    string,
    { devDependencies?: Record<string, string>; version?: string }
  >
  for (const name of [
    'typescript',
    'oxlint',
    'oxlint-tsgolint',
    'oxfmt',
    'knip',
  ]) {
    assert.equal(dependencies[name], packages['']?.devDependencies?.[name])
    assert.equal(dependencies[name], packages[`node_modules/${name}`]?.version)
  }
  assert.equal(scripts.lint, 'oxlint --type-aware --deny-warnings')
  assert.equal(scripts['knip:check'], 'node scripts/check-knip.mjs')
  assert.equal(scripts['knip:audit'], 'knip --config knip.json --no-progress')
  assert.ok(scripts.check?.startsWith('oxfmt --check '))
  for (const name of ['lint:ox', 'format:ox:check', 'format:ox:write']) {
    assert.equal(scripts[name], undefined)
  }
  assert.deepEqual(readJson('.oxlintrc.json').options, { typeAware: true })
  const knip = readJson('knip.json')
  for (const name of ['drizzle', 'vite', 'playwright']) {
    assert.deepEqual(knip[name], { config: [] })
  }
  const ci = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8')
  for (const name of ['lint', 'check', 'typecheck', 'knip:check']) {
    assert.ok(ci.includes(`run: npm run ${name}\n`))
  }
  assert.doesNotMatch(ci, /continue-on-error/)
  const codeql = readFileSync(
    join(root, '.github/workflows/codeql.yml'),
    'utf8',
  )
  assert.match(codeql, /language: \[javascript-typescript, python, actions\]/)
  assert.match(codeql, /queries: security-extended/)
  assert.match(codeql, /config-file: \.\/\.github\/codeql\/codeql-config.yml/)
  assert.doesNotMatch(codeql, /continue-on-error/)
  assert.equal(
    existsSync(join(root, '.github/workflows/tooling-preview.yml')),
    false,
  )
})

test('the dependency graph contains only the TypeScript 7 compiler', () => {
  const lock = JSON.parse(
    readFileSync(join(root, 'package-lock.json'), 'utf8'),
  ) as {
    packages: Record<string, { name?: string; version?: string }>
  }
  const compilers = Object.entries(lock.packages).filter(
    ([path, item]) =>
      /(?:^|\/)node_modules\/typescript$/.test(path) ||
      item.name === 'typescript' ||
      item.name === '@typescript/typescript6',
  )
  assert.deepEqual(
    compilers.map(([path, item]) => [path, item.version]),
    [['node_modules/typescript', '7.0.2']],
  )
  assert.ok(!lock.packages['node_modules/eslint'])
  assert.ok(!lock.packages['node_modules/@tanstack/eslint-config'])
})

test('typed lint permits Node test registration but rejects floating promises and invalid Hooks', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cacau-oxlint-contract-'))
  try {
    mkdirSync(join(directory, 'test'))
    symlinkSync(
      join(root, 'node_modules'),
      join(directory, 'node_modules'),
      'dir',
    )
    writeFileSync(
      join(directory, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          noEmit: true,
        },
        include: ['test/**/*.tsx'],
      }),
    )
    const file = join(directory, 'test', 'sample.tsx')
    const run = () =>
      spawnSync(
        join(root, 'node_modules/.bin/oxlint'),
        [
          '--config',
          join(root, '.oxlintrc.json'),
          '--type-aware',
          '--deny-warnings',
          file,
        ],
        { cwd: directory, encoding: 'utf8', timeout: 30_000 },
      )
    writeFileSync(
      file,
      "import test from 'node:test'\n\ntest('registered', () => {})\n",
    )
    const valid = run()
    assert.equal(valid.status, 0, valid.stdout + valid.stderr)
    writeFileSync(
      file,
      [
        "import test from 'node:test'",
        "import { useState } from 'react'",
        '',
        "test('registered', () => {})",
        'Promise.resolve(1)',
        'export function Broken({ enabled }: { enabled: boolean }) {',
        '  if (enabled) useState(0)',
        '  return null',
        '}',
      ].join('\n'),
    )
    const invalid = run()
    assert.equal(invalid.status, 1, invalid.stdout + invalid.stderr)
    assert.match(invalid.stdout + invalid.stderr, /no-floating-promises/)
    assert.match(invalid.stdout + invalid.stderr, /rules-of-hooks/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('Oxfmt checks and repairs formatting without sorting imports', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cacau-oxfmt-contract-'))
  try {
    const file = join(directory, 'sample.ts')
    writeFileSync(
      file,
      'import z from "z";\nimport a from "a";\nexport const pair={z,a};\n',
    )
    const run = (...args: string[]) =>
      spawnSync(
        join(root, 'node_modules/.bin/oxfmt'),
        ['--config', join(root, '.oxfmtrc.json'), ...args, file],
        { cwd: directory, encoding: 'utf8', timeout: 30_000 },
      )
    assert.equal(run('--check').status, 1)
    const formatted = run()
    assert.equal(formatted.status, 0, formatted.stdout + formatted.stderr)
    assert.equal(run('--check').status, 0)
    assert.match(
      readFileSync(file, 'utf8'),
      /^import z from 'z'\nimport a from 'a'/,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
