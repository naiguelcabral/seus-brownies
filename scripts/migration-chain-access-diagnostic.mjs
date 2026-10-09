// No driver, DSN, credential loading or shared SQL execution entry point.
import { readFileSync } from 'node:fs'

export function assessAccessDiagnostic(row) {
  const blockers = []
  if (row?.transaction_read_only !== 'on')
    blockers.push('transaction-not-read-only')
  if (row?.default_read_only !== 'on')
    blockers.push('connection-default-not-read-only')
  for (const field of [
    'privileged_roles',
    'schema_create',
    'persistent_write',
    'column_write',
    'sequence_write',
    'owned_relations',
    'executable_definers',
  ]) {
    if (!Number.isSafeInteger(row?.[field]) || row[field] !== 0)
      blockers.push(field)
  }
  for (const field of ['database_create', 'database_temp'])
    if (row?.[field] !== false) blockers.push(field)
  if (
    !Array.isArray(row?.reachable_roles) ||
    !row.reachable_roles.includes(row?.role) ||
    !row.reachable_roles.includes(row?.session_role)
  )
    blockers.push('role-identity-incomplete')
  if (!row?.database || !row?.role || !row?.session_role)
    blockers.push('identity-incomplete')
  return {
    acl_checks_passed: blockers.length === 0,
    blockers,
    application_authorized: false,
    replacement_authorized: false,
    shared_history_collected: false,
    requires_operator_review: true,
  }
}

export async function diagnoseAccess(client) {
  await client.query('BEGIN READ ONLY')
  try {
    await client.query('SET LOCAL search_path TO pg_catalog')
    await client.query("SET LOCAL statement_timeout TO '10s'")
    await client.query("SET LOCAL lock_timeout TO '2s'")
    const sql = readFileSync(
      new URL('./migration-chain-access-diagnostic.sql', import.meta.url),
      'utf8',
    )
    const rows = (await client.query(sql)).rows
    if (rows.length !== 1) throw new Error('unexpected diagnostic result')
    const diagnostics = rows[0]
    const assessment = assessAccessDiagnostic(diagnostics)
    await client.query('ROLLBACK')
    return { diagnostics, assessment }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
