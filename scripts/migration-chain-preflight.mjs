#!/usr/bin/env node
// Offline fail-closed guard for the published migration command.
// It never loads dotenv, opens a connection or invokes Drizzle.
import { readFileSync, realpathSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sourceManifest } from './migration-chain-candidates.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dangerousKey =
  /(?:pass(?:word)?|secret|token|credential|connection|dsn|database_?url|uri)/i
const connectionValue = /(?:postgres(?:ql)?:\/\/|:\/\/[^\s]+@)/i

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  return value
}

function containsSensitiveInput(value, path = '') {
  if (typeof value === 'string') return connectionValue.test(value)
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(([key, item]) =>
    dangerousKey.test(key)
      ? true
      : containsSensitiveInput(item, path ? `${path}.${key}` : key),
  )
}

function active0017IsDefective() {
  const sql = readFileSync(
    resolve(root, 'drizzle/0017_orange_the_hand.sql'),
    'utf8',
  )
  return (
    sql.includes('NEW."unit"') &&
    sql.includes('OLD."unit"') &&
    sql.includes('BEFORE UPDATE OF "product_type", "unit"')
  )
}

export function evaluatePreflight(evidence, manifest = sourceManifest()) {
  const blockers = []
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence))
    return { authorized: false, blockers: ['EVIDENCE_MISSING'] }
  if (containsSensitiveInput(evidence))
    blockers.push('SENSITIVE_INPUT_REJECTED')
  if (evidence.environment !== 'hml') blockers.push('ENVIRONMENT_UNIDENTIFIED')
  if (/prod/i.test(String(evidence.environment)))
    blockers.push('PRODUCTION_REJECTED')
  if (evidence.target?.classification !== 'confirmed-hml')
    blockers.push('TARGET_UNCONFIRMED')
  if (evidence.target?.operator_authorized !== true)
    blockers.push('OPERATOR_AUTHORIZATION_MISSING')
  if (evidence.history?.state !== 'verified-through-0016')
    blockers.push('HISTORY_INCOMPLETE')
  if (evidence.history?.partial_application !== false)
    blockers.push('PARTIAL_APPLICATION_UNRESOLVED')
  if (
    JSON.stringify(canonical(evidence.source_manifest)) !==
    JSON.stringify(canonical(manifest))
  )
    blockers.push('HASHES_MISMATCH')
  if (
    evidence.backup?.verified !== true ||
    evidence.backup?.restore_tested !== true
  )
    blockers.push('BACKUP_RECOVERY_UNATTESTED')
  if (evidence.decisions?.migration_0019 !== 'approved')
    blockers.push('DECISION_0019_PENDING')
  if (evidence.decisions?.migration_0028 !== 'approved')
    blockers.push('DECISION_0028_PENDING')
  if (active0017IsDefective()) blockers.push('ACTIVE_0017_DEFECT')
  return {
    authorized: blockers.length === 0,
    blockers,
    diagnostic: {
      source_verified: !blockers.includes('HASHES_MISMATCH'),
      active_0017_defect: active0017IsDefective(),
      external_connection_attempted: false,
      migration_execution_started: false,
    },
  }
}

function parse(argv) {
  if (argv.length === 0) return null
  if (argv.length !== 2 || argv[0] !== '--evidence')
    throw new Error('INVALID_ARGUMENTS')
  const supplied = argv[1]
  if (
    !supplied ||
    connectionValue.test(supplied) ||
    basename(supplied).startsWith('.env') ||
    extname(supplied) !== '.json'
  )
    throw new Error('INVALID_EVIDENCE_PATH')
  const path = realpathSync(supplied)
  if (!path.startsWith(root + '/') || basename(path).startsWith('.env'))
    throw new Error('INVALID_EVIDENCE_PATH')
  return JSON.parse(readFileSync(path, 'utf8'))
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = evaluatePreflight(parse(process.argv.slice(2)))
    process.stdout.write(
      JSON.stringify({
        status: result.authorized ? 'AUTHORIZED' : 'BLOCKED',
        blockers: result.blockers,
        diagnostic: result.diagnostic,
      }) + '\n',
    )
    process.exitCode = result.authorized ? 0 : 1
  } catch {
    process.stderr.write('BLOCKED_MIGRATION_PREFLIGHT\n')
    process.exitCode = 1
  }
}
