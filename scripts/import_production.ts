import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

import { config } from 'dotenv'
import { inArray, or } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'

import {
  historicalImportRecords,
  operationalCostRates,
  products,
  productionBatches,
  productionBatchOutputs,
  productionProfiles,
  recipeItems,
  recipeOperationalRequirements,
  recipeVersions,
} from '../src/db/schema.ts'

type MeasurementUnit = 'g' | 'kg' | 'ml' | 'l' | 'm' | 'unit'
type OperationalType = 'energy' | 'labor'

type RecipeItem = {
  sourceName: string
  productSku: string
  productName: string
  quantity: string
  unit: MeasurementUnit
  historicalCost: string
  source: Record<string, string>
}

type OperationalRequirement = {
  type: OperationalType
  sourceName: string
  quantity: string
  unit: string
  historicalCost: string
  note: string
  source: Record<string, string>
}

type OperationalRate = {
  sourceId: string
  sourceKey: string
  sourceHash: string
  type: OperationalType
  unit: string
  unitAmount: string
  effectiveFrom: string
  note: string
  source: Record<string, unknown>
}

type Profile = {
  sourceId: string
  sourceKey: string
  sourceHash: string
  productSku: string
  productName: string
  cutSize: string | null
  filling: string | null
  expectedYield: string
  packagingSku: string | null
  packagingQuantity: string | null
  source: Record<string, string>
}

type Plan = {
  sourceId: string
  sourceKey: string
  sourceHash: string
  productSku: string
  profileSourceId: string
  plannedBatches: string
  expectedYield: string
  plannedQuantity: string
  historicalUnitCost: string
  historicalEstimatedCost: string
  notes: string | null
  source: Record<string, string>
}

type ProductionPayload = {
  issues: string[]
  recipe: {
    externalId: string
    sourceKey: string
    sourceHash: string
    name: string
    items: RecipeItem[]
    operational: OperationalRequirement[]
    source: Record<string, unknown>
  }
  rates: OperationalRate[]
  profiles: Profile[]
  plans: Plan[]
}

function usage(): never {
  throw new Error('Uso: npm run production:import -- <caminho-do-workbook> [--confirm]')
}

function parseArguments() {
  const args = process.argv.slice(2)
  let workbook: string | undefined
  let confirm = false
  for (const argument of args) {
    if (argument === '--confirm') {
      confirm = true
      continue
    }
    if (argument.startsWith('--') || workbook) usage()
    workbook = argument
  }
  if (!workbook) usage()
  return { confirm, workbook }
}

function sourceHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function readPayload(workbook: string): ProductionPayload {
  const raw = execFileSync('python3', ['scripts/production_payload.py', workbook], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  return JSON.parse(raw) as ProductionPayload
}

const { confirm, workbook } = parseArguments()
const workbookPath = resolve(workbook)
const previewMessage = execFileSync(
  'python3',
  ['scripts/preview_production_workbook.py', workbookPath],
  { cwd: process.cwd(), encoding: 'utf8' },
).trim()
if (previewMessage) console.log(previewMessage)
const payload = readPayload(workbookPath)

if (payload.issues.length) {
  throw new Error(`Importação de produção bloqueada sem gravar dados:\n- ${payload.issues.join('\n- ')}`)
}

if (!confirm) {
  console.log(
    `Prévia validada: 1 receita-base, ${payload.rates.length} tarifas operacionais, ${payload.profiles.length} perfis e ${payload.plans.length} planejamentos. Nenhum dado foi gravado. Execute novamente com --confirm para importar.`,
  )
  process.exit(0)
}

config({ path: ['.env.local', '.env'], quiet: true })
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Defina DATABASE_URL em .env.local antes de importar produção.')

const db = drizzle(databaseUrl, {
  schema: {
    historicalImportRecords,
    operationalCostRates,
    products,
    productionBatches,
    productionBatchOutputs,
    productionProfiles,
    recipeItems,
    recipeOperationalRequirements,
    recipeVersions,
  },
})

await db.transaction(async (tx) => {
  const records = [
    { sourceKey: payload.recipe.sourceKey, sourceHash: payload.recipe.sourceHash, entityType: 'recipe_version', sourceSheet: '03_Cadastro_Insumos', payload: payload.recipe.source },
    ...payload.rates.map((rate) => ({ sourceKey: rate.sourceKey, sourceHash: rate.sourceHash, entityType: 'operational_cost_rate', sourceSheet: '03_Cadastro_Insumos', payload: rate.source })),
    ...payload.profiles.map((profile) => ({ sourceKey: profile.sourceKey, sourceHash: profile.sourceHash, entityType: 'production_profile', sourceSheet: '02_Cadastro_Produtos', payload: profile.source })),
    ...payload.plans.map((plan) => ({ sourceKey: plan.sourceKey, sourceHash: plan.sourceHash, entityType: 'production_plan', sourceSheet: '09_Producao_Fornadas', payload: plan.source })),
  ]
  const existingRecords = await tx
    .select({ sourceKey: historicalImportRecords.sourceKey })
    .from(historicalImportRecords)
    .where(or(inArray(historicalImportRecords.sourceKey, records.map((record) => record.sourceKey)), inArray(historicalImportRecords.sourceHash, records.map((record) => record.sourceHash))))
  if (existingRecords.length) {
    throw new Error(`Importação interrompida: fontes já registradas (${existingRecords.map((record) => record.sourceKey).join(', ')}).`)
  }

  const existingRates = await tx
    .select({ sourceId: operationalCostRates.sourceId })
    .from(operationalCostRates)
    .where(
      or(
        inArray(operationalCostRates.sourceId, payload.rates.map((rate) => rate.sourceId)),
        inArray(operationalCostRates.sourceHash, payload.rates.map((rate) => rate.sourceHash)),
      ),
    )
  if (existingRates.length) {
    throw new Error(
      `Importação interrompida: tarifas operacionais já cadastradas (${existingRates.map((rate) => rate.sourceId).join(', ')}).`,
    )
  }

  const skus = [...new Set([
    ...payload.recipe.items.map((item) => item.productSku),
    ...payload.profiles.map((profile) => profile.productSku),
    ...payload.profiles.flatMap((profile) => (profile.packagingSku ? [profile.packagingSku] : [])),
  ])]
  const catalog = await tx
    .select({ id: products.id, sku: products.sku, name: products.name, type: products.type, unit: products.unit })
    .from(products)
    .where(inArray(products.sku, skus))
  if (catalog.length !== skus.length) throw new Error('Importação interrompida: SKU de receita ou perfil ausente do catálogo.')
  const productBySku = new Map(catalog.map((product) => [product.sku, product]))
  for (const item of payload.recipe.items) {
    const product = productBySku.get(item.productSku)!
    if (product.name !== item.productName || product.unit !== item.unit || !['ingredient', 'packaging'].includes(product.type)) {
      throw new Error(`Produto físico incompatível com o manifesto: ${item.productSku}.`)
    }
  }
  for (const profile of payload.profiles) {
    const product = productBySku.get(profile.productSku)!
    if (product.name !== profile.productName || product.type !== 'finished_product' || product.unit !== 'unit') {
      throw new Error(`Produto final incompatível com o perfil: ${profile.productSku}.`)
    }
    if (profile.packagingSku && productBySku.get(profile.packagingSku)?.type !== 'packaging') {
      throw new Error(`Embalagem incompatível com o perfil: ${profile.sourceId}.`)
    }
  }

  const duplicateRecipe = await tx.select({ id: recipeVersions.id }).from(recipeVersions).where(or(inArray(recipeVersions.sourceId, [payload.recipe.externalId]), inArray(recipeVersions.sourceHash, [payload.recipe.sourceHash])))
  const duplicateProfiles = await tx.select({ sourceId: productionProfiles.sourceId }).from(productionProfiles).where(inArray(productionProfiles.sourceId, payload.profiles.map((profile) => profile.sourceId)))
  const duplicatePlans = await tx.select({ sourceId: productionBatches.sourceId }).from(productionBatches).where(inArray(productionBatches.sourceId, payload.plans.map((plan) => plan.sourceId)))
  if (duplicateRecipe.length || duplicateProfiles.length || duplicatePlans.length) {
    throw new Error('Importação interrompida: receita, perfil ou planejamento já cadastrado.')
  }

  const [recipe] = await tx.insert(recipeVersions).values({
    sourceId: payload.recipe.externalId,
    sourceHash: payload.recipe.sourceHash,
    name: payload.recipe.name,
    version: 1,
    status: 'active',
    sourcePayload: payload.recipe.source,
  }).returning({ id: recipeVersions.id })

  await tx.insert(recipeItems).values(payload.recipe.items.map((item) => ({
    sourceKey: `workbook:recipe-item:${payload.recipe.externalId}:${item.sourceName}`,
    sourceHash: sourceHash(item),
    recipeVersionId: recipe.id,
    productId: productBySku.get(item.productSku)!.id,
    sourceName: item.sourceName,
    quantity: item.quantity,
    unit: item.unit,
    historicalCost: item.historicalCost,
    sourcePayload: item.source,
  })))
  await tx.insert(recipeOperationalRequirements).values(payload.recipe.operational.map((requirement) => ({
    sourceKey: `workbook:recipe-operational:${payload.recipe.externalId}:${requirement.type}`,
    sourceHash: sourceHash(requirement),
    recipeVersionId: recipe.id,
    type: requirement.type,
    quantity: requirement.quantity,
    unit: requirement.unit,
    historicalCost: requirement.historicalCost,
    sourcePayload: requirement.source,
  })))
  await tx.insert(operationalCostRates).values(payload.rates.map((rate) => ({
    sourceId: rate.sourceId,
    sourceHash: rate.sourceHash,
    type: rate.type,
    unit: rate.unit,
    unitAmount: rate.unitAmount,
    effectiveFrom: rate.effectiveFrom,
    sourcePayload: rate.source,
  })))

  const profiles = await tx.insert(productionProfiles).values(payload.profiles.map((profile) => ({
    sourceId: profile.sourceId,
    sourceHash: profile.sourceHash,
    recipeVersionId: recipe.id,
    productId: productBySku.get(profile.productSku)!.id,
    cutSize: profile.cutSize,
    filling: profile.filling,
    expectedYield: profile.expectedYield,
    packagingProductId: profile.packagingSku ? productBySku.get(profile.packagingSku)!.id : null,
    packagingQuantity: profile.packagingQuantity,
    sourcePayload: profile.source,
  }))).returning({ id: productionProfiles.id, sourceId: productionProfiles.sourceId })
  const profileIdBySourceId = new Map(profiles.map((profile) => [profile.sourceId, profile.id]))

  for (const plan of payload.plans) {
    const [batch] = await tx.insert(productionBatches).values({
      sourceId: plan.sourceId,
      sourceHash: plan.sourceHash,
      productionProfileId: profileIdBySourceId.get(plan.profileSourceId)!,
      recipeVersionId: recipe.id,
      status: 'planned',
      plannedBatchCount: plan.plannedBatches,
      plannedQuantity: plan.plannedQuantity,
      sourcePayload: plan.source,
      notes: plan.notes,
    }).returning({ id: productionBatches.id })
    await tx.insert(productionBatchOutputs).values({
      sourceKey: `workbook:production-plan-output:${plan.sourceId}`,
      sourceHash: sourceHash(plan),
      productionBatchId: batch.id,
      productId: productBySku.get(plan.productSku)!.id,
      plannedQuantity: plan.plannedQuantity,
      unitCost: plan.historicalUnitCost,
    })
  }

  await tx.insert(historicalImportRecords).values(records)
})

console.log(`Produção importada: 1 receita-base, ${payload.rates.length} tarifas operacionais, ${payload.profiles.length} perfis e ${payload.plans.length} planejamentos; nenhum movimento de estoque foi criado.`)
