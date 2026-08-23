import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

import { config } from 'dotenv'
import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'

import { categories, products } from '../src/db/schema.ts'

type WorkbookProduct = {
  sku: string
  name: string
  category: string | null
  type: 'ingredient' | 'packaging' | 'finished_product'
  unit: 'g' | 'kg' | 'ml' | 'l' | 'm' | 'unit' | null
  isActive: boolean | null
  salePrice: string | null
}

type WorkbookCatalog = {
  categories: string[]
  products: WorkbookProduct[]
  issues: string[]
  pending: { sku: string; reason: string }[]
  ignored: string[]
  duplicateSkus: string[]
  duplicateNames: string[]
}

function usage(): never {
  throw new Error(
    'Uso: npm run import:catalog -- <caminho-do-workbook> --confirm',
  )
}

const args = process.argv.slice(2)
const confirm = args.includes('--confirm')
const workbook = args.find((argument) => argument !== '--confirm')
if (!workbook) usage()

const workbookPath = resolve(workbook)
const raw = execFileSync(
  'python3',
  ['scripts/preview_workbook.py', workbookPath, '--format', 'json'],
  { cwd: process.cwd(), encoding: 'utf8' },
)
const catalog = JSON.parse(raw) as WorkbookCatalog
const blockers = [
  ...catalog.issues,
  ...catalog.pending.map((item) => `${item.sku}: ${item.reason}`),
  ...catalog.duplicateSkus.map((sku) => `SKU duplicado: ${sku}`),
  ...catalog.duplicateNames.map((name) => `Nome duplicado: ${name}`),
]
if (blockers.length) {
  throw new Error(
    `Importação bloqueada pela prévia:\n- ${blockers.join('\n- ')}`,
  )
}

if (!confirm) {
  console.log(
    `Prévia aprovada: ${catalog.categories.length} categorias e ${catalog.products.length} produtos.\nNenhum dado foi gravado. Para importar, execute novamente com --confirm.`,
  )
  process.exit(0)
}

config({ path: ['.env.local', '.env'], quiet: true })
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error(
    'Defina DATABASE_URL em .env.local antes de importar o catálogo.',
  )
}

const invalidProducts = catalog.products.filter(
  (product) => !product.unit || product.isActive === null,
)
if (invalidProducts.length) {
  throw new Error(
    'Importação bloqueada: há produtos sem unidade ou status válido.',
  )
}

const db = drizzle(databaseUrl, { schema: { categories, products } })
const skus = catalog.products.map((product) => product.sku)

await db.transaction(async (transaction) => {
  const existingProducts = await transaction
    .select({ sku: products.sku })
    .from(products)
    .where(inArray(products.sku, skus))
  if (existingProducts.length) {
    throw new Error(
      `Importação interrompida: estes SKUs já existem: ${existingProducts.map((product) => product.sku).join(', ')}.`,
    )
  }

  await transaction
    .insert(categories)
    .values(catalog.categories.map((name) => ({ name })))
    .onConflictDoNothing({ target: categories.name })

  const categoryRows = await transaction
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(inArray(categories.name, catalog.categories))
  const categoryIdByName = new Map(
    categoryRows.map((category) => [category.name, category.id]),
  )

  await transaction.insert(products).values(
    catalog.products.map((product) => ({
      sku: product.sku,
      name: product.name,
      type: product.type,
      unit: product.unit!,
      isActive: product.isActive!,
      salePrice: product.salePrice,
      categoryId: product.category
        ? (categoryIdByName.get(product.category) ?? null)
        : null,
    })),
  )
})

console.log(
  `Catálogo importado: ${catalog.categories.length} categorias e ${catalog.products.length} produtos. Itens excluídos: ${catalog.ignored.join(', ')}.`,
)
