import assert from 'node:assert/strict'
import test from 'node:test'

const modulePath = '../scripts/create-local-backup.mjs'
const { backupPostgresEnvironment } = await import(modulePath)
const { createHash } = await import('node:crypto')
const endpoint = 'ep-synthetic-main-dddd0004'
const endpointSha256 = createHash('sha256').update(endpoint).digest('hex')
const base = `postgresql://fixture:synthetic-only@${endpoint}.example.aws.neon.tech/neondb?sslmode=require`
const environment = (raw: string) =>
  backupPostgresEnvironment(raw, endpointSha256)

test('local backup binds to the approved direct endpoint and enforces readonly verified TLS', () => {
  const env = environment(base)
  assert.equal(env.PGDATABASE, 'neondb')
  assert.equal(env.PGSSLMODE, 'verify-full')
  assert.match(env.PGOPTIONS, /default_transaction_read_only=on/)
  assert.equal(env.PGUSER, 'fixture')
})
test('local backup rejects another database, pooler, endpoint and routing overrides', () => {
  for (const input of [
    base.replace('/neondb', '/another'),
    base.replace('dddd0004.', 'dddd0004-pooler.'),
    base.replace(endpoint, 'ep-other'),
    base + '&host=external-fixture.invalid',
    base + '&options=unsafe',
  ])
    assert.throws(() => environment(input))
})

test('local backup pins the production endpoint by hash, never by plain id', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL(modulePath, import.meta.url), 'utf8')
  assert.doesNotMatch(source, /ep-[a-z]+-[a-z]+-[a-z0-9]{8}/)
  assert.match(source, /endpoint_sha256:\s*'[a-f0-9]{64}'/)
  assert.throws(() => backupPostgresEnvironment(base), /BACKUP_SOURCE_MISMATCH/)
})
