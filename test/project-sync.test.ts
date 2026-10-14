import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('supervised project sync contracts run without external services', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/project-sync/sync.spec.mjs'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
      env: { PATH: process.env.PATH },
      timeout: 60_000,
    },
  )
  assert.equal(result.error, undefined)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.match(result.stdout, /# tests [2-9][0-9]/)
})
