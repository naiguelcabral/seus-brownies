import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('connected QA refuses initialization without its isolated opt-in', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/test-connected-disposable.ts',
      '--ack-disposable-postgres17',
    ],
    { encoding: 'utf8', env: { PATH: process.env.PATH }, timeout: 15_000 },
  )
  assert.notEqual(result.status, 0)
  assert.match(
    result.stderr,
    /Connected QA is restricted to the isolated runner/,
  )
  assert.doesNotMatch(result.stderr, /ECONNREFUSED|Failed query/)
})

test('connected identities cannot enter the production configuration', () => {
  const config = readFileSync(
    new URL('../vite.config.ts', import.meta.url),
    'utf8',
  )
  const principal = readFileSync(
    new URL(
      '../src/features/auth/principal-resolver.server.ts',
      import.meta.url,
    ),
    'utf8',
  )
  assert.doesNotMatch(
    config + principal,
    /connected\/|cacau-connected-qa|local-postgres17/,
  )
  assert.match(principal, /readTanStackNeonSession/)
  const wrapper = readFileSync(
    new URL('../scripts/test-connected-isolated.sh', import.meta.url),
    'utf8',
  )
  assert.match(wrapper, /git .*archive --format=tar HEAD/)
  assert.match(wrapper, /env -i/)
  assert.doesNotMatch(wrapper, /DATABASE_URL=/)
})
