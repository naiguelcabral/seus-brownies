// Restore only into the named disposable container; never connects to Neon.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, lstatSync } from 'node:fs'
import { resolve } from 'node:path'

const archive = resolve(process.argv[2] ?? '')
assert.equal(process.argv[3], '--ack-disposable-postgres17')
assert.ok(archive.startsWith(resolve('backups-local') + '/'))
assert.ok(archive.endsWith('.dump'))
const stat = lstatSync(archive)
assert.ok(stat.isFile() && !stat.isSymbolicLink())
assert.equal(stat.mode & 0o077, 0)
const container = 'cacau-offsite-restore-pg17'
const docker = (args, options = {}) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
    ...options,
  })
const sql = (query) =>
  docker([
    'exec',
    container,
    'psql',
    '-U',
    'restore_fixture',
    '-d',
    'cacau_restore',
    '-Atc',
    query,
  ]).trim()
assert.equal(
  sql('select current_database(),current_user'),
  'cacau_restore|restore_fixture',
)
assert.equal(
  sql("select count(*) from pg_tables where schemaname='public'"),
  '0',
)
assert.ok(Number(sql("select current_setting('server_version_num')")) >= 170000)
// A freshly initialized database already owns public. Skip only that CREATE
// SCHEMA TOC item; preserve every table, constraint, sequence, receipt and row.
const toc = docker([
  'run',
  '--rm',
  '-v',
  `${archive}:/backup.dump:ro`,
  'postgres:17-alpine',
  'pg_restore',
  '--list',
  '/backup.dump',
])
const selected = toc
  .split('\n')
  .filter((line) => !/^\d+; \d+ \d+ SCHEMA - public /.test(line))
  .join('\n')
docker(
  [
    'run',
    '--rm',
    '-i',
    '--network',
    `container:${container}`,
    '-e',
    'PGPASSWORD=synthetic-restore-only',
    '-v',
    `${archive}:/backup.dump:ro`,
    'postgres:17-alpine',
    'pg_restore',
    '-h',
    '127.0.0.1',
    '-U',
    'restore_fixture',
    '-d',
    'cacau_restore',
    '--no-owner',
    '--no-acl',
    '--exit-on-error',
    '--use-list=/dev/stdin',
    '/backup.dump',
  ],
  { input: selected, stdio: ['pipe', 'ignore', 'pipe'] },
)
assert.equal(
  sql("select count(*) from pg_tables where schemaname='public'"),
  '38',
)
assert.equal(sql('select count(*) from drizzle.__drizzle_migrations'), '36')
const hash = createHash('sha256')
for await (const part of createReadStream(archive)) hash.update(part)
console.log(
  JSON.stringify({
    scope: 'local-disposable-restore',
    tables: 38,
    receipts: 36,
    sha256: hash.digest('hex'),
    passed: true,
    offsite_bytes_restored: false,
  }),
)
