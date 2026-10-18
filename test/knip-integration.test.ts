import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
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

import {
  compareKnipBaseline,
  normalizeKnipReport,
} from '../scripts/check-knip.mjs'

const root = resolve(import.meta.dirname, '..')
const finding = { file: 'src/orphan.ts', type: 'files', name: 'src/orphan.ts' }
const baseline = { version: 1, knipVersion: '6.41.0', findings: [finding] }

test('Knip gate blocks new findings and removes resolved allowances', () => {
  assert.deepEqual(compareKnipBaseline([finding], baseline), {
    added: [],
    resolved: [],
  })
  const extra = { file: 'src/new.ts', type: 'exports', name: 'unused' }
  assert.deepEqual(compareKnipBaseline([finding, extra], baseline).added, [
    extra,
  ])
  assert.deepEqual(compareKnipBaseline([], baseline).resolved, [finding])
})

test('Knip gate refuses invalid or unsupported reports instead of approving them', () => {
  assert.throws(() => normalizeKnipReport({}), /valid issues/)
  assert.throws(
    () =>
      normalizeKnipReport({ issues: [{ file: 'src/a.ts', newIssueType: [] }] }),
    /Unsupported/,
  )
  assert.throws(
    () =>
      normalizeKnipReport({ issues: [{ file: 'src/a.ts', exports: [{}] }] }),
    /Invalid Knip finding/,
  )
  assert.throws(
    () => compareKnipBaseline([], { ...baseline, knipVersion: 'unreviewed' }),
    /Invalid Knip baseline/,
  )
})

test('Knip finds orphan files, missing imports and dependencies without executing configs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cacau-knip-integration-'))
  try {
    mkdirSync(join(directory, 'src'))
    symlinkSync(
      join(root, 'node_modules'),
      join(directory, 'node_modules'),
      'dir',
    )
    writeFileSync(
      join(directory, 'knip.json'),
      readFileSync(join(root, 'knip.json')),
    )
    writeFileSync(
      join(directory, 'package.json'),
      JSON.stringify({
        name: 'knip-synthetic-fixture',
        private: true,
        type: 'module',
        dependencies: {
          zod: '^4.3.6',
          vite: '8.3.4',
          'drizzle-kit': '0.31.11',
          '@playwright/test': '^1.62.1',
        },
      }),
    )
    writeFileSync(
      join(directory, 'src/router.tsx'),
      "import './missing'\nimport 'synthetic-missing-package'\nexport const getRouter = () => null\n",
    )
    writeFileSync(join(directory, 'src/orphan.ts'), 'export const unused = 1\n')
    for (const file of [
      'vite.config.ts',
      'drizzle.config.ts',
      'playwright.config.ts',
      'playwright.public-local.config.ts',
    ]) {
      writeFileSync(
        join(directory, file),
        "throw new Error('CONFIG_EXECUTED')\nexport default {}\n",
      )
    }
    const result = spawnSync(
      process.execPath,
      [
        join(root, 'node_modules/knip/bin/knip.js'),
        '--config',
        'knip.json',
        '--no-progress',
        '--reporter',
        'json',
      ],
      {
        cwd: directory,
        env: { PATH: process.env.PATH, NO_COLOR: '1' },
        encoding: 'utf8',
        timeout: 30_000,
      },
    )
    assert.equal(result.status, 1, result.stderr)
    assert.doesNotMatch(result.stderr, /CONFIG_EXECUTED/)
    assert.ok(result.stdout.trim(), result.stderr || 'Knip returned no report')
    const findings = normalizeKnipReport(JSON.parse(result.stdout))
    assert.ok(
      findings.some(
        (issue: typeof finding) =>
          issue.type === 'files' && issue.file === 'src/orphan.ts',
      ),
    )
    assert.ok(
      findings.some(
        (issue: typeof finding) =>
          issue.type === 'dependencies' && issue.name === 'zod',
      ),
    )
    assert.ok(
      findings.some(
        (issue: typeof finding) =>
          issue.type === 'unlisted' &&
          issue.name === 'synthetic-missing-package',
      ),
    )
    assert.ok(
      findings.some(
        (issue: typeof finding) =>
          issue.type === 'unresolved' && issue.name === './missing',
      ),
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
