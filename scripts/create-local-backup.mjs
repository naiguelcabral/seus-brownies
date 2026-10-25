// Explicit owner-authorized local application backup. Never reads environment files.
import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import {
  createReadStream,
  closeSync,
  constants,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = {
  project_id: 'steep-brook-51659857',
  branch_id: 'br-lingering-wind-acwh5wap',
  // SHA-256 of the production endpoint id; the plain id is not versioned.
  endpoint_sha256:
    '26398d41eb1bf1a3715eb6be27f6e0b35cd59bb94a9fed340ba35c0ff5a3f914',
  database_name: 'neondb',
  classification: 'production',
}

function endpointMatches(hostname, expectedSha256) {
  const endpoint = /^(ep-[a-z0-9-]+)(?:\.[a-z0-9-]+)+\.neon\.tech$/.exec(
    hostname,
  )?.[1]
  return (
    endpoint !== undefined &&
    createHash('sha256').update(endpoint).digest('hex') === expectedSha256
  )
}

export function backupPostgresEnvironment(
  raw,
  expectedEndpointSha256 = source.endpoint_sha256,
) {
  const url = new URL(raw.trim())
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !endpointMatches(url.hostname, expectedEndpointSha256) ||
    (url.port && url.port !== '5432') ||
    url.pathname !== '/neondb' ||
    !url.username ||
    !url.password ||
    url.hash ||
    [...url.searchParams.keys()].some(
      (k) => !['sslmode', 'channel_binding'].includes(k),
    )
  ) {
    throw new Error('BACKUP_SOURCE_MISMATCH')
  }
  return {
    PATH: process.env.PATH,
    PGHOST: url.hostname,
    PGPORT: '5432',
    PGDATABASE: source.database_name,
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: 'verify-full',
    PGSSLROOTCERT: '/etc/ssl/certs/ca-certificates.crt',
    PGOPTIONS:
      '-c default_transaction_read_only=on -c statement_timeout=300000',
  }
}

async function createLocalBackup() {
  const ignore = readFileSync(resolve(root, '.gitignore'), 'utf8')
  if (!ignore.split('\n').includes('/backups-local/'))
    throw new Error('BACKUP_IGNORE_REQUIRED')
  const folder = resolve(root, 'backups-local')
  mkdirSync(folder, { recursive: true, mode: 0o700 })
  const stat = lstatSync(folder)
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o077) !== 0 ||
    stat.uid !== process.getuid()
  )
    throw new Error('BACKUP_DIRECTORY_NOT_PRIVATE')

  // The native CLI resolves its own existing operator credential. Never echo
  // its output/error, pass a DSN as an argument, or persist the connection string.
  const credential = spawnSync(
    'neon',
    [
      'connection-string',
      source.branch_id,
      '--project-id',
      source.project_id,
      '--database-name',
      source.database_name,
      '--role-name',
      'neondb_owner',
      '--no-pooled',
      '--no-color',
      '--no-analytics',
    ],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
        CI: 'true',
        BROWSER: '/bin/false',
      },
    },
  )
  // The CLI is an operator prerequisite (docs/governance/KNIP-CODEQL.md), not an npm dependency.
  if (credential.error?.code === 'ENOENT')
    throw new Error('BACKUP_NEON_CLI_MISSING')
  if (credential.error || credential.status !== 0)
    throw new Error('BACKUP_OPERATOR_AUTH_UNAVAILABLE')
  const environment = backupPostgresEnvironment(credential.stdout)
  credential.stdout = ''
  const name = `cacau-app-${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${randomUUID()}`
  const pending = resolve(folder, name + '.partial')
  const complete = resolve(folder, name + '.dump')
  const output = openSync(
    pending,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  )
  let succeeded = false
  try {
    const dump = spawnSync(
      'docker',
      [
        'run',
        '--rm',
        '--network',
        'host',
        ...Object.keys(environment)
          .filter((k) => k !== 'PATH')
          .flatMap((k) => ['-e', k]),
        'postgres:17-alpine',
        'pg_dump',
        '--format=custom',
        '--no-owner',
        '--no-acl',
        '--schema=public',
        '--schema=drizzle',
      ],
      {
        env: environment,
        stdio: ['ignore', output, 'pipe'],
        timeout: 300_000,
        maxBuffer: 256_000,
      },
    )
    if (dump.error || dump.status !== 0) throw new Error('BACKUP_DUMP_FAILED')
    succeeded = true
  } finally {
    closeSync(output)
    if (!succeeded) rmSync(pending, { force: true })
  }
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(pending)) hash.update(chunk)
  const size = lstatSync(pending).size
  if (!size) {
    rmSync(pending)
    throw new Error('BACKUP_EMPTY')
  }
  renameSync(pending, complete)
  const archive = openSync(complete, constants.O_RDONLY | constants.O_NOFOLLOW)
  let valid
  try {
    const inspect = spawnSync(
      'docker',
      ['run', '--rm', '-i', 'postgres:17-alpine', 'pg_restore', '--list'],
      {
        stdio: [archive, 'ignore', 'pipe'],
        timeout: 30_000,
        env: { PATH: process.env.PATH },
      },
    )
    valid = !inspect.error && inspect.status === 0
  } finally {
    closeSync(archive)
  }
  const receipt = {
    source,
    scope: ['public', 'drizzle'],
    managed_auth_included: false,
    created_at: new Date().toISOString(),
    file: name + '.dump',
    bytes: size,
    sha256: hash.digest('hex'),
    archive_header_validated: valid,
    restore_verified: false,
    storage: 'local-project-private',
    independent_offsite_copy: false,
  }
  writeFileSync(
    resolve(folder, name + '.json'),
    JSON.stringify(receipt, null, 2) + '\n',
    { mode: 0o600, flag: 'wx' },
  )
  if (!valid) throw new Error('BACKUP_ARCHIVE_INVALID')
  return receipt
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (
      process.argv.slice(2).join(' ') !== '--ack-production-branch-local-backup'
    )
      throw new Error('BACKUP_ACK_REQUIRED')
    process.stdout.write(JSON.stringify(await createLocalBackup()) + '\n')
  } catch (error) {
    // A child error can contain private hosts or provider output: never reflect it.
    const allowed = new Set([
      'BACKUP_ACK_REQUIRED',
      'BACKUP_IGNORE_REQUIRED',
      'BACKUP_DIRECTORY_NOT_PRIVATE',
      'BACKUP_NEON_CLI_MISSING',
      'BACKUP_OPERATOR_AUTH_UNAVAILABLE',
      'BACKUP_SOURCE_MISMATCH',
      'BACKUP_DUMP_FAILED',
      'BACKUP_EMPTY',
      'BACKUP_ARCHIVE_INVALID',
    ])
    const code = allowed.has(error?.message)
      ? error.message
      : 'UNCLASSIFIED_FAILURE'
    process.stderr.write(`LOCAL_BACKUP_BLOCKED:${code}\n`)
    process.exitCode = 1
  }
}
