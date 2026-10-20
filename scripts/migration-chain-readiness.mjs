// Offline review only. It has no driver, connection setup or execution path.
import { readFileSync } from 'node:fs'
import { hash } from './migration-chain-candidates.mjs'
import { classifyForwardHistory } from './migration-chain-forward-candidate.mjs'

const sections = [
  'tables',
  'columns',
  'constraints',
  'indexes',
  'enums',
  'functions',
  'triggers',
  'sequences',
  'policies',
]
const reference = JSON.parse(
  readFileSync(
    new URL(
      '../test/fixtures/migration-chain-forward-catalogs.json',
      import.meta.url,
    ),
    'utf8',
  ),
)
const record = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (record(value))
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  return value
}
export function catalogDigest(catalog) {
  if (
    !record(catalog) ||
    Object.keys(catalog).length !== sections.length ||
    sections.some(
      (key) =>
        !Array.isArray(catalog[key]) ||
        catalog[key].some((row) => !record(row)),
    )
  )
    return null
  return hash(JSON.stringify(canonical(catalog)))
}
function sensitive(value) {
  if (typeof value === 'string')
    return /postgres(?:ql)?:\/\/|:\/\/[^\s]+@/i.test(value)
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(
    ([key, item]) =>
      /password|secret|token|credential|connection|dsn|database_?url/i.test(
        key,
      ) || sensitive(item),
  )
}

export function evaluateForwardReadiness(
  evidence,
  manifest,
  { references = reference, now = Date.now() } = {},
) {
  const blockers = []
  const result = (selection = null) => ({
    status: blockers.length ? 'BLOCKED' : 'READY_FOR_OPERATOR_REVIEW',
    application_authorized: false,
    execution_enabled: false,
    external_connection_attempted: false,
    blockers,
    checkpoint: selection?.compatible ? selection.checkpoint : null,
    pending_receipts: selection?.compatible ? selection.pending_receipts : null,
  })
  if (!record(evidence)) {
    blockers.push('EVIDENCE_MISSING')
    return result()
  }
  if (sensitive(evidence)) {
    blockers.push('SENSITIVE_INPUT_REJECTED')
    return result()
  }
  if (evidence.line !== 'forward-compatibility-v1')
    blockers.push('LINE_NOT_SELECTED')
  if (
    evidence.candidate_journal_sha256 !== manifest.candidate_journal_sha256 ||
    references.candidate_journal_sha256 !== manifest.candidate_journal_sha256
  )
    blockers.push('CANDIDATE_MANIFEST_MISMATCH')
  const target = evidence.target
  if (
    evidence.environment !== 'hml' ||
    target?.classification !== 'confirmed-hml'
  )
    blockers.push('TARGET_UNCONFIRMED')
  if (
    target?.classification === 'production' ||
    evidence.environment === 'production' ||
    target?.branch_id === 'br-lingering-wind-acwh5wap'
  )
    blockers.push('PRODUCTION_REJECTED')
  if (
    !['project_id', 'branch_id', 'database_name'].every(
      (key) =>
        typeof target?.[key] === 'string' &&
        /^[a-zA-Z0-9_-]{1,100}$/.test(target[key]),
    )
  )
    blockers.push('TARGET_IDENTITY_INCOMPLETE')
  if (target?.worker_binding_verified !== true)
    blockers.push('WORKER_TARGET_UNATTESTED')
  const collection = evidence.collection
  const collectedAt =
    typeof collection?.collected_at === 'string'
      ? Date.parse(collection.collected_at)
      : NaN
  if (
    !Number.isFinite(collectedAt) ||
    collectedAt > now ||
    now - collectedAt > 30 * 60_000
  )
    blockers.push('COLLECTION_STALE_OR_INVALID')
  if (
    collection?.read_only !== true ||
    collection.independent !== true ||
    collection.source !== 'independent-catalog'
  )
    blockers.push('INDEPENDENT_READONLY_COLLECTION_REQUIRED')
  const selection = classifyForwardHistory(
    evidence.receipts,
    manifest.candidate_migrations,
  )
  if (!selection.compatible) blockers.push(selection.reason)
  if (selection.compatible) {
    const digest = catalogDigest(evidence.catalog)
    if (!digest || digest !== references.catalogs[selection.checkpoint])
      blockers.push('CATALOG_MISMATCH_OR_INCOMPLETE')
    const pending = manifest.candidate_migrations.slice(
      evidence.receipts.length,
    )
    if (
      pending.length &&
      (evidence.backup?.verified !== true ||
        evidence.backup.restore_tested !== true)
    )
      blockers.push('BACKUP_RECOVERY_UNATTESTED')
    if (
      pending.some((entry) => entry.tag.startsWith('0019_')) &&
      evidence.decisions?.migration_0019 !== 'approved'
    )
      blockers.push('DECISION_0019_PENDING')
    if (pending.some((entry) => entry.tag.startsWith('0028_'))) {
      if (evidence.decisions?.migration_0028 !== 'approved')
        blockers.push('DECISION_0028_PENDING')
      if (evidence.scenario_mix_preexisting !== false)
        blockers.push('SCENARIO_MIX_STATE_UNVERIFIED')
    }
  }
  return result(selection)
}
