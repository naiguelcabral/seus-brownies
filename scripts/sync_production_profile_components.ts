import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

import { config } from 'dotenv'
import { and, eq, inArray, or } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'

import {
  products,
  productionProfileComponents,
  productionProfiles,
} from '../src/db/schema.ts'

type Component = {
  sourceId: string
  sourceHash: string
  profileSourceId: string
  productSku: string
  productName: string
  fillingProductSku: string
  fillingProductName: string
  role: 'filling'
  quantity: string
  unit: 'g'
  quantityBasis: 'per_finished_unit'
  source: Record<string, unknown>
}

type ComponentPayload = {
  issues: string[]
  components: Component[]
}

function usage(): never {
  throw new Error('Uso: npm run production:profiles:sync -- <caminho-do-workbook> [--confirm]')
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

function readPayload(workbook: string): ComponentPayload {
  const raw = execFileSync('python3', ['scripts/production_profile_components_payload.py', workbook], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  return JSON.parse(raw) as ComponentPayload
}

function normalizeDecimal(value: string) {
  const normalized = value.trim().replace(',', '.')
  const [integerPart, decimalPart = ''] = normalized.split('.')
  const integer = String(Number(integerPart || '0'))
  const decimal = decimalPart.replace(/0+$/, '')
  return decimal ? `${integer}.${decimal}` : integer
}

function sameComponent(
  existing: {
    sourceId: string
    sourceHash: string
    productionProfileId: number
    productId: number
    role: string
    quantity: string
    unit: string
    quantityBasis: string
  },
  component: Component,
  profileId: number,
  productId: number,
) {
  return (
    existing.sourceId === component.sourceId &&
    existing.sourceHash === component.sourceHash &&
    existing.productionProfileId === profileId &&
    existing.productId === productId &&
    existing.role === component.role &&
    normalizeDecimal(existing.quantity) === normalizeDecimal(component.quantity) &&
    existing.unit === component.unit &&
    existing.quantityBasis === component.quantityBasis
  )
}

const { confirm, workbook } = parseArguments()
const workbookPath = resolve(workbook)
const payload = readPayload(workbookPath)

if (payload.issues.length) {
  throw new Error(`Sincronização bloqueada sem gravar dados:\n- ${payload.issues.join('\n- ')}`)
}

if (!confirm) {
  console.log(
    `Prévia validada: ${payload.components.length} componentes de recheio aprovados por decisão operacional. Nenhum dado foi gravado. Execute novamente com --confirm para sincronizar.`,
  )
  process.exit(0)
}

config({ path: ['.env.local', '.env'], quiet: true })
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Defina DATABASE_URL em .env.local antes de sincronizar componentes de perfil.')

const db = drizzle(databaseUrl, {
  schema: { products, productionProfileComponents, productionProfiles },
})

await db.transaction(async (tx) => {
  const profileSourceIds = payload.components.map((component) => component.profileSourceId)
  const profiles = await tx
    .select({ id: productionProfiles.id, sourceId: productionProfiles.sourceId, productId: productionProfiles.productId })
    .from(productionProfiles)
    .where(inArray(productionProfiles.sourceId, profileSourceIds))
  if (profiles.length !== profileSourceIds.length) {
    throw new Error('Sincronização interrompida: perfil de produção inicial ausente.')
  }
  const profileBySourceId = new Map(profiles.map((profile) => [profile.sourceId, profile]))

  const skus = [...new Set(payload.components.flatMap((component) => [component.productSku, component.fillingProductSku]))]
  const catalog = await tx
    .select({ id: products.id, sku: products.sku, name: products.name, type: products.type, unit: products.unit })
    .from(products)
    .where(inArray(products.sku, skus))
  if (catalog.length !== skus.length) {
    throw new Error('Sincronização interrompida: produto final ou recheio ausente do catálogo.')
  }
  const productBySku = new Map(catalog.map((product) => [product.sku, product]))
  for (const component of payload.components) {
    const profile = profileBySourceId.get(component.profileSourceId)!
    const finalProduct = productBySku.get(component.productSku)!
    const fillingProduct = productBySku.get(component.fillingProductSku)!
    if (
      profile.productId !== finalProduct.id ||
      finalProduct.name !== component.productName ||
      finalProduct.type !== 'finished_product' ||
      fillingProduct.name !== component.fillingProductName ||
      fillingProduct.type !== 'ingredient' ||
      fillingProduct.unit !== component.unit
    ) {
      throw new Error(`Sincronização interrompida: catálogo ou perfil incompatível para ${component.sourceId}.`)
    }
  }

  const componentColumns = {
    id: productionProfileComponents.id,
    sourceId: productionProfileComponents.sourceId,
    sourceHash: productionProfileComponents.sourceHash,
    productionProfileId: productionProfileComponents.productionProfileId,
    productId: productionProfileComponents.productId,
    role: productionProfileComponents.role,
    quantity: productionProfileComponents.quantity,
    unit: productionProfileComponents.unit,
    quantityBasis: productionProfileComponents.quantityBasis,
  }
  const existingByIdentity = await tx
    .select(componentColumns)
    .from(productionProfileComponents)
    .where(
      or(
        inArray(productionProfileComponents.sourceId, payload.components.map((component) => component.sourceId)),
        inArray(productionProfileComponents.sourceHash, payload.components.map((component) => component.sourceHash)),
      ),
    )
  const existingByComposite = await tx
    .select(componentColumns)
    .from(productionProfileComponents)
    .where(
      and(
        inArray(productionProfileComponents.productionProfileId, profiles.map((profile) => profile.id)),
        inArray(productionProfileComponents.productId, payload.components.map((component) => productBySku.get(component.fillingProductSku)!.id)),
        eq(productionProfileComponents.role, 'filling'),
      ),
    )
  const existing = new Map([...existingByIdentity, ...existingByComposite].map((component) => [component.id, component]))
  const newComponents: Component[] = []
  for (const component of payload.components) {
    const profileId = profileBySourceId.get(component.profileSourceId)!.id
    const productId = productBySku.get(component.fillingProductSku)!.id
    const matches = [...existing.values()].filter(
      (existingComponent) =>
        existingComponent.sourceId === component.sourceId ||
        existingComponent.sourceHash === component.sourceHash ||
        (existingComponent.productionProfileId === profileId &&
          existingComponent.productId === productId),
    )
    if (!matches.length) {
      newComponents.push(component)
      continue
    }
    if (matches.length !== 1 || !sameComponent(matches[0], component, profileId, productId)) {
      throw new Error(`Sincronização interrompida: componente existente diverge de ${component.sourceId}.`)
    }
  }

  if (newComponents.length) {
    await tx.insert(productionProfileComponents).values(newComponents.map((component) => ({
      sourceId: component.sourceId,
      sourceHash: component.sourceHash,
      productionProfileId: profileBySourceId.get(component.profileSourceId)!.id,
      productId: productBySku.get(component.fillingProductSku)!.id,
      role: component.role,
      quantity: component.quantity,
      unit: component.unit,
      quantityBasis: component.quantityBasis,
      sourcePayload: component.source,
    })))
  }

  console.log(
    `Componentes de perfil sincronizados: ${newComponents.length} inseridos, ${payload.components.length - newComponents.length} já idênticos. Nenhum movimento de estoque foi criado.`,
  )
})
