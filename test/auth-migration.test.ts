import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('migration G1 cria somente estruturas de autenticação Cacau', async () => {
  const migration = await readFile(
    new URL('../drizzle/0014_puzzling_masque.sql', import.meta.url),
    'utf8',
  )

  assert.match(migration, /CREATE TABLE "app_user_access"/)
  assert.match(migration, /CREATE TABLE "auth_login_attempts"/)
  assert.match(migration, /CREATE TABLE "auth_audit_events"/)
  assert.match(migration, /UNIQUE\("auth_user_id"\)/)
  assert.match(migration, /UNIQUE\("identity_hash"\)/)
  assert.match(migration, /auth_login_attempts_cooldown_idx/)
  assert.match(migration, /auth_audit_events_actor_idx/)
  assert.match(migration, /auth_audit_events_occurred_at_idx/)
  assert.doesNotMatch(migration, /DROP |TRUNCATE |DELETE FROM /)
  assert.doesNotMatch(migration, /CREATE TABLE "inventory_cost_layers"/)
  assert.doesNotMatch(migration, /CREATE TABLE "inventory_cost_allocations"/)
  assert.doesNotMatch(migration, /CREATE TABLE "inventory_cost_reversals"/)
})
