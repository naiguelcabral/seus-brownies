import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  managementScenarioHistory,
  managementScenarioMix,
  managementScenarios,
} from '../src/db/schema'
import { appendOperationalAudit } from '../src/features/operations/audit'
import {
  activateScenarioValues,
  archiveScenarioValues,
  createScenarioVersionValues,
  updateScenarioDraftValues,
} from '../src/features/scenarios/contracts'
import { calculateScenarioPage } from '../src/features/scenarios/pagination'

const draft = {
  id: 7,
  expectedRevision: 2,
  name: 'Meta mensal',
  description: 'Cenário sintético',
  effectiveOn: '2026-10-01',
  monthlyProfitGoal: '10000.00',
  fixedMonthlyCosts: '2200.00',
  salesDaysPerMonth: 20,
  weeksPerMonth: '4.00',
  minimumMarginRate: '0.7000',
  feeTaxReserveRate: '0.0300',
  mix: [],
}

test('contratos exigem revisão concorrente e motivo de lifecycle', () => {
  assert.equal(updateScenarioDraftValues.safeParse(draft).success, true)
  assert.equal(
    updateScenarioDraftValues.safeParse({ ...draft, expectedRevision: 0 })
      .success,
    false,
  )
  assert.equal(
    archiveScenarioValues.safeParse({
      id: 7,
      expectedRevision: 2,
      reason: 'Cenário encerrado',
    }).success,
    true,
  )
  assert.equal(
    archiveScenarioValues.safeParse({
      id: 7,
      expectedRevision: 2,
      reason: '',
    }).success,
    false,
  )
  assert.equal(
    createScenarioVersionValues.safeParse({
      sourceScenarioId: 7,
      reason: 'Premissas revistas',
    }).success,
    true,
  )
  assert.equal(
    activateScenarioValues.safeParse({ id: 7, expectedRevision: 2 }).success,
    true,
  )
})

test('schema preserva versão, revisão, pesos, snapshots e autoria', () => {
  assert.equal(managementScenarios.scenarioKey.name, 'scenario_key')
  assert.equal(managementScenarios.version.name, 'version')
  assert.equal(managementScenarios.revision.name, 'revision')
  assert.equal(managementScenarios.archiveReason.name, 'archive_reason')
  assert.equal(managementScenarioMix.originalWeight.name, 'original_weight')
  assert.equal(
    managementScenarioMix.normalizedWeightBps.name,
    'normalized_weight_bps',
  )
  assert.equal(managementScenarioMix.productName.name, 'product_name')
  assert.equal(managementScenarioHistory.snapshot.name, 'snapshot')
  assert.equal(
    managementScenarioHistory.actorAuthUserId.name,
    'actor_auth_user_id',
  )
})

test('migrations de cenário são aditivas, sem seed, e mantêm ativo único', async () => {
  const [foundation, productSnapshot] = await Promise.all([
    readFile(
      new URL('../drizzle/0027_clear_morgan_stark.sql', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../drizzle/0028_brave_xavin.sql', import.meta.url),
      'utf8',
    ),
  ])
  const sql = `${foundation}\n${productSnapshot}`
  assert.match(sql, /CREATE TABLE "management_scenarios"/)
  assert.match(sql, /management_scenarios_single_active_unique/)
  assert.match(sql, /WHERE "management_scenarios"\."status" = 'active'/)
  assert.match(sql, /ADD COLUMN "product_name" varchar\(120\) NOT NULL/)
  assert.doesNotMatch(sql, /DROP|TRUNCATE|DELETE FROM|INSERT INTO/i)
})

test('writers tornam versões finalizadas imutáveis e usam controle otimista', async () => {
  const source = await readFile(
    new URL('../src/features/scenarios/functions.ts', import.meta.url),
    'utf8',
  )
  const update = source.slice(
    source.indexOf('export async function persistScenarioDraftUpdate'),
    source.indexOf('export const updateScenarioDraft'),
  )
  assert.match(update, /eq\(managementScenarios\.status, 'draft'\)/)
  assert.match(
    update,
    /eq\(managementScenarios\.revision, data\.expectedRevision\)/,
  )
  assert.match(update, /revision: data\.expectedRevision \+ 1/)

  const version = source.slice(
    source.indexOf('export async function persistScenarioVersionCreate'),
    source.indexOf('export const createScenarioVersion'),
  )
  assert.match(version, /source\.row\.status === 'draft'/)
  assert.match(version, /\.insert\(managementScenarios\)/)
  assert.doesNotMatch(version, /\.update\(managementScenarios\)/)
  assert.match(version, /supersedesScenarioId: source\.row\.id/)
})

test('ativação serializa ativo único e revalida catálogo e projeção', async () => {
  const source = await readFile(
    new URL('../src/features/scenarios/functions.ts', import.meta.url),
    'utf8',
  )
  const activation = source.slice(
    source.indexOf('export async function persistScenarioActivation'),
    source.indexOf('export const activateScenario'),
  )
  assert.match(activation, /lockScenarioLifecycle\(tx\)/)
  assert.match(activation, /prepareMix\(tx, draft, true\)/)
  assert.match(activation, /Informe o motivo para substituir o cenário ativo/)
  assert.match(activation, /status: 'archived'/)
  assert.match(activation, /status: 'active'/)
  assert.match(activation, /appendScenarioHistory/)
  assert.match(activation, /appendScenarioAudit/)
})

test('cenário arquivado não aceita novo arquivamento silencioso', async () => {
  const source = await readFile(
    new URL('../src/features/scenarios/functions.ts', import.meta.url),
    'utf8',
  )
  const archive = source.slice(
    source.indexOf('export async function persistScenarioArchive'),
    source.indexOf('export const archiveScenario'),
  )
  assert.match(archive, /current\.row\.status === 'archived'/)
  assert.match(archive, /data\.expectedRevision/)
  assert.match(
    archive,
    /inArray\(managementScenarios\.status, \['draft', 'active'\]\)/,
  )
  assert.match(archive, /archiveReason: data\.reason/)
})

test('falha de auditoria crítica rejeita a operação chamadora', async () => {
  const failure = new Error('audit unavailable')
  await assert.rejects(
    appendOperationalAudit(
      {
        insert: () => ({
          values: async () => {
            throw failure
          },
        }),
      },
      {
        actorAuthUserId: 'owner-1',
        action: 'management_scenario.activate',
        entityType: 'management_scenario',
        entityId: 7,
        operationReference: 'scenario:key:version:2',
        reason: 'Substituição controlada',
      },
    ),
    failure,
  )
})

test('paginação de cenários mantém limites estáveis', () => {
  assert.deepEqual(calculateScenarioPage(9, 21), {
    page: 3,
    pageSize: 10,
    totalPages: 3,
    offset: 20,
  })
})
