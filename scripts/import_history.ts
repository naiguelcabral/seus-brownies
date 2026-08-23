import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

import { config } from 'dotenv'
import { inArray, or } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'

import {
  expenses,
  historicalImportRecords,
  productImportAliases,
  products,
  purchaseItems,
  purchases,
  sales,
  salesLocations,
  saleItems,
  stockMovements,
} from '../src/db/schema.ts'

type ProductType = 'ingredient' | 'packaging' | 'finished_product'
type MeasurementUnit = 'g' | 'kg' | 'ml' | 'l' | 'm' | 'unit'

type ImportTarget = {
  sku: string
  name: string
  type: ProductType
  unit: MeasurementUnit
}

type PurchaseAlias = {
  sourceId: string
  sourceDescription: string
  status: 'approved' | 'pending'
  quantityMultiplier?: string
  target?: ImportTarget
  note?: string
  reason?: string
}

type HistoryPreview = {
  issues: string[]
  pendingAliases: PurchaseAlias[]
  locations: Array<{
    sourceId: string
    sourceKey: string
    sourceHash: string
    name: string
    classification: 'unclassified'
    frequency: string | null
    isActive: boolean | null
    notes: string | null
    payload: Record<string, string>
  }>
  sales: Array<{
    sourceId: string
    sourceKey: string
    sourceHash: string
    locationSourceId: string
    soldAt: string
    reportedAmount: string
    calculatedAmount: string
    auditStatus: string
    auditNotes: string | null
    items: Array<{
      sourceId: string
      productSourceId: string
      productName: string
      quantity: string
      unitPrice: string
      totalAmount: string
      payload: Record<string, string>
    }>
    payload: Record<string, unknown>
  }>
  purchases: Array<{
    sourceId: string
    sourceKey: string
    sourceHash: string
    purchasedAt: string
    supplierName: string | null
    itemName: string
    sourceUnit: MeasurementUnit
    sourceQuantityBase: string
    sourceQuantityPurchased: string
    sourceUnitPrice: string
    totalAmount: string
    effectiveQuantity: string
    target: ImportTarget
    alias: PurchaseAlias
    payload: Record<string, unknown>
  }>
  expenses: Array<{
    sourceId: string
    sourceKey: string
    sourceHash: string
    occurredAt: string
    description: string
    category: string
    amount: string
    notes: string | null
    payload: Record<string, unknown>
  }>
}

function usage(): never {
  throw new Error(
    'Uso: npm run import:history -- <caminho-do-workbook> --year 2026 --confirm',
  )
}

function parseArguments() {
  const args = process.argv.slice(2)
  let workbook: string | undefined
  let year: number | undefined
  let confirm = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--confirm') {
      confirm = true
      continue
    }
    if (argument === '--year') {
      year = Number(args[index + 1])
      index += 1
      continue
    }
    if (argument.startsWith('--') || workbook) usage()
    workbook = argument
  }
  if (!workbook || !year || !Number.isInteger(year)) usage()
  return { confirm, workbook, year }
}

function normalizeAlias(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function unitCost(totalAmount: string, quantity: string) {
  return (Number(totalAmount) / Number(quantity)).toFixed(2)
}

function readPreview(workbookPath: string, year: number): HistoryPreview {
  const raw = execFileSync(
    'python3',
    ['scripts/preview_history_workbook.py', workbookPath, '--year', String(year), '--format', 'json'],
    { cwd: process.cwd(), encoding: 'utf8' },
  )
  return JSON.parse(raw) as HistoryPreview
}

const { confirm, workbook, year } = parseArguments()
const workbookPath = resolve(workbook)
// The Markdown run keeps the audited report current; the JSON run supplies the validated payload.
const previewMessage = execFileSync(
  'python3',
  ['scripts/preview_history_workbook.py', workbookPath, '--year', String(year)],
  { cwd: process.cwd(), encoding: 'utf8' },
).trim()
if (previewMessage) console.log(previewMessage)
const history = readPreview(workbookPath, year)
const blockers = [
  ...history.issues,
  ...history.pendingAliases.map(
    (alias) => `${alias.sourceId} (${alias.sourceDescription}): ${alias.reason ?? 'alias pendente'}`,
  ),
]

// This happens before dotenv or any database connection: no partial import is possible.
if (blockers.length) {
  throw new Error(
    `Importação histórica bloqueada sem gravar dados:\n- ${blockers.join('\n- ')}`,
  )
}

if (!confirm) {
  console.log(
    `Prévia validada: ${history.locations.length} locais, ${history.sales.length} vendas, ${history.purchases.length} compras e ${history.expenses.length} despesas. Nenhum dado foi gravado. Execute novamente com --confirm para importar.`,
  )
  process.exit(0)
}

config({ path: ['.env.local', '.env'], quiet: true })
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('Defina DATABASE_URL em .env.local antes de importar o histórico.')
}

const db = drizzle(databaseUrl, {
  schema: {
    expenses,
    historicalImportRecords,
    productImportAliases,
    products,
    purchaseItems,
    purchases,
    saleItems,
    sales,
    salesLocations,
    stockMovements,
  },
})

await db.transaction(async (tx) => {
  const importRows = [
    ...history.locations.map((item) => ({ ...item, entityType: 'sales_location', sourceSheet: '04_Cadastro_Locais' })),
    ...history.sales.map((item) => ({ ...item, entityType: 'sale', sourceSheet: '05_Base_Vendas' })),
    ...history.purchases.map((item) => ({ ...item, entityType: 'purchase', sourceSheet: '07_Base_Compras_Despesas' })),
    ...history.expenses.map((item) => ({ ...item, entityType: 'expense', sourceSheet: '07_Base_Compras_Despesas' })),
  ]
  const existingImports = await tx
    .select({ sourceKey: historicalImportRecords.sourceKey, sourceHash: historicalImportRecords.sourceHash })
    .from(historicalImportRecords)
    .where(
      or(
        inArray(historicalImportRecords.sourceKey, importRows.map((item) => item.sourceKey)),
        inArray(historicalImportRecords.sourceHash, importRows.map((item) => item.sourceHash)),
      ),
    )
  if (existingImports.length) {
    throw new Error(
      `Importação interrompida: fontes já registradas (${existingImports.map((item) => item.sourceKey).join(', ')}).`,
    )
  }

  const targetsBySku = new Map<string, ImportTarget>()
  for (const purchase of history.purchases) {
    targetsBySku.set(purchase.target.sku, purchase.target)
  }
  const targets = [...targetsBySku.values()]
  const currentTargets = await tx
    .select({ id: products.id, sku: products.sku, name: products.name, type: products.type, unit: products.unit })
    .from(products)
    .where(inArray(products.sku, targets.map((target) => target.sku)))
  const currentTargetBySku = new Map(currentTargets.map((target) => [target.sku, target]))
  const nameCollisions = await tx
    .select({ id: products.id, sku: products.sku, name: products.name, type: products.type, unit: products.unit })
    .from(products)
    .where(inArray(products.name, targets.map((target) => target.name)))
  for (const target of targets) {
    const bySku = currentTargetBySku.get(target.sku)
    const byName = nameCollisions.find((product) => product.name === target.name)
    if (bySku && (bySku.name !== target.name || bySku.type !== target.type || bySku.unit !== target.unit)) {
      throw new Error(`Produto existente incompatível com o manifesto: ${target.sku}.`)
    }
    if (!bySku && byName) {
      throw new Error(`Produto com o nome ${target.name} já existe com SKU diferente; revise o manifesto.`)
    }
  }
  const targetsToCreate = targets.filter((target) => !currentTargetBySku.has(target.sku))
  if (targetsToCreate.length) {
    await tx.insert(products).values(
      targetsToCreate.map((target) => ({
        sku: target.sku,
        name: target.name,
        type: target.type,
        unit: target.unit,
        isActive: true,
        salePrice: null,
      })),
    )
  }
  const targetProducts = await tx
    .select({ id: products.id, sku: products.sku })
    .from(products)
    .where(inArray(products.sku, targets.map((target) => target.sku)))
  const productIdBySku = new Map(targetProducts.map((product) => [product.sku, product.id]))

  const sourceProductIds = [...new Set(history.sales.flatMap((sale) => sale.items.map((item) => item.productSourceId)))]
  const sourceProducts = await tx
    .select({ id: products.id, sku: products.sku })
    .from(products)
    .where(inArray(products.sku, sourceProductIds))
  if (sourceProducts.length !== sourceProductIds.length) {
    throw new Error('Importação interrompida: um produto de venda histórico não existe no catálogo.')
  }
  const productIdBySourceSku = new Map(sourceProducts.map((product) => [product.sku, product.id]))

  const existingLocations = await tx
    .select({ sourceId: salesLocations.sourceId, name: salesLocations.name })
    .from(salesLocations)
    .where(
      or(
        inArray(salesLocations.sourceId, history.locations.map((location) => location.sourceId)),
        inArray(salesLocations.name, history.locations.map((location) => location.name)),
      ),
    )
  if (existingLocations.length) {
    throw new Error('Importação interrompida: há locais/canais históricos já cadastrados.')
  }
  const insertedLocations = await tx
    .insert(salesLocations)
    .values(
      history.locations.map((location) => ({
        sourceId: location.sourceId,
        sourceHash: location.sourceHash,
        name: location.name,
        classification: location.classification,
        frequency: location.frequency,
        isActive: location.isActive ?? true,
        notes: location.notes,
      })),
    )
    .returning({ id: salesLocations.id, sourceId: salesLocations.sourceId })
  const locationIdBySourceId = new Map(
    insertedLocations.map((location) => [location.sourceId, location.id]),
  )

  const aliasesBySourceId = new Map<string, (typeof history.purchases)[number]>()
  for (const purchase of history.purchases) {
    aliasesBySourceId.set(purchase.sourceId, purchase)
  }
  const aliasSourceIds = [...aliasesBySourceId.keys()]
  const existingAliases = await tx
    .select({ sourceId: productImportAliases.sourceId })
    .from(productImportAliases)
    .where(inArray(productImportAliases.sourceId, aliasSourceIds))
  if (existingAliases.length) {
    throw new Error('Importação interrompida: um alias de compra já está cadastrado.')
  }
  await tx.insert(productImportAliases).values(
    [...aliasesBySourceId.values()].map((purchase) => ({
      sourceId: purchase.sourceId,
      sourceName: purchase.alias.sourceDescription,
      normalizedSourceName: normalizeAlias(purchase.alias.sourceDescription),
      productId: productIdBySku.get(purchase.target.sku)!,
      sourceUnit: purchase.sourceUnit,
      quantityMultiplier: purchase.alias.quantityMultiplier!,
      notes: purchase.alias.note ?? null,
    })),
  )

  for (const sale of history.sales) {
    const [insertedSale] = await tx
      .insert(sales)
      .values({
        sourceId: sale.sourceId,
        sourceHash: sale.sourceHash,
        locationId: locationIdBySourceId.get(sale.locationSourceId)!,
        status: 'paid',
        subtotalAmount: sale.reportedAmount,
        discountAmount: '0.00',
        deliveryFeeAmount: '0.00',
        totalAmount: sale.reportedAmount,
        reportedAmount: sale.reportedAmount,
        calculatedAmount: sale.calculatedAmount,
        auditStatus: sale.auditStatus,
        auditNotes: sale.auditNotes,
        affectsStock: false,
        notes: 'Importação histórica financeira do workbook.',
        soldAt: new Date(sale.soldAt),
      })
      .returning({ id: sales.id })
    await tx.insert(saleItems).values(
      sale.items.map((item) => ({
        saleId: insertedSale.id,
        productId: productIdBySourceSku.get(item.productSourceId)!,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount,
      })),
    )
  }

  for (const purchase of history.purchases) {
    const [insertedPurchase] = await tx
      .insert(purchases)
      .values({
        sourceId: purchase.sourceId,
        sourceHash: purchase.sourceHash,
        supplierName: purchase.supplierName,
        purchasedAt: purchase.purchasedAt,
        totalAmount: purchase.totalAmount,
        notes: 'Importação histórica do workbook.',
      })
      .returning({ id: purchases.id })
    await tx.insert(purchaseItems).values({
      sourceId: purchase.sourceId,
      sourceHash: purchase.sourceHash,
      purchaseId: insertedPurchase.id,
      productId: productIdBySku.get(purchase.target.sku)!,
      itemName: purchase.itemName,
      quantity: purchase.effectiveQuantity,
      unitCost: unitCost(purchase.totalAmount, purchase.effectiveQuantity),
      totalAmount: purchase.totalAmount,
      sourceQuantityBase: purchase.sourceQuantityBase,
      sourceQuantityPurchased: purchase.sourceQuantityPurchased,
      sourceUnitPrice: purchase.sourceUnitPrice,
    })
    await tx.insert(stockMovements).values({
      productId: productIdBySku.get(purchase.target.sku)!,
      type: 'purchase',
      quantityDelta: purchase.effectiveQuantity,
      unitCost: unitCost(purchase.totalAmount, purchase.effectiveQuantity),
      referenceType: 'purchase',
      referenceId: insertedPurchase.id,
      sourceKey: `workbook:2026:stock-movement:${purchase.sourceId}`,
      sourceHash: purchase.sourceHash,
      notes: `Entrada histórica: ${purchase.itemName}.`,
      occurredAt: new Date(`${purchase.purchasedAt}T12:00:00+00:00`),
    })
  }

  await tx.insert(expenses).values(
    history.expenses.map((expense) => ({
      sourceId: expense.sourceId,
      sourceHash: expense.sourceHash,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      occurredAt: expense.occurredAt,
      notes: expense.notes,
    })),
  )
  await tx.insert(historicalImportRecords).values(
    importRows.map((item) => ({
      sourceKey: item.sourceKey,
      sourceHash: item.sourceHash,
      entityType: item.entityType,
      sourceSheet: item.sourceSheet,
      payload: item.payload,
    })),
  )
})

console.log(
  `Histórico importado: ${history.locations.length} locais, ${history.sales.length} vendas, ${history.purchases.length} compras e ${history.expenses.length} despesas.`,
)
