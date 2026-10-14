// Library only: no driver, network, environment loading, CLI or credentials.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const sql = (name) => readFileSync(new URL(name, import.meta.url), 'utf8')
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    )
  return value
}
export const digest = (value) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
const zeroFields = [
  'privileged',
  'memberships',
  'schema_create',
  'table_write',
  'column_write',
  'sequence_write',
  'ownership',
  'executable_custom_functions',
  'foreign_access',
  'largeobject_write',
  'grant_options',
  'parameter_write',
  'tablespace_create',
]
export function accessIsSafe(row, target) {
  return (
    row?.database === target.database &&
    row.role === row.session_role &&
    typeof row.role === 'string' &&
    row.role.length > 0 &&
    row.role === target.approvedRole &&
    typeof row.server_address === 'string' &&
    row.server_address.length > 0 &&
    Number.isInteger(row.server_port) &&
    row.server_port > 0 &&
    row.server_version_num >= 170000 &&
    row.server_version_num < 180000 &&
    row.transaction_read_only === 'on' &&
    row.default_read_only === 'on' &&
    row.database_create === false &&
    row.database_temp === false &&
    row.temporary_schema === false &&
    zeroFields.every((key) => row[key] === 0)
  )
}
function requireTarget(target) {
  const matrix = JSON.parse(
    sql('../docs/governance/evidence/hml-evidence-targets.json'),
  ).databases
  const known = matrix.find(
    (r) =>
      r.project === target?.project &&
      r.branch === target?.branch &&
      r.endpoint === target?.endpoint &&
      r.database === target?.database,
  )
  if (
    !target ||
    target.environment !== 'hml' ||
    target.classification !== 'confirmed-hml' ||
    !known ||
    known.classification === 'production-do-not-access' ||
    target.connectionBoundByOperator !== true ||
    target.destinationFingerprint !==
      createHash('sha256')
        .update(`${known.host}:5432/${known.database}`)
        .digest('hex') ||
    target.operatorApproved !== true ||
    target.capabilityReviewApproved !== true ||
    !/^\d{4}-\d{2}-\d{2}T/.test(target.expiresAt ?? '') ||
    !Number.isFinite(Date.parse(target.expiresAt)) ||
    Date.parse(target.expiresAt) <= Date.now() ||
    Date.parse(target.expiresAt) - Date.now() > 4 * 60 * 60 * 1000 ||
    !/^[a-f0-9]{64}$/.test(target.destinationFingerprint ?? '') ||
    !/^[a-f0-9]{64}$/.test(target.referenceCatalogDigest ?? '') ||
    !target.approvedRole ||
    !target.project ||
    !target.branch ||
    !target.endpoint ||
    !target.database ||
    /prod(?:uction)?/i.test(
      [
        target.project,
        target.branch,
        target.endpoint,
        target.database,
        target.name,
        target.approvedRole,
      ].join(' '),
    )
  )
    throw new Error('BLOCKED_TARGET')
}
export function historicalManifest() {
  const journal = JSON.parse(sql('../drizzle/meta/_journal.json'))
  return journal.entries.map((e) => ({
    hash: createHash('sha256')
      .update(sql(`../drizzle/${e.tag}.sql`))
      .digest('hex'),
    created_at: String(e.when),
  }))
}
export function compareHistory(rows, manifest = historicalManifest()) {
  if (!Array.isArray(rows)) return 'unverified'
  if (rows.length === 0) return 'empty-history-not-proof'
  if (
    rows.length !== 17 ||
    rows.some(
      (r, i) =>
        r.hash !== manifest[i]?.hash ||
        String(r.created_at) !== manifest[i]?.created_at,
    )
  )
    return 'divergent-or-0017plus'
  return 'verified-through-0016'
}
export async function verifyEvidence(client, target) {
  requireTarget(target) // no SQL before explicit target and approval
  let began = false
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    began = true
    const show = await client.query('SHOW transaction_read_only')
    if (show.rows?.[0]?.transaction_read_only !== 'on')
      throw new Error('BLOCKED_ACCESS')
    await client.query('SET LOCAL search_path TO pg_catalog')
    await client.query("SET LOCAL statement_timeout TO '10s'")
    await client.query("SET LOCAL lock_timeout TO '2s'")
    const row = (await client.query(sql('./hml-evidence-access.sql'))).rows?.[0]
    if (!accessIsSafe(row, target)) throw new Error('BLOCKED_ACCESS')
    const catalog = (await client.query(sql('./hml-evidence-catalog.sql')))
      .rows?.[0]?.catalog
    if (
      !catalog ||
      !Array.isArray(catalog.relations) ||
      !Array.isArray(catalog.columns)
    )
      throw new Error('BLOCKED_CATALOG')
    const relation = (schema, name) =>
      catalog.relations.find((r) => r[0] === schema && r[1] === name)
    const plain = (r) =>
      r && r[2] === 'r' && r[3] === 'p' && r[4] === false && r[5] === false
    const historyRelation = relation('drizzle', '__drizzle_migrations')
    let history = null
    if (historyRelation) {
      if (!plain(historyRelation)) throw new Error('BLOCKED_RELATION')
      history = (
        await client.query(
          'SELECT hash, created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at,id',
        )
      ).rows
    }
    const counts = {}
    // Exact aggregate allowlist. Never SELECT names, prices or business rows.
    for (const table of [
      'management_settings',
      'sales',
      'sale_items',
      'management_scenarios',
      'management_scenario_mix',
    ]) {
      const r = relation('public', table)
      if (!r) {
        counts[table] = 'absent'
        continue
      }
      if (!plain(r)) throw new Error('BLOCKED_RELATION')
      const value = (
        await client.query(
          `SELECT count(*)::text AS count FROM public."${table}"`,
        )
      ).rows?.[0]?.count
      if (!/^\d+$/.test(value ?? '')) throw new Error('BLOCKED_COUNT')
      counts[table] = value
    }
    const catalogDigest = digest(catalog)
    const historyState = compareHistory(history)
    const drift = catalogDigest !== target.referenceCatalogDigest
    return {
      observed_at_utc: new Date().toISOString(),
      project: target.project,
      branch: target.branch,
      endpoint: target.endpoint,
      destination_fingerprint: target.destinationFingerprint,
      database_verified: true,
      role_identity_verified: true,
      role_fingerprint: digest(row.role),
      server_fingerprint: digest([
        row.server_address,
        row.server_port,
        row.server_version_num,
      ]),
      server_version_num: row.server_version_num,
      transaction_read_only: true,
      history_state: historyState,
      history_digest: history ? digest(history) : null,
      history_records: history?.length ?? null,
      catalog_digest: catalogDigest,
      migration_hashes:
        history?.map((r, i) => ({
          position: i,
          hash: /^[a-f0-9]{64}$/.test(r.hash ?? '') ? r.hash : null,
          timestamp: /^\d+$/.test(String(r.created_at))
            ? String(r.created_at)
            : null,
        })) ?? null,
      drift,
      partial_application: 'operator-review-required',
      counts,
      state:
        historyState === 'verified-through-0016' && !drift
          ? 'ready-for-readonly-audit'
          : 'blocked',
      application_authorized: false,
      repair_authorized: false,
    }
  } catch {
    // Never propagate driver/SQL errors, which can contain URL, role or data.
    throw new Error('BLOCKED_READONLY_AUDIT')
  } finally {
    if (began) {
      try {
        await client.query('ROLLBACK')
      } catch {
        throw new Error('BLOCKED_ROLLBACK_CLOSE_CONNECTION')
      }
    }
  }
}
