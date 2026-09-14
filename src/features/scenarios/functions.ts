import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  max,
  or,
  sql,
} from 'drizzle-orm'

import {
  managementScenarioHistory,
  managementScenarioMix,
  managementScenarios,
  products,
} from '#/db/schema'
import { hasPermission } from '#/features/auth/authorization'
import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'
import { appendOperationalAudit } from '#/features/operations/audit'
import {
  calculateScenarioProjection,
  normalizeScenarioMix,
  validateScenarioActivation,
} from '#/features/scenarios/calculations'
import {
  activateScenarioValues,
  archiveScenarioValues,
  createScenarioVersionValues,
  listScenariosValues,
  scenarioDraftValues,
  updateScenarioDraftValues,
} from '#/features/scenarios/contracts'
import type {
  ActivateScenarioInput,
  ArchiveScenarioInput,
  CreateScenarioVersionInput,
  ScenarioDraftInput,
  UpdateScenarioDraftInput,
} from '#/features/scenarios/contracts'
import {
  calculateScenarioPage,
  scenarioPageSize,
} from '#/features/scenarios/pagination'
import { centsToMoney, moneyToCents } from '#/features/production/calculations'

type CatalogProduct = {
  id: number
  name: string
  type: string
  isActive: boolean
  salePrice: string | null
}
type StoredMixRow = {
  scenarioId: number
  productId: number
  productName: string
  originalWeight: string
  normalizedWeightBps: number
  plannedUnitPrice: string
  plannedUnitCost: string
  currentProductName: string
  productType: string
  productIsActive: boolean
}

export class ScenarioSchemaUnavailableError extends Error {
  constructor() {
    super('Metas e cenários requerem as migrations 0027 e 0028.')
  }
}

function assertScenarioSchema(error: unknown): never {
  const code = (error as { code?: string } | null)?.code
  if (code === '42P01' || code === '42703')
    throw new ScenarioSchemaUnavailableError()
  throw error
}

function normalizedRate(value: string) {
  const normalized = value.trim().replace(',', '.')
  const [whole, fraction = ''] = normalized.split('.')
  return Number(BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, '0')))
}

function rateFromBps(value: number) {
  const units = BigInt(value)
  return `${units / 10_000n}.${String(units % 10_000n).padStart(4, '0')}`
}

function normalizedWeeks(value: string) {
  const normalized = value.trim().replace(',', '.')
  const [whole, fraction = ''] = normalized.split('.')
  return `${BigInt(whole)}.${fraction.padEnd(2, '0')}`
}

function optionalText(value?: string) {
  return value?.trim() || null
}

function normalizeDraft(data: ScenarioDraftInput) {
  const monthlyProfitGoal = moneyToCents(data.monthlyProfitGoal)
  const fixedMonthlyCosts = moneyToCents(data.fixedMonthlyCosts)
  if (
    monthlyProfitGoal === null ||
    monthlyProfitGoal <= 0n ||
    fixedMonthlyCosts === null ||
    fixedMonthlyCosts < 0n
  )
    throw new Error('Premissas monetárias inválidas.')
  return {
    scenario: {
      name: data.name.trim(),
      description: optionalText(data.description),
      effectiveOn: data.effectiveOn,
      monthlyProfitGoal: centsToMoney(monthlyProfitGoal),
      fixedMonthlyCosts: centsToMoney(fixedMonthlyCosts),
      salesDaysPerMonth: data.salesDaysPerMonth,
      weeksPerMonth: normalizedWeeks(data.weeksPerMonth),
      minimumMarginBps: normalizedRate(data.minimumMarginRate),
      feeTaxReserveBps: normalizedRate(data.feeTaxReserveRate),
    },
    mix: data.mix.length ? normalizeScenarioMix(data.mix).rows : [],
  }
}

async function loadProducts(
  database: any,
  productIds: number[],
): Promise<CatalogProduct[]> {
  if (!productIds.length) return []
  return database
    .select({
      id: products.id,
      name: products.name,
      type: products.type,
      isActive: products.isActive,
      salePrice: products.salePrice,
    })
    .from(products)
    .where(inArray(products.id, productIds))
    .orderBy(asc(products.name), asc(products.id)) as Promise<CatalogProduct[]>
}

async function loadMix(
  database: any,
  scenarioIds: number[],
): Promise<StoredMixRow[]> {
  if (!scenarioIds.length) return []
  return database
    .select({
      scenarioId: managementScenarioMix.scenarioId,
      productId: managementScenarioMix.productId,
      productName: managementScenarioMix.productName,
      originalWeight: managementScenarioMix.originalWeight,
      normalizedWeightBps: managementScenarioMix.normalizedWeightBps,
      plannedUnitPrice: managementScenarioMix.plannedUnitPrice,
      plannedUnitCost: managementScenarioMix.plannedUnitCost,
      currentProductName: products.name,
      productType: products.type,
      productIsActive: products.isActive,
    })
    .from(managementScenarioMix)
    .innerJoin(products, eq(managementScenarioMix.productId, products.id))
    .where(inArray(managementScenarioMix.scenarioId, scenarioIds))
    .orderBy(asc(managementScenarioMix.productId)) as Promise<StoredMixRow[]>
}

function groupMix(rows: Awaited<ReturnType<typeof loadMix>>) {
  const grouped = new Map<number, typeof rows>()
  for (const row of rows) {
    const group = grouped.get(row.scenarioId) ?? []
    group.push(row)
    grouped.set(row.scenarioId, group)
  }
  return grouped
}

function draftFromStored(
  row: typeof managementScenarios.$inferSelect,
  mix: Awaited<ReturnType<typeof loadMix>>,
): ScenarioDraftInput {
  return {
    name: row.name,
    description: row.description ?? undefined,
    effectiveOn: row.effectiveOn,
    monthlyProfitGoal: row.monthlyProfitGoal,
    fixedMonthlyCosts: row.fixedMonthlyCosts,
    salesDaysPerMonth: row.salesDaysPerMonth,
    weeksPerMonth: row.weeksPerMonth,
    minimumMarginRate: rateFromBps(row.minimumMarginBps),
    feeTaxReserveRate: rateFromBps(row.feeTaxReserveBps),
    mix: mix.map((item) => ({
      productId: item.productId,
      originalWeight: item.originalWeight,
      plannedUnitPrice: item.plannedUnitPrice,
      plannedUnitCost: item.plannedUnitCost,
    })),
  }
}

function snapshot(
  row: typeof managementScenarios.$inferSelect,
  mix: Array<{
    productId: number
    productName: string
    originalWeight: string
    normalizedWeightBps: number
    plannedUnitPrice: string
    plannedUnitCost: string
  }>,
) {
  return {
    scenarioKey: row.scenarioKey,
    version: row.version,
    revision: row.revision,
    status: row.status,
    name: row.name,
    description: row.description,
    effectiveOn: row.effectiveOn,
    monthlyProfitGoal: row.monthlyProfitGoal,
    fixedMonthlyCosts: row.fixedMonthlyCosts,
    salesDaysPerMonth: row.salesDaysPerMonth,
    weeksPerMonth: row.weeksPerMonth,
    minimumMarginBps: row.minimumMarginBps,
    feeTaxReserveBps: row.feeTaxReserveBps,
    supersedesScenarioId: row.supersedesScenarioId,
    replacementReason: row.replacementReason,
    archiveReason: row.archiveReason,
    mix,
  }
}

async function appendScenarioHistory(
  tx: any,
  row: typeof managementScenarios.$inferSelect,
  mix: Array<{
    productId: number
    productName: string
    originalWeight: string
    normalizedWeightBps: number
    plannedUnitPrice: string
    plannedUnitCost: string
  }>,
  event: string,
  actorAuthUserId: string,
  reason?: string | null,
) {
  await tx.insert(managementScenarioHistory).values({
    scenarioId: row.id,
    revision: row.revision,
    scenarioVersion: row.version,
    event,
    actorAuthUserId,
    reason: reason?.trim() || null,
    snapshot: snapshot(row, mix),
  })
}

async function appendScenarioAudit(
  tx: any,
  row: typeof managementScenarios.$inferSelect,
  action: string,
  actorAuthUserId: string,
  reason?: string | null,
) {
  await appendOperationalAudit(tx, {
    actorAuthUserId,
    action,
    entityType: 'management_scenario',
    entityId: row.id,
    operationReference: `management-scenario:${row.scenarioKey}:version:${row.version}:revision:${row.revision}`,
    reason,
  })
}

async function prepareMix(
  tx: any,
  data: ScenarioDraftInput,
  requireActivation = false,
) {
  const normalized = normalizeDraft(data)
  const catalogProducts = await loadProducts(
    tx,
    data.mix.map((item) => item.productId),
  )
  if (data.mix.length) validateScenarioActivation(data, catalogProducts)
  if (requireActivation) {
    validateScenarioActivation(data, catalogProducts)
    calculateScenarioProjection(data, catalogProducts)
  }
  const names = new Map<number, string>(
    catalogProducts.map((product) => [product.id, product.name]),
  )
  return {
    ...normalized,
    mix: normalized.mix.map((item) => ({
      ...item,
      productName: names.get(item.productId)!,
    })),
  }
}

async function replaceMix(
  tx: any,
  scenarioId: number,
  mix: Awaited<ReturnType<typeof prepareMix>>['mix'],
) {
  await tx
    .delete(managementScenarioMix)
    .where(eq(managementScenarioMix.scenarioId, scenarioId))
  if (mix.length)
    await tx.insert(managementScenarioMix).values(
      mix.map((item) => ({
        scenarioId,
        ...item,
      })),
    )
}

function publicScenario(
  row: typeof managementScenarios.$inferSelect,
  mix: Awaited<ReturnType<typeof loadMix>>,
) {
  const draft = draftFromStored(row, mix)
  const productStates = mix.map((item) => ({
    id: item.productId,
    name: item.productName,
    type: item.productType,
    isActive: item.productIsActive,
  }))
  let projection: ReturnType<typeof calculateScenarioProjection> | null = null
  let projectionStatus: 'available' | 'pending' = 'pending'
  let projectionMessage = mix.length
    ? 'Revise as premissas para calcular a projeção.'
    : 'Premissa pendente: informe o mix de produtos.'
  try {
    projection = calculateScenarioProjection(draft, productStates)
    projectionStatus = 'available'
    projectionMessage = 'Projeção calculada pelas premissas desta versão.'
  } catch (error) {
    projectionMessage =
      error instanceof Error ? error.message : 'Projeção indisponível.'
  }
  return {
    ...row,
    minimumMarginRate: rateFromBps(row.minimumMarginBps),
    feeTaxReserveRate: rateFromBps(row.feeTaxReserveBps),
    mix,
    projection,
    projectionStatus,
    projectionMessage,
  }
}

export const listScenarios = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('listScenarios')])
  .validator(listScenariosValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    const database = getDb()
    try {
      const where = and(
        data.query
          ? or(
              ilike(managementScenarios.name, `%${data.query}%`),
              ilike(managementScenarios.description, `%${data.query}%`),
            )
          : undefined,
        data.status ? eq(managementScenarios.status, data.status) : undefined,
      )
      const [{ total }] = await database
        .select({ total: count() })
        .from(managementScenarios)
        .where(where)
      const pagination = calculateScenarioPage(data.page, Number(total))
      const [rows, activeRows, activeProducts] = await Promise.all([
        database
          .select()
          .from(managementScenarios)
          .where(where)
          .orderBy(
            desc(managementScenarios.effectiveOn),
            desc(managementScenarios.id),
          )
          .limit(scenarioPageSize)
          .offset(pagination.offset),
        database
          .select()
          .from(managementScenarios)
          .where(eq(managementScenarios.status, 'active'))
          .limit(1),
        database
          .select({
            id: products.id,
            name: products.name,
            salePrice: products.salePrice,
          })
          .from(products)
          .where(
            and(
              eq(products.type, 'finished_product'),
              eq(products.isActive, true),
            ),
          )
          .orderBy(asc(products.name), asc(products.id)),
      ])
      const scenarioIds = [
        ...new Set([...rows, ...activeRows].map((row) => row.id)),
      ]
      const mixes = groupMix(await loadMix(database, scenarioIds))
      return {
        scenarios: rows.map((row) =>
          publicScenario(row, mixes.get(row.id) ?? []),
        ),
        activeScenario: activeRows[0]
          ? publicScenario(activeRows[0], mixes.get(activeRows[0].id) ?? [])
          : null,
        activeProducts,
        canWrite: hasPermission(context.principal!.role, 'scenarios:write'),
        total: Number(total),
        ...pagination,
      }
    } catch (error) {
      assertScenarioSchema(error)
    }
  })

export async function persistScenarioCreate(
  database: any,
  data: ScenarioDraftInput,
  actorAuthUserId: string,
) {
  return database.transaction(async (tx: any) => {
    try {
      const prepared = await prepareMix(tx, data)
      const [created] = await tx
        .insert(managementScenarios)
        .values({
          scenarioKey: crypto.randomUUID(),
          version: 1,
          ...prepared.scenario,
          createdByAuthUserId: actorAuthUserId,
          updatedByAuthUserId: actorAuthUserId,
        })
        .returning()
      if (!created) throw new Error('Não foi possível criar o cenário.')
      await replaceMix(tx, created.id, prepared.mix)
      await appendScenarioHistory(
        tx,
        created,
        prepared.mix,
        'created',
        actorAuthUserId,
      )
      await appendScenarioAudit(
        tx,
        created,
        'management_scenario.create',
        actorAuthUserId,
      )
      return {
        id: created.id,
        version: created.version,
        revision: created.revision,
      }
    } catch (error) {
      assertScenarioSchema(error)
    }
  })
}

export const createScenario = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('createScenario')])
  .validator(scenarioDraftValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistScenarioCreate(getDb(), data, context.principal!.id)
  })

export async function persistScenarioDraftUpdate(
  database: any,
  data: UpdateScenarioDraftInput,
  actorAuthUserId: string,
) {
  return database.transaction(async (tx: any) => {
    try {
      const prepared = await prepareMix(tx, data)
      const [updated] = await tx
        .update(managementScenarios)
        .set({
          ...prepared.scenario,
          revision: data.expectedRevision + 1,
          updatedByAuthUserId: actorAuthUserId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(managementScenarios.id, data.id),
            eq(managementScenarios.status, 'draft'),
            eq(managementScenarios.revision, data.expectedRevision),
          ),
        )
        .returning()
      if (!updated)
        throw new Error(
          'O rascunho foi alterado por outra sessão, não existe ou já foi finalizado. Recarregue.',
        )
      await replaceMix(tx, updated.id, prepared.mix)
      await appendScenarioHistory(
        tx,
        updated,
        prepared.mix,
        'updated',
        actorAuthUserId,
        `Revisão ${data.expectedRevision} substituída pela revisão ${updated.revision}.`,
      )
      await appendScenarioAudit(
        tx,
        updated,
        'management_scenario.update',
        actorAuthUserId,
        `Revisão ${data.expectedRevision} substituída pela revisão ${updated.revision}.`,
      )
      return {
        id: updated.id,
        version: updated.version,
        revision: updated.revision,
      }
    } catch (error) {
      assertScenarioSchema(error)
    }
  })
}

export const updateScenarioDraft = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('updateScenarioDraft')])
  .validator(updateScenarioDraftValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistScenarioDraftUpdate(getDb(), data, context.principal!.id)
  })

async function scenarioWithMix(tx: any, id: number) {
  const [row] = await tx
    .select()
    .from(managementScenarios)
    .where(eq(managementScenarios.id, id))
    .limit(1)
  if (!row) throw new Error('Cenário não encontrado.')
  return { row, mix: await loadMix(tx, [id]) }
}

export async function persistScenarioVersionCreate(
  database: any,
  data: CreateScenarioVersionInput,
  actorAuthUserId: string,
) {
  return database.transaction(async (tx: any) => {
    try {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`cacau:management-scenario-version:${data.sourceScenarioId}`}, 0))`,
      )
      const source = await scenarioWithMix(tx, data.sourceScenarioId)
      if (source.row.status === 'draft')
        throw new Error('Edite o rascunho atual em vez de criar outra versão.')
      const [{ maximumVersion }] = await tx
        .select({ maximumVersion: max(managementScenarios.version) })
        .from(managementScenarios)
        .where(eq(managementScenarios.scenarioKey, source.row.scenarioKey))
      const version = (maximumVersion ?? source.row.version) + 1
      const [created] = await tx
        .insert(managementScenarios)
        .values({
          scenarioKey: source.row.scenarioKey,
          version,
          name: source.row.name,
          description: source.row.description,
          effectiveOn: source.row.effectiveOn,
          monthlyProfitGoal: source.row.monthlyProfitGoal,
          fixedMonthlyCosts: source.row.fixedMonthlyCosts,
          salesDaysPerMonth: source.row.salesDaysPerMonth,
          weeksPerMonth: source.row.weeksPerMonth,
          minimumMarginBps: source.row.minimumMarginBps,
          feeTaxReserveBps: source.row.feeTaxReserveBps,
          supersedesScenarioId: source.row.id,
          replacementReason: data.reason,
          createdByAuthUserId: actorAuthUserId,
          updatedByAuthUserId: actorAuthUserId,
        })
        .returning()
      if (!created) throw new Error('Não foi possível criar a nova versão.')
      const copiedMix = source.mix.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        originalWeight: item.originalWeight,
        normalizedWeightBps: item.normalizedWeightBps,
        plannedUnitPrice: item.plannedUnitPrice,
        plannedUnitCost: item.plannedUnitCost,
      }))
      await replaceMix(tx, created.id, copiedMix)
      await appendScenarioHistory(
        tx,
        created,
        copiedMix,
        'version_created',
        actorAuthUserId,
        data.reason,
      )
      await appendScenarioAudit(
        tx,
        created,
        'management_scenario.version_create',
        actorAuthUserId,
        data.reason,
      )
      return {
        id: created.id,
        version: created.version,
        revision: created.revision,
      }
    } catch (error) {
      assertScenarioSchema(error)
    }
  })
}

export const createScenarioVersion = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('createScenarioVersion')])
  .validator(createScenarioVersionValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistScenarioVersionCreate(getDb(), data, context.principal!.id)
  })

async function lockScenarioLifecycle(tx: any) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended('cacau:management-scenario-active', 0))`,
  )
}

export async function persistScenarioActivation(
  database: any,
  data: ActivateScenarioInput,
  actorAuthUserId: string,
) {
  return database.transaction(async (tx: any) => {
    try {
      await lockScenarioLifecycle(tx)
      const candidate = await scenarioWithMix(tx, data.id)
      if (
        candidate.row.status !== 'draft' ||
        candidate.row.revision !== data.expectedRevision
      )
        throw new Error(
          'O cenário mudou, não é rascunho ou não existe. Recarregue antes de ativar.',
        )
      const draft = draftFromStored(candidate.row, candidate.mix)
      await prepareMix(tx, draft, true)
      const [currentActive] = await tx
        .select()
        .from(managementScenarios)
        .where(eq(managementScenarios.status, 'active'))
        .limit(1)
      if (currentActive && !data.reason)
        throw new Error('Informe o motivo para substituir o cenário ativo.')
      if (currentActive) {
        const currentMix = await loadMix(tx, [currentActive.id])
        const [archived] = await tx
          .update(managementScenarios)
          .set({
            status: 'archived',
            revision: currentActive.revision + 1,
            archiveReason: data.reason,
            archivedByAuthUserId: actorAuthUserId,
            archivedAt: new Date(),
            updatedByAuthUserId: actorAuthUserId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(managementScenarios.id, currentActive.id),
              eq(managementScenarios.status, 'active'),
              eq(managementScenarios.revision, currentActive.revision),
            ),
          )
          .returning()
        if (!archived)
          throw new Error('O cenário ativo mudou durante a substituição.')
        const archivedMix = currentMix.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          originalWeight: item.originalWeight,
          normalizedWeightBps: item.normalizedWeightBps,
          plannedUnitPrice: item.plannedUnitPrice,
          plannedUnitCost: item.plannedUnitCost,
        }))
        await appendScenarioHistory(
          tx,
          archived,
          archivedMix,
          'replaced',
          actorAuthUserId,
          data.reason,
        )
        await appendScenarioAudit(
          tx,
          archived,
          'management_scenario.replace',
          actorAuthUserId,
          data.reason,
        )
      }
      const [activated] = await tx
        .update(managementScenarios)
        .set({
          status: 'active',
          revision: data.expectedRevision + 1,
          replacementReason: data.reason ?? candidate.row.replacementReason,
          activatedByAuthUserId: actorAuthUserId,
          activatedAt: new Date(),
          updatedByAuthUserId: actorAuthUserId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(managementScenarios.id, data.id),
            eq(managementScenarios.status, 'draft'),
            eq(managementScenarios.revision, data.expectedRevision),
          ),
        )
        .returning()
      if (!activated)
        throw new Error('O cenário mudou durante a ativação. Recarregue.')
      const activatedMix = candidate.mix.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        originalWeight: item.originalWeight,
        normalizedWeightBps: item.normalizedWeightBps,
        plannedUnitPrice: item.plannedUnitPrice,
        plannedUnitCost: item.plannedUnitCost,
      }))
      await appendScenarioHistory(
        tx,
        activated,
        activatedMix,
        'activated',
        actorAuthUserId,
        data.reason,
      )
      await appendScenarioAudit(
        tx,
        activated,
        'management_scenario.activate',
        actorAuthUserId,
        data.reason,
      )
      return {
        id: activated.id,
        version: activated.version,
        revision: activated.revision,
      }
    } catch (error) {
      assertScenarioSchema(error)
    }
  })
}

export const activateScenario = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('activateScenario')])
  .validator(activateScenarioValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistScenarioActivation(getDb(), data, context.principal!.id)
  })

export async function persistScenarioArchive(
  database: any,
  data: ArchiveScenarioInput,
  actorAuthUserId: string,
) {
  return database.transaction(async (tx: any) => {
    try {
      await lockScenarioLifecycle(tx)
      const current = await scenarioWithMix(tx, data.id)
      if (
        current.row.status === 'archived' ||
        current.row.revision !== data.expectedRevision
      )
        throw new Error(
          'O cenário mudou, já está arquivado ou não existe. Recarregue.',
        )
      const [archived] = await tx
        .update(managementScenarios)
        .set({
          status: 'archived',
          revision: data.expectedRevision + 1,
          archiveReason: data.reason,
          archivedByAuthUserId: actorAuthUserId,
          archivedAt: new Date(),
          updatedByAuthUserId: actorAuthUserId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(managementScenarios.id, data.id),
            inArray(managementScenarios.status, ['draft', 'active']),
            eq(managementScenarios.revision, data.expectedRevision),
          ),
        )
        .returning()
      if (!archived)
        throw new Error('O cenário mudou durante o arquivamento. Recarregue.')
      const archivedMix = current.mix.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        originalWeight: item.originalWeight,
        normalizedWeightBps: item.normalizedWeightBps,
        plannedUnitPrice: item.plannedUnitPrice,
        plannedUnitCost: item.plannedUnitCost,
      }))
      await appendScenarioHistory(
        tx,
        archived,
        archivedMix,
        'archived',
        actorAuthUserId,
        data.reason,
      )
      await appendScenarioAudit(
        tx,
        archived,
        'management_scenario.archive',
        actorAuthUserId,
        data.reason,
      )
      return {
        id: archived.id,
        version: archived.version,
        revision: archived.revision,
      }
    } catch (error) {
      assertScenarioSchema(error)
    }
  })
}

export const archiveScenario = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('archiveScenario')])
  .validator(archiveScenarioValues)
  .handler(async ({ data, context }) => {
    const { getDb } = await import('#/db/index')
    return persistScenarioArchive(getDb(), data, context.principal!.id)
  })
