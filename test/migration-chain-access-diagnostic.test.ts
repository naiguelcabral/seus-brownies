import assert from 'node:assert/strict'
import test from 'node:test'

const path = '../scripts/migration-chain-access-diagnostic.mjs'
const { assessAccessDiagnostic } = await import(path)
const row = {
  database: 'synthetic',
  role: 'reader',
  session_role: 'reader',
  reachable_roles: ['reader'],
  transaction_read_only: 'on',
  default_read_only: 'on',
  privileged_roles: 0,
  database_create: false,
  database_temp: false,
  schema_create: 0,
  persistent_write: 0,
  column_write: 0,
  sequence_write: 0,
  owned_relations: 0,
  executable_definers: 0,
}

test('a complete passing ACL diagnostic never authorizes collection, replacement or application', () => {
  const result = assessAccessDiagnostic(row)
  assert.equal(result.acl_checks_passed, true)
  assert.equal(result.application_authorized, false)
  assert.equal(result.replacement_authorized, false)
  assert.equal(result.shared_history_collected, false)
  assert.equal(result.requires_operator_review, true)
})

test('missing or writable privileges and session identities fail closed', () => {
  for (const field of [
    'privileged_roles',
    'schema_create',
    'persistent_write',
    'column_write',
    'sequence_write',
    'owned_relations',
    'executable_definers',
  ]) {
    for (const value of [1, undefined, '0', -1])
      assert.equal(
        assessAccessDiagnostic({ ...row, [field]: value }).acl_checks_passed,
        false,
      )
  }
  for (const field of ['database_create', 'database_temp']) {
    for (const value of [true, undefined, 'false'])
      assert.equal(
        assessAccessDiagnostic({ ...row, [field]: value }).acl_checks_passed,
        false,
      )
  }
  for (const field of ['transaction_read_only', 'default_read_only'])
    assert.equal(
      assessAccessDiagnostic({ ...row, [field]: 'off' }).acl_checks_passed,
      false,
    )
  assert.equal(
    assessAccessDiagnostic({ ...row, session_role: 'owner' }).acl_checks_passed,
    false,
  )
  assert.equal(assessAccessDiagnostic({}).acl_checks_passed, false)
  assert.equal(
    assessAccessDiagnostic({ ...row, database: 42 }).acl_checks_passed,
    false,
  )
  assert.equal(
    assessAccessDiagnostic({
      ...row,
      role: ' ',
      session_role: ' ',
      reachable_roles: [' '],
    }).acl_checks_passed,
    false,
  )
})
