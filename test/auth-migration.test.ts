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

test('migrations de papéis adicionam Dono e Funcionário e auditam a transição', async () => {
  const [roles, transition] = await Promise.all([
    readFile(
      new URL(
        '../drizzle/0015_add-owner-and-employee-roles.sql',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL('../drizzle/0016_migrate-admin-to-owner.sql', import.meta.url),
      'utf8',
    ),
  ])

  assert.match(roles, /ADD VALUE 'owner'/)
  assert.match(roles, /ADD VALUE 'employee'/)
  assert.match(transition, /UPDATE "public"\."app_user_access"/)
  assert.match(transition, /'admin'.*'owner'/s)
  assert.match(transition, /INSERT INTO "public"\."auth_audit_events"/)
  assert.match(transition, /'role_changed'/)
  assert.doesNotMatch(transition, /DROP |TRUNCATE |DELETE FROM /)
})
