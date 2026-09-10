import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { actionPlanHistory, actionPlans } from '../src/db/schema'
import { calculateActionPlanPage } from '../src/features/action-plans/pagination'
import { requiredPermissionForRoute } from '../src/features/auth/ui-access'

test('plano de ação pagina sem permitir deslocamento fora da faixa', () => {
  assert.deepEqual(calculateActionPlanPage(9, 21), {
    page: 2,
    pageSize: 20,
    totalPages: 2,
    offset: 20,
  })
  assert.equal(calculateActionPlanPage(-3, 0).page, 1)
})

test('plano de ação fica restrito ao papel autorizado e conserva histórico', async () => {
  assert.equal(requiredPermissionForRoute('/plano-de-acao'), 'access:manage')
  assert.equal(actionPlans.version.name, 'version')
  assert.equal(actionPlanHistory.snapshot.name, 'snapshot')

  const source = await readFile(
    new URL('../src/features/action-plans/functions.ts', import.meta.url),
    'utf8',
  )
  assert.match(source, /requireServerFunctionPermission\('listActionPlans'\)/)
  assert.match(source, /requireServerFunctionPermission\('createActionPlan'\)/)
  assert.match(source, /requireServerFunctionPermission\('updateActionPlan'\)/)
  assert.match(source, /eq\(actionPlans\.version, data\.expectedVersion\)/)
  assert.match(source, /insert\(actionPlanHistory\)/)
  assert.doesNotMatch(source, /openai|anthropic|workersAi/i)
})

test('migration de plano de ação é aditiva, indexada e não apaga histórico', async () => {
  const migration = await readFile(
    new URL('../drizzle/0020_colorful_kitty_pryde.sql', import.meta.url),
    'utf8',
  )
  assert.match(migration, /CREATE TABLE "action_plans"/)
  assert.match(migration, /CREATE TABLE "action_plan_history"/)
  assert.match(migration, /ON DELETE restrict/)
  assert.match(migration, /action_plans_status_due_date_idx/)
  assert.doesNotMatch(migration, /DROP|TRUNCATE|DELETE FROM/i)
})
