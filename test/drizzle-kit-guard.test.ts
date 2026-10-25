import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('..', import.meta.url))
const guard = fileURLToPath(
  new URL('../scripts/drizzle-kit-guard.mjs', import.meta.url),
)

function run(...args: string[]) {
  return spawnSync(process.execPath, [guard, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '' },
  })
}

test('db:generate e db:push passam pelo guard e não chamam o Drizzle Kit', () => {
  const scripts = JSON.parse(readFileSync(`${root}package.json`, 'utf8'))
    .scripts as Record<string, string>
  assert.equal(
    scripts['db:generate'],
    'node scripts/drizzle-kit-guard.mjs generate',
  )
  assert.equal(scripts['db:push'], 'node scripts/drizzle-kit-guard.mjs push')
})

test('guard bloqueia generate e push sem tocar na cadeia ativa', () => {
  const before = readdirSync(`${root}drizzle`).sort()
  for (const [command, message] of [
    ['generate', /db:prepare/],
    ['push', /migration auditável/],
  ] as const) {
    const result = run(command)
    assert.equal(result.status, 1, command)
    assert.match(result.stderr, message)
  }
  assert.deepEqual(readdirSync(`${root}drizzle`).sort(), before)
})

test('guard rejeita comando desconhecido', () => {
  for (const args of [[], ['migrate'], ['__proto__']]) {
    assert.equal(run(...args).status, 2, args.join(' '))
  }
})
