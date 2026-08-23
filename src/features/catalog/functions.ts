import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { categories, products } from '#/db/schema'

const categoryValues = z.object({
  name: z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(80),
  description: z.string().trim().max(500).optional(),
})

const categoryId = z.object({ id: z.number().int().positive() })

const productValueShape = z.object({
  name: z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(120),
  sku: z.string().trim().min(2, 'Informe um SKU.').max(64),
  type: z.enum(['ingredient', 'packaging', 'finished_product']),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'm', 'unit']),
  categoryId: z.number().int().positive().nullable(),
  description: z.string().trim().max(1000).optional(),
  salePrice: z.string().trim().max(32).optional(),
})

function validateProductValues(
  value: z.infer<typeof productValueShape>,
  context: z.RefinementCtx,
) {
  if (value.type === 'finished_product' && !value.salePrice) {
    context.addIssue({
      code: 'custom',
      path: ['salePrice'],
      message: 'Informe o preço de venda do produto final.',
    })
    return
  }

  if (value.salePrice && !toDatabaseMoney(value.salePrice)) {
    context.addIssue({
      code: 'custom',
      path: ['salePrice'],
      message: 'Use um preço válido, como 12,50.',
    })
  }
}

const productValues = productValueShape.superRefine(validateProductValues)
const productValuesWithId = productValueShape
  .extend({ id: z.number().int().positive() })
  .superRefine(validateProductValues)

function toDatabaseMoney(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = trimmed.includes(',')
    ? trimmed.replaceAll('.', '').replace(',', '.')
    : trimmed

  if (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
    return null
  }

  const [whole, decimal = ''] = normalized.split('.')
  return `${whole}.${decimal.padEnd(2, '0')}`
}

function optionalText(value?: string) {
  return value?.trim() || null
}

function readableDatabaseError(error: unknown, entity: string): never {
  if (
    typeof error === 'object' &&
    error &&
    'code' in error &&
    error.code === '23505'
  ) {
    throw new Error(`Já existe ${entity} com esse identificador.`)
  }

  throw error
}

export const listCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getDb } = await import('#/db/index')
    return getDb().select().from(categories).orderBy(asc(categories.name))
  },
)

export const createCategory = createServerFn({ method: 'POST' })
  .validator(categoryValues)
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')

    try {
      await getDb()
        .insert(categories)
        .values({
          name: data.name,
          description: optionalText(data.description),
        })
    } catch (error) {
      readableDatabaseError(error, 'uma categoria')
    }
  })

export const updateCategory = createServerFn({ method: 'POST' })
  .validator(categoryValues.extend({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')

    try {
      await getDb()
        .update(categories)
        .set({
          name: data.name,
          description: optionalText(data.description),
          updatedAt: new Date(),
        })
        .where(eq(categories.id, data.id))
    } catch (error) {
      readableDatabaseError(error, 'uma categoria')
    }
  })

export const setCategoryActive = createServerFn({ method: 'POST' })
  .validator(categoryId.extend({ isActive: z.boolean() }))
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')
    await getDb()
      .update(categories)
      .set({ isActive: data.isActive, updatedAt: new Date() })
      .where(eq(categories.id, data.id))
  })

export const listProducts = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getDb } = await import('#/db/index')
    return getDb()
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        type: products.type,
        unit: products.unit,
        categoryId: products.categoryId,
        categoryName: categories.name,
        description: products.description,
        salePrice: products.salePrice,
        isActive: products.isActive,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(asc(products.name))
  },
)

export const createProduct = createServerFn({ method: 'POST' })
  .validator(productValues)
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')

    try {
      await getDb()
        .insert(products)
        .values({
          name: data.name,
          sku: data.sku.toUpperCase(),
          type: data.type,
          unit: data.unit,
          categoryId: data.categoryId,
          description: optionalText(data.description),
          salePrice: data.salePrice ? toDatabaseMoney(data.salePrice) : null,
        })
    } catch (error) {
      readableDatabaseError(error, 'um produto ou SKU')
    }
  })

export const updateProduct = createServerFn({ method: 'POST' })
  .validator(productValuesWithId)
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')

    try {
      await getDb()
        .update(products)
        .set({
          name: data.name,
          sku: data.sku.toUpperCase(),
          type: data.type,
          unit: data.unit,
          categoryId: data.categoryId,
          description: optionalText(data.description),
          salePrice: data.salePrice ? toDatabaseMoney(data.salePrice) : null,
          updatedAt: new Date(),
        })
        .where(eq(products.id, data.id))
    } catch (error) {
      readableDatabaseError(error, 'um produto ou SKU')
    }
  })

export const setProductActive = createServerFn({ method: 'POST' })
  .validator(categoryId.extend({ isActive: z.boolean() }))
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')
    await getDb()
      .update(products)
      .set({ isActive: data.isActive, updatedAt: new Date() })
      .where(eq(products.id, data.id))
  })
