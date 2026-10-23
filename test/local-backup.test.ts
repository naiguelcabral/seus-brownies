import assert from 'node:assert/strict'
import test from 'node:test'

const modulePath = '../scripts/create-local-backup.mjs'
const { backupPostgresEnvironment } = await import(modulePath)
const base =
  'postgresql://fixture:synthetic-only@ep-late-water-acahd1z1.example.aws.neon.tech/neondb?sslmode=require'

test('local backup binds to the approved direct endpoint and enforces readonly verified TLS', () => {
  const env = backupPostgresEnvironment(base)
  assert.equal(env.PGDATABASE, 'neondb')
  assert.equal(env.PGSSLMODE, 'verify-full')
  assert.match(env.PGOPTIONS, /default_transaction_read_only=on/)
  assert.equal(env.PGUSER, 'fixture')
})
test('local backup rejects another database, pooler, endpoint and routing overrides', () => {
  for (const input of [
    base.replace('/neondb', '/another'),
    base.replace('acahd1z1.', 'acahd1z1-pooler.'),
    base.replace('ep-late-water-acahd1z1', 'ep-other'),
    base + '&host=external-fixture.invalid',
    base + '&options=unsafe',
  ])
    assert.throws(() => backupPostgresEnvironment(input))
})
test('local backup reports a missing Neon CLI separately from missing operator auth', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL(modulePath, import.meta.url), 'utf8')
  assert.match(
    source,
    /credential\.error\?\.code === 'ENOENT'\)\s+throw new Error\('BACKUP_NEON_CLI_MISSING'\)/,
  )
  assert.match(source, /allowed = new Set\(\[[^\]]*'BACKUP_NEON_CLI_MISSING'/)
})
