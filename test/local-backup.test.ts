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
