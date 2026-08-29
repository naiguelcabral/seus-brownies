import { createServerFn } from '@tanstack/react-start'
import { asc, count, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  categories,
  expenses,
  products,
  purchaseItems,
  purchases,
  saleItems,
  sales,
  stockMovements,
} from '#/db/schema'

const quantityPattern = /^\d+(?:[,.]\d{1,3})?$/
const moneyPattern = /^\d+(?:[,.]\d{1,2})?$/
const unitCostPattern = /^\d+(?:[,.]\d{1,3})?$/

function decimal(value: string, pattern: RegExp, scale: number) {
  const normalized = value.trim().replace(',', '.')
  if (!pattern.test(value.trim()) || Number(normalized) <= 0) return null
  const [whole, fraction = ''] = normalized.split('.')
  return `${whole}.${fraction.padEnd(scale, '0')}`
}

function cents(value: string) {
  const normalized = decimal(value, moneyPattern, 2)
  if (!normalized) return null
  return BigInt(normalized.replace('.', ''))
}

function unitCostMillis(value: string) {
  const normalized = decimal(value, unitCostPattern, 3)
  if (!normalized) return null
  return BigInt(normalized.replace('.', ''))
}

function thousandths(value: string) {
  const normalized = decimal(value, quantityPattern, 3)
  if (!normalized) return null
  return BigInt(normalized.replace('.', ''))
}

function centsToMoney(value: bigint) {
  const sign = value < 0n ? '-' : ''
  const absolute = value < 0n ? -value : value
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

function millisToUnitCost(value: bigint) {
  return `${value / 1_000n}.${String(value % 1_000n).padStart(3, '0')}`
}

function roundedCents(unitCostInMillis: bigint, quantity: bigint) {
  return (unitCostInMillis * quantity + 5_000n) / 10_000n
}

const purchaseValues = z.object({
  supplierName: z.string().trim().min(2).max(160),
  purchasedAt: z.string().date(),
  invoiceFileReference: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.string().trim(),
        unitCost: z.string().trim(),
      }),
    )
    .min(1, 'Inclua ao menos um item.'),
})

export const listPurchasableProducts = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { getDb } = await import('#/db/index')
  return getDb()
    .select({
      id: products.id,
      name: products.name,
      unit: products.unit,
      type: products.type,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name))
})

export const listPurchases = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getDb } = await import('#/db/index')
    return getDb().select().from(purchases).orderBy(desc(purchases.purchasedAt))
  },
)

export const createPurchase = createServerFn({ method: 'POST' })
  .validator(purchaseValues)
  .handler(async ({ data }) => {
    const normalizedItems = data.items.map((item) => ({
      ...item,
      quantity: decimal(item.quantity, quantityPattern, 3),
      quantityThousandths: thousandths(item.quantity),
      unitCost: unitCostMillis(item.unitCost),
    }))

    if (
      normalizedItems.some(
        (item) =>
          !item.quantity || !item.quantityThousandths || item.unitCost === null,
      )
    ) {
      throw new Error(
        'Informe quantidades e custos válidos para todos os itens.',
      )
    }

    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      const productIds = [...new Set(data.items.map((item) => item.productId))]
      const selectedProducts = await tx
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(inArray(products.id, productIds))
      const productById = new Map(
        selectedProducts.map((product) => [product.id, product]),
      )

      if (productById.size !== productIds.length) {
        throw new Error('Um dos produtos selecionados não está disponível.')
      }

      const totals = normalizedItems.map((item) =>
        roundedCents(item.unitCost!, item.quantityThousandths!),
      )
      const total = totals.reduce((sum, item) => sum + item, 0n)
      const [purchase] = await tx
        .insert(purchases)
        .values({
          supplierName: data.supplierName,
          purchasedAt: data.purchasedAt,
          totalAmount: centsToMoney(total),
          invoiceFileReference: data.invoiceFileReference?.trim() || null,
          notes: data.notes?.trim() || null,
        })
        .returning({ id: purchases.id })

      await tx.insert(purchaseItems).values(
        normalizedItems.map((item, index) => ({
          purchaseId: purchase.id,
          productId: item.productId,
          itemName: productById.get(item.productId)!.name,
          quantity: item.quantity!,
          unitCost: millisToUnitCost(item.unitCost!),
          totalAmount: centsToMoney(totals[index]),
        })),
      )
      await tx.insert(stockMovements).values(
        normalizedItems.map((item) => ({
          productId: item.productId,
          type: 'purchase' as const,
          quantityDelta: item.quantity!,
          unitCost: millisToUnitCost(item.unitCost!),
          referenceType: 'purchase',
          referenceId: purchase.id,
        })),
      )
    })
  })

export const listInventory = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getDb } = await import('#/db/index')
    const database = getDb()
    const [balances, movements] = await Promise.all([
      database
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          type: products.type,
          unit: products.unit,
          categoryName: categories.name,
          isActive: products.isActive,
          balance: sql<string>`coalesce(sum(${stockMovements.quantityDelta}), 0)`,
        })
        .from(products)
        .leftJoin(stockMovements, eq(stockMovements.productId, products.id))
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .groupBy(products.id, categories.name)
        .orderBy(asc(products.name)),
      database
        .select({
          id: stockMovements.id,
          productName: products.name,
          productUnit: products.unit,
          type: stockMovements.type,
          quantityDelta: stockMovements.quantityDelta,
          occurredAt: stockMovements.occurredAt,
          notes: stockMovements.notes,
        })
        .from(stockMovements)
        .innerJoin(products, eq(products.id, stockMovements.productId))
        .orderBy(desc(stockMovements.occurredAt))
        .limit(80),
    ])
    return { balances, movements }
  },
)

const saleValues = z.object({
  customerName: z.string().trim().max(120).optional(),
  customerPhone: z.string().trim().max(32).optional(),
  status: z.enum(['draft', 'confirmed', 'paid', 'cancelled']),
  notes: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.string().trim(),
      }),
    )
    .min(1),
})

export const listSaleProducts = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getDb } = await import('#/db/index')
    return getDb()
      .select({
        id: products.id,
        name: products.name,
        unit: products.unit,
        salePrice: products.salePrice,
      })
      .from(products)
      .where(
        sql`${products.isActive} = true and ${products.type} = 'finished_product'`,
      )
      .orderBy(asc(products.name))
  },
)

export const createSale = createServerFn({ method: 'POST' })
  .validator(saleValues)
  .handler(async ({ data }) => {
    const normalizedItems = data.items.map((item) => ({
      ...item,
      quantity: decimal(item.quantity, quantityPattern, 3),
    }))
    if (normalizedItems.some((item) => !item.quantity))
      throw new Error('Informe quantidades válidas para todos os itens.')
    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      const ids = [...new Set(data.items.map((item) => item.productId))]
      const selected = await tx
        .select({
          id: products.id,
          name: products.name,
          salePrice: products.salePrice,
        })
        .from(products)
        .where(inArray(products.id, ids))
      const byId = new Map(selected.map((product) => [product.id, product]))
      if (
        byId.size !== ids.length ||
        selected.some((product) => !product.salePrice)
      )
        throw new Error('Há produto sem preço de venda disponível.')
      const totals = normalizedItems.map((item) =>
        roundedCents(
          cents(byId.get(item.productId)!.salePrice!)!,
          thousandths(item.quantity!)!,
        ),
      )
      const subtotal = totals.reduce((sum, item) => sum + item, 0n)
      const [sale] = await tx
        .insert(sales)
        .values({
          customerName: data.customerName?.trim() || null,
          customerPhone: data.customerPhone?.trim() || null,
          status: data.status,
          subtotalAmount: centsToMoney(subtotal),
          totalAmount: centsToMoney(subtotal),
          notes: data.notes?.trim() || null,
        })
        .returning({ id: sales.id })
      await tx.insert(saleItems).values(
        normalizedItems.map((item, index) => ({
          saleId: sale.id,
          productId: item.productId,
          productName: byId.get(item.productId)!.name,
          quantity: item.quantity!,
          unitPrice: byId.get(item.productId)!.salePrice!,
          totalAmount: centsToMoney(totals[index]),
        })),
      )
      if (data.status === 'confirmed' || data.status === 'paid')
        await tx.insert(stockMovements).values(
          normalizedItems.map((item) => ({
            productId: item.productId,
            type: 'sale' as const,
            quantityDelta: `-${item.quantity!}`,
            referenceType: 'sale',
            referenceId: sale.id,
          })),
        )
    })
  })

export const listSales = createServerFn({ method: 'GET' }).handler(async () => {
  const { getDb } = await import('#/db/index')
  return getDb().select().from(sales).orderBy(desc(sales.soldAt)).limit(60)
})

const expenseValues = z.object({
  description: z.string().trim().min(2).max(180),
  category: z.string().trim().min(2).max(80),
  amount: z.string().trim(),
  occurredAt: z.string().date(),
  notes: z.string().trim().max(1000).optional(),
})
export const createExpense = createServerFn({ method: 'POST' })
  .validator(expenseValues)
  .handler(async ({ data }) => {
    const amount = cents(data.amount)
    if (amount === null) throw new Error('Informe um valor válido, como 45,90.')
    const { getDb } = await import('#/db/index')
    await getDb()
      .insert(expenses)
      .values({
        description: data.description,
        category: data.category,
        amount: centsToMoney(amount),
        occurredAt: data.occurredAt,
        notes: data.notes?.trim() || null,
      })
  })
export const listExpenses = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getDb } = await import('#/db/index')
    return getDb()
      .select()
      .from(expenses)
      .orderBy(desc(expenses.occurredAt))
      .limit(60)
  },
)

export const getDashboard = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getDb } = await import('#/db/index')
    const database = getDb()
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartValue = monthStart.toISOString().slice(0, 10)
    const [
      activeProducts,
      balances,
      recentPurchases,
      recentSales,
      monthExpenses,
    ] = await Promise.all([
      database
        .select({ total: count() })
        .from(products)
        .where(eq(products.isActive, true)),
      database
        .select({
          id: products.id,
          name: products.name,
          unit: products.unit,
          balance: sql<string>`coalesce(sum(${stockMovements.quantityDelta}), 0)`,
        })
        .from(products)
        .leftJoin(stockMovements, eq(stockMovements.productId, products.id))
        .groupBy(products.id)
        .orderBy(asc(products.name)),
      database
        .select()
        .from(purchases)
        .orderBy(desc(purchases.purchasedAt))
        .limit(5),
      database.select().from(sales).orderBy(desc(sales.soldAt)).limit(5),
      database
        .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
        .from(expenses)
        .where(gte(expenses.occurredAt, monthStartValue)),
    ])

    const lowStock = balances.filter((item) => Number(item.balance) <= 0)
    return {
      activeProducts: activeProducts[0]?.total ?? 0,
      lowStock,
      productsWithStock: balances.filter((item) => Number(item.balance) > 0)
        .length,
      recentPurchases,
      recentSales,
      monthExpenses: monthExpenses[0]?.total ?? '0',
    }
  },
)
