import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import { z } from 'zod'

import {
  categories,
  expenses,
  inventoryCostAllocations,
  inventoryCostLayers,
  managementSettings,
  products,
  purchaseItems,
  purchases,
  saleItems,
  sales,
  salesLocations,
  stockMovements,
} from '#/db/schema'
import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'
import {
  calculatePriceCentsTotal,
  calculateUnitCostMillisTotal,
} from '#/features/operations/calculations'
import {
  allocateFifoCost,
  assertNoDuplicateLayerAllocations,
  createsSaleCostAllocation,
} from '#/features/inventory/fifo'
import {
  moneyToCents,
  quantityToThousandths,
} from '#/features/production/calculations'
import {
  hashOperationPayload,
  resolveIdempotentReplay,
} from '#/features/operations/idempotency'
import { appendOperationalAudit } from '#/features/operations/audit'
import { calculateReorderStatus } from '#/features/inventory/reorder'
import {
  calculateInventoryPage,
  endOfInventoryDay,
  inventoryBalancePageSize,
  inventoryMovementPageSize,
  inventoryMovementTypes,
  inventoryProductTypes,
  inventoryReorderStatuses,
} from '#/features/inventory/history'
import { rateToTenThousandths } from '#/features/management/settings'
import {
  allocateReportedRevenue,
  classifyRevenueDifference,
} from '#/features/operations/revenue-audit'
import {
  calculateExpenseHistoryPage,
  expenseHistoryPageSize,
} from '#/features/operations/expense-history'
import {
  calculatePurchaseHistoryPage,
  purchaseHistoryPageSize,
} from '#/features/operations/purchase-history'
import {
  calculateSaleHistoryPage,
  endOfSaleHistoryDay,
  saleHistoryPageSize,
  saleStatuses,
} from '#/features/operations/sale-history'

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

function nonnegativeCents(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const [whole, fraction = ''] = normalized.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
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

const purchaseValues = z
  .object({
    idempotencyKey: z.string().uuid(),
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
          supplierLot: z.string().trim().max(80).optional(),
          expiresOn: z.string().date().optional(),
        }),
      )
      .min(1, 'Inclua ao menos um item.'),
  })
  .superRefine((value, context) => {
    value.items.forEach((item, index) => {
      if (item.expiresOn && item.expiresOn < value.purchasedAt) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'expiresOn'],
          message: 'A validade não pode ser anterior à data da compra.',
        })
      }
    })
  })

export const listPurchasableProducts = createServerFn({
  method: 'GET',
})
  .middleware([requireServerFunctionPermission('listPurchasableProducts')])
  .handler(async () => {
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

const purchaseHistoryValues = z.object({
  query: z.string().trim().max(100).optional(),
  start: z.string().date().optional(),
  end: z.string().date().optional(),
  page: z.number().int().min(1).max(10_000).default(1),
})

export const listPurchases = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('listPurchases')])
  .validator(purchaseHistoryValues)
  .handler(async ({ data }) => {
    if (data.start && data.end && data.start > data.end) {
      throw new Error('A data inicial deve ser anterior à data final.')
    }
    const { getDb } = await import('#/db/index')
    const database = getDb()
    const filters = and(
      data.query ? ilike(purchases.supplierName, `%${data.query}%`) : undefined,
      data.start ? gte(purchases.purchasedAt, data.start) : undefined,
      data.end ? lte(purchases.purchasedAt, data.end) : undefined,
    )
    const [{ total }] = await database
      .select({ total: count() })
      .from(purchases)
      .where(filters)
    const pagination = calculatePurchaseHistoryPage(data.page, Number(total))
    const rows = await database
      .select()
      .from(purchases)
      .where(filters)
      .orderBy(desc(purchases.purchasedAt), desc(purchases.id))
      .limit(purchaseHistoryPageSize)
      .offset(pagination.offset)
    return { purchases: rows, total: Number(total), ...pagination }
  })

export const createPurchase = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('createPurchase')])
  .validator(purchaseValues)
  .handler(async ({ data, context }) => {
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

    const totals = normalizedItems.map((item) =>
      calculateUnitCostMillisTotal(item.unitCost!, item.quantityThousandths!),
    )
    const total = totals.reduce((sum, item) => sum + item, 0n)
    const idempotencyHash = await hashOperationPayload({
      supplierName: data.supplierName,
      purchasedAt: data.purchasedAt,
      invoiceFileReference: data.invoiceFileReference?.trim() || null,
      notes: data.notes?.trim() || null,
      items: normalizedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: millisToUnitCost(item.unitCost!),
        supplierLot: item.supplierLot?.trim() || null,
        expiresOn: item.expiresOn || null,
      })),
    })

    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      const [existingPurchase] = await tx
        .select({
          id: purchases.id,
          idempotencyHash: purchases.idempotencyHash,
        })
        .from(purchases)
        .where(eq(purchases.idempotencyKey, data.idempotencyKey))
        .limit(1)
      const replay = resolveIdempotentReplay(existingPurchase, idempotencyHash)
      if (replay) return replay

      const productIds = [...new Set(data.items.map((item) => item.productId))]
      const selectedProducts = await tx
        .select({
          id: products.id,
          name: products.name,
          type: products.type,
          isActive: products.isActive,
        })
        .from(products)
        .where(inArray(products.id, productIds))
      const productById = new Map(
        selectedProducts.map((product) => [product.id, product]),
      )

      if (
        productById.size !== productIds.length ||
        selectedProducts.some((product) => !product.isActive)
      ) {
        throw new Error('Um dos produtos selecionados não está disponível.')
      }

      const purchase = (
        await tx
          .insert(purchases)
          .values({
            idempotencyKey: data.idempotencyKey,
            idempotencyHash,
            createdByAuthUserId: context.principal!.id,
            supplierName: data.supplierName,
            purchasedAt: data.purchasedAt,
            totalAmount: centsToMoney(total),
            invoiceFileReference: data.invoiceFileReference?.trim() || null,
            notes: data.notes?.trim() || null,
          })
          .onConflictDoNothing({ target: purchases.idempotencyKey })
          .returning({ id: purchases.id })
      ).at(0)

      if (!purchase) {
        const [concurrentPurchase] = await tx
          .select({
            id: purchases.id,
            idempotencyHash: purchases.idempotencyHash,
          })
          .from(purchases)
          .where(eq(purchases.idempotencyKey, data.idempotencyKey))
          .limit(1)
        const concurrentReplay = resolveIdempotentReplay(
          concurrentPurchase,
          idempotencyHash,
        )
        if (concurrentReplay) return concurrentReplay
        throw new Error('Não foi possível reconciliar a operação repetida.')
      }

      const availableAt = new Date(`${data.purchasedAt}T12:00:00.000Z`)
      for (const [index, item] of normalizedItems.entries()) {
        const purchaseItem = (
          await tx
            .insert(purchaseItems)
            .values({
              purchaseId: purchase.id,
              productId: item.productId,
              itemName: productById.get(item.productId)!.name,
              quantity: item.quantity!,
              unitCost: millisToUnitCost(item.unitCost!),
              totalAmount: centsToMoney(totals[index]),
              supplierLot: item.supplierLot?.trim() || null,
              expiresOn: item.expiresOn || null,
            })
            .returning({ id: purchaseItems.id })
        ).at(0)
        if (!purchaseItem) {
          throw new Error('Não foi possível registrar um item da compra.')
        }
        const movement = (
          await tx
            .insert(stockMovements)
            .values({
              productId: item.productId,
              type: 'purchase' as const,
              quantityDelta: item.quantity!,
              unitCost: millisToUnitCost(item.unitCost!),
              referenceType: 'purchase_item',
              referenceId: purchaseItem.id,
            })
            .returning({ id: stockMovements.id })
        ).at(0)
        if (!movement) {
          throw new Error('Não foi possível criar camada FIFO da compra.')
        }
        if (productById.get(item.productId)?.type === 'finished_product') {
          await tx.insert(inventoryCostLayers).values({
            productId: item.productId,
            productionBatchOutputId: null,
            sourceStockMovementId: movement.id,
            origin: 'purchase' as const,
            availableAt,
            originalQuantity: item.quantity!,
            originalCost: centsToMoney(totals[index]),
            remainingQuantity: item.quantity!,
            remainingCost: centsToMoney(totals[index]),
          })
        }
      }
      await appendOperationalAudit(tx, {
        actorAuthUserId: context.principal!.id,
        action: 'purchase.create',
        entityType: 'purchase',
        entityId: purchase.id,
        operationReference: data.idempotencyKey,
        reason: data.notes,
      })
      return { id: purchase.id, replayed: false as const }
    })
  })

const inventorySearchValues = z.object({
  query: z.string().trim().max(100).optional(),
  type: z.enum(inventoryProductTypes).optional(),
  reorderStatus: z.enum(inventoryReorderStatuses).optional(),
  page: z.number().int().min(1).max(10_000).default(1),
  movementQuery: z.string().trim().max(100).optional(),
  movementType: z.enum(inventoryMovementTypes).optional(),
  start: z.string().date().optional(),
  end: z.string().date().optional(),
  movementPage: z.number().int().min(1).max(10_000).default(1),
})

export const listInventory = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('listInventory')])
  .validator(inventorySearchValues)
  .handler(async ({ data }) => {
    if (data.start && data.end && data.start > data.end) {
      throw new Error('A data inicial deve ser anterior à data final.')
    }
    const { getDb } = await import('#/db/index')
    const database = getDb()
    const balanceFilters = and(
      data.query
        ? or(
            ilike(products.name, `%${data.query}%`),
            ilike(products.sku, `%${data.query}%`),
          )
        : undefined,
      data.type ? eq(products.type, data.type) : undefined,
    )
    const startAt = data.start
      ? new Date(`${data.start}T00:00:00.000Z`)
      : undefined
    const endAt = data.end ? endOfInventoryDay(data.end) : undefined
    const movementFilters = and(
      data.movementQuery
        ? or(
            ilike(products.name, `%${data.movementQuery}%`),
            ilike(products.sku, `%${data.movementQuery}%`),
            ilike(purchases.supplierName, `%${data.movementQuery}%`),
          )
        : undefined,
      data.movementType
        ? eq(stockMovements.type, data.movementType)
        : undefined,
      startAt ? gte(stockMovements.occurredAt, startAt) : undefined,
      endAt ? lt(stockMovements.occurredAt, endAt) : undefined,
    )
    const [balanceRows, actionProducts, [{ total: movementTotal }]] =
      await Promise.all([
        database
          .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            type: products.type,
            unit: products.unit,
            categoryName: categories.name,
            isActive: products.isActive,
            reorderPoint: products.reorderPoint,
            balance: sql<string>`coalesce(sum(${stockMovements.quantityDelta}), 0)`,
          })
          .from(products)
          .leftJoin(stockMovements, eq(stockMovements.productId, products.id))
          .leftJoin(categories, eq(categories.id, products.categoryId))
          .where(balanceFilters)
          .groupBy(products.id, categories.name)
          .orderBy(asc(products.name)),
        database
          .select({ id: products.id, name: products.name, sku: products.sku })
          .from(products)
          .where(eq(products.isActive, true))
          .orderBy(asc(products.name)),
        database
          .select({ total: count() })
          .from(stockMovements)
          .innerJoin(products, eq(products.id, stockMovements.productId))
          .leftJoin(
            purchaseItems,
            and(
              eq(stockMovements.referenceType, 'purchase_item'),
              eq(stockMovements.referenceId, purchaseItems.id),
            ),
          )
          .leftJoin(purchases, eq(purchaseItems.purchaseId, purchases.id))
          .where(movementFilters),
      ])
    const filteredBalances = balanceRows
      .map((item) => ({
        ...item,
        reorderStatus: calculateReorderStatus(item.balance, item.reorderPoint),
      }))
      .filter(
        (item) =>
          !data.reorderStatus || item.reorderStatus === data.reorderStatus,
      )
    const balancePagination = calculateInventoryPage(
      data.page,
      filteredBalances.length,
      inventoryBalancePageSize,
    )
    const movementPagination = calculateInventoryPage(
      data.movementPage,
      Number(movementTotal),
      inventoryMovementPageSize,
    )
    const movements = await database
      .select({
        id: stockMovements.id,
        productName: products.name,
        productUnit: products.unit,
        type: stockMovements.type,
        quantityDelta: stockMovements.quantityDelta,
        occurredAt: stockMovements.occurredAt,
        notes: stockMovements.notes,
        supplierName: purchases.supplierName,
        supplierLot: purchaseItems.supplierLot,
        expiresOn: purchaseItems.expiresOn,
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .leftJoin(
        purchaseItems,
        and(
          eq(stockMovements.referenceType, 'purchase_item'),
          eq(stockMovements.referenceId, purchaseItems.id),
        ),
      )
      .leftJoin(purchases, eq(purchaseItems.purchaseId, purchases.id))
      .where(movementFilters)
      .orderBy(desc(stockMovements.occurredAt), desc(stockMovements.id))
      .limit(inventoryMovementPageSize)
      .offset(movementPagination.offset)
    return {
      balances: {
        items: filteredBalances.slice(
          balancePagination.offset,
          balancePagination.offset + inventoryBalancePageSize,
        ),
        total: filteredBalances.length,
        ...balancePagination,
      },
      movements: {
        items: movements,
        total: Number(movementTotal),
        ...movementPagination,
      },
      actionProducts,
    }
  })

const saleValues = z
  .object({
    idempotencyKey: z.string().uuid(),
    locationId: z.number().int().positive(),
    customerName: z.string().trim().max(120).optional(),
    customerPhone: z.string().trim().max(32).optional(),
    status: z.enum(saleStatuses),
    reportedAmount: z.string().trim().max(32),
    adjustmentKind: z.enum([
      'none',
      'discount',
      'combo',
      'gift',
      'manual_adjustment',
    ]),
    adjustmentReason: z.string().trim().max(500).optional(),
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
  .superRefine((value, context) => {
    if (value.adjustmentKind !== 'none' && !value.adjustmentReason?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['adjustmentReason'],
        message: 'Informe o motivo do desconto, combo, brinde ou ajuste.',
      })
    }
  })

export const listSaleProducts = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('listSaleProducts')])
  .handler(async () => {
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
  })

export const createSale = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('createSale')])
  .validator(saleValues)
  .handler(async ({ data, context }) => {
    const reportedCents = nonnegativeCents(data.reportedAmount)
    if (reportedCents === null)
      throw new Error('Informe um faturamento recebido válido.')
    const normalizedItems = data.items.map((item) => ({
      ...item,
      quantity: decimal(item.quantity, quantityPattern, 3),
    }))
    if (normalizedItems.some((item) => !item.quantity))
      throw new Error('Informe quantidades válidas para todos os itens.')
    const idempotencyHash = await hashOperationPayload({
      customerName: data.customerName?.trim() || null,
      customerPhone: data.customerPhone?.trim() || null,
      locationId: data.locationId,
      status: data.status,
      reportedAmount: centsToMoney(reportedCents),
      adjustmentKind: data.adjustmentKind,
      adjustmentReason: data.adjustmentReason?.trim() || null,
      notes: data.notes?.trim() || null,
      items: normalizedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    })
    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      const [existingSale] = await tx
        .select({
          id: sales.id,
          idempotencyHash: sales.idempotencyHash,
        })
        .from(sales)
        .where(eq(sales.idempotencyKey, data.idempotencyKey))
        .limit(1)
      const replay = resolveIdempotentReplay(existingSale, idempotencyHash)
      if (replay) return replay

      const ids = [...new Set(data.items.map((item) => item.productId))]
      const [selected, location, settings] = await Promise.all([
        tx
          .select({
            id: products.id,
            name: products.name,
            salePrice: products.salePrice,
            type: products.type,
            isActive: products.isActive,
          })
          .from(products)
          .where(inArray(products.id, ids)),
        tx
          .select({ id: salesLocations.id })
          .from(salesLocations)
          .where(
            and(
              eq(salesLocations.id, data.locationId),
              eq(salesLocations.isActive, true),
            ),
          )
          .limit(1),
        tx
          .select({
            normalRevenueTolerance: managementSettings.normalRevenueTolerance,
            criticalRevenueTolerance:
              managementSettings.criticalRevenueTolerance,
          })
          .from(managementSettings)
          .where(eq(managementSettings.id, 1))
          .limit(1),
      ])
      const byId = new Map(selected.map((product) => [product.id, product]))
      if (
        byId.size !== ids.length ||
        selected.some(
          (product) =>
            !product.isActive ||
            product.type !== 'finished_product' ||
            !product.salePrice,
        )
      )
        throw new Error('Há produto sem preço de venda disponível.')
      if (!location.length)
        throw new Error('Selecione um local ou canal ativo.')
      const auditSettings = settings.at(0)
      const normalTolerance = auditSettings
        ? rateToTenThousandths(auditSettings.normalRevenueTolerance)
        : null
      const criticalTolerance = auditSettings
        ? rateToTenThousandths(auditSettings.criticalRevenueTolerance)
        : null
      if (normalTolerance === null || criticalTolerance === null)
        throw new Error('Parâmetros de auditoria de receita indisponíveis.')
      const totals = normalizedItems.map((item) =>
        calculatePriceCentsTotal(
          cents(byId.get(item.productId)!.salePrice!)!,
          thousandths(item.quantity!)!,
        ),
      )
      const subtotal = totals.reduce((sum, item) => sum + item, 0n)
      if (reportedCents !== subtotal && data.adjustmentKind === 'none') {
        throw new Error(
          'Classifique e justifique a diferença entre o faturamento recebido e o calculado.',
        )
      }
      const revenueAudit = classifyRevenueDifference({
        reportedCents,
        calculatedCents: subtotal,
        normalTolerance,
        criticalTolerance,
      })
      const reportedByItem = allocateReportedRevenue(totals, reportedCents)
      const allocatesCost = createsSaleCostAllocation(data.status)
      const sale = (
        await tx
          .insert(sales)
          .values({
            idempotencyKey: data.idempotencyKey,
            idempotencyHash,
            createdByAuthUserId: context.principal!.id,
            locationId: data.locationId,
            customerName: data.customerName?.trim() || null,
            customerPhone: data.customerPhone?.trim() || null,
            status: data.status,
            subtotalAmount: centsToMoney(subtotal),
            discountAmount: centsToMoney(
              subtotal > reportedCents ? subtotal - reportedCents : 0n,
            ),
            totalAmount: centsToMoney(reportedCents),
            reportedAmount: centsToMoney(reportedCents),
            calculatedAmount: centsToMoney(subtotal),
            auditStatus: revenueAudit.status,
            auditNotes: data.adjustmentReason?.trim() || null,
            adjustmentKind: data.adjustmentKind,
            adjustmentReason: data.adjustmentReason?.trim() || null,
            notes: data.notes?.trim() || null,
          })
          .onConflictDoNothing({ target: sales.idempotencyKey })
          .returning({ id: sales.id })
      ).at(0)

      if (!sale) {
        const [concurrentSale] = await tx
          .select({ id: sales.id, idempotencyHash: sales.idempotencyHash })
          .from(sales)
          .where(eq(sales.idempotencyKey, data.idempotencyKey))
          .limit(1)
        const concurrentReplay = resolveIdempotentReplay(
          concurrentSale,
          idempotencyHash,
        )
        if (concurrentReplay) return concurrentReplay
        throw new Error('Não foi possível reconciliar a operação repetida.')
      }

      let fifoPlans: ReturnType<typeof allocateFifoCost>[] = []
      if (allocatesCost) {
        // Product and layer locks serialize concurrent confirmed/paid sales.
        await tx.execute(
          sql`select id from ${products} where ${products.id} in ${ids} order by ${products.id} for update`,
        )
        await tx.execute(
          sql`select id from ${inventoryCostLayers} where ${inventoryCostLayers.productId} in ${ids} order by ${inventoryCostLayers.productId}, ${inventoryCostLayers.availableAt}, ${inventoryCostLayers.id} for update`,
        )
        const rows = await tx
          .select()
          .from(inventoryCostLayers)
          .where(inArray(inventoryCostLayers.productId, ids))
          .orderBy(
            asc(inventoryCostLayers.productId),
            asc(inventoryCostLayers.availableAt),
            asc(inventoryCostLayers.id),
          )
        let layers = rows.map((layer) => ({
          id: layer.id,
          productId: layer.productId,
          productionBatchOutputId: layer.productionBatchOutputId,
          sourceStockMovementId: layer.sourceStockMovementId,
          origin: layer.origin,
          availableAt: layer.availableAt.toISOString(),
          originalQuantity: quantityToThousandths(layer.originalQuantity)!,
          originalCost: moneyToCents(layer.originalCost)!,
          remainingQuantity: quantityToThousandths(layer.remainingQuantity)!,
          remainingCost: moneyToCents(layer.remainingCost)!,
        }))
        fifoPlans = normalizedItems.map((item) => {
          const plan = allocateFifoCost(
            layers,
            item.productId,
            thousandths(item.quantity!)!,
          )
          layers = plan.layers
          return plan
        })
      }
      const insertedItems: Array<{ id: number }> = []
      for (const [index, item] of normalizedItems.entries()) {
        const insertedItem = (
          await tx
            .insert(saleItems)
            .values({
              saleId: sale.id,
              productId: item.productId,
              productName: byId.get(item.productId)!.name,
              quantity: item.quantity!,
              unitPrice: byId.get(item.productId)!.salePrice!,
              totalAmount: centsToMoney(totals[index]),
              reportedAmount: centsToMoney(reportedByItem[index]),
            })
            .returning({ id: saleItems.id })
        ).at(0)
        if (!insertedItem)
          throw new Error('Não foi possível registrar um item da venda.')
        insertedItems.push(insertedItem)
      }
      if (allocatesCost) {
        const saleMovements: Array<{ id: number }> = []
        for (const item of normalizedItems) {
          const movement = (
            await tx
              .insert(stockMovements)
              .values({
                productId: item.productId,
                type: 'sale' as const,
                quantityDelta: `-${item.quantity!}`,
                referenceType: 'sale',
                referenceId: sale.id,
              })
              .returning({ id: stockMovements.id })
          ).at(0)
          if (!movement)
            throw new Error('Não foi possível registrar a baixa da venda.')
          saleMovements.push(movement)
        }
        const allocationRows = fifoPlans.flatMap((plan, itemIndex) =>
          plan.allocations.map((allocation) => ({
            inventoryCostLayerId: allocation.layerId,
            outgoingStockMovementId: saleMovements[itemIndex].id,
            saleItemId: insertedItems[itemIndex].id,
            productId: allocation.productId,
            quantity: String(allocation.quantity / 1_000n).concat(
              '.',
              String(allocation.quantity % 1_000n).padStart(3, '0'),
            ),
            allocatedCost: centsToMoney(allocation.allocatedCost),
            unitCost: millisToUnitCost(
              (allocation.allocatedCost * 10_000n + allocation.quantity / 2n) /
                allocation.quantity,
            ),
          })),
        )
        assertNoDuplicateLayerAllocations(
          allocationRows.map((allocation) => ({
            layerId: allocation.inventoryCostLayerId,
            outgoingStockMovementId: allocation.outgoingStockMovementId,
          })),
        )
        await tx.insert(inventoryCostAllocations).values(allocationRows)
        for (const [index, plan] of fifoPlans.entries()) {
          await tx
            .update(stockMovements)
            .set({ allocatedCost: centsToMoney(plan.allocatedCost) })
            .where(eq(stockMovements.id, saleMovements[index].id))
        }
        const updatedLayers =
          fifoPlans.length > 0 ? fifoPlans[fifoPlans.length - 1].layers : []
        await Promise.all(
          updatedLayers.map((layer) =>
            tx
              .update(inventoryCostLayers)
              .set({
                remainingQuantity: String(
                  layer.remainingQuantity / 1_000n,
                ).concat(
                  '.',
                  String(layer.remainingQuantity % 1_000n).padStart(3, '0'),
                ),
                remainingCost: centsToMoney(layer.remainingCost),
                updatedAt: new Date(),
              })
              .where(eq(inventoryCostLayers.id, layer.id)),
          ),
        )
      }
      await appendOperationalAudit(tx, {
        actorAuthUserId: context.principal!.id,
        action: 'sale.create',
        entityType: 'sale',
        entityId: sale.id,
        operationReference: data.idempotencyKey,
        reason: data.adjustmentReason || data.notes,
      })
      return { id: sale.id, replayed: false as const }
    })
  })

const saleHistoryValues = z.object({
  query: z.string().trim().max(100).optional(),
  status: z.enum(saleStatuses).optional(),
  locationId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
  start: z.string().date().optional(),
  end: z.string().date().optional(),
  page: z.number().int().min(1).max(10_000).default(1),
})

export const listSales = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('listSales')])
  .validator(saleHistoryValues)
  .handler(async ({ data }) => {
    if (data.start && data.end && data.start > data.end) {
      throw new Error('A data inicial deve ser anterior à data final.')
    }
    const { getDb } = await import('#/db/index')
    const database = getDb()
    const startAt = data.start
      ? new Date(`${data.start}T00:00:00.000Z`)
      : undefined
    const endAt = data.end ? endOfSaleHistoryDay(data.end) : undefined
    const filters = and(
      data.query ? ilike(sales.customerName, `%${data.query}%`) : undefined,
      data.status ? eq(sales.status, data.status) : undefined,
      data.locationId ? eq(sales.locationId, data.locationId) : undefined,
      data.productId
        ? inArray(
            sales.id,
            database
              .select({ saleId: saleItems.saleId })
              .from(saleItems)
              .where(eq(saleItems.productId, data.productId)),
          )
        : undefined,
      startAt ? gte(sales.soldAt, startAt) : undefined,
      endAt ? lt(sales.soldAt, endAt) : undefined,
    )
    const [{ total }] = await database
      .select({ total: count() })
      .from(sales)
      .where(filters)
    const pagination = calculateSaleHistoryPage(data.page, Number(total))
    const rows = await database
      .select({
        id: sales.id,
        customerName: sales.customerName,
        status: sales.status,
        totalAmount: sales.totalAmount,
        reportedAmount: sales.reportedAmount,
        calculatedAmount: sales.calculatedAmount,
        auditStatus: sales.auditStatus,
        adjustmentKind: sales.adjustmentKind,
        adjustmentReason: sales.adjustmentReason,
        locationId: sales.locationId,
        locationName: salesLocations.name,
        soldAt: sales.soldAt,
      })
      .from(sales)
      .leftJoin(salesLocations, eq(sales.locationId, salesLocations.id))
      .where(filters)
      .orderBy(desc(sales.soldAt), desc(sales.id))
      .limit(saleHistoryPageSize)
      .offset(pagination.offset)
    return { sales: rows, total: Number(total), ...pagination }
  })

const expenseValues = z.object({
  idempotencyKey: z.string().uuid(),
  description: z.string().trim().min(2).max(180),
  category: z.string().trim().min(2).max(80),
  amount: z.string().trim(),
  occurredAt: z.string().date(),
  notes: z.string().trim().max(1000).optional(),
})
export const createExpense = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('createExpense')])
  .validator(expenseValues)
  .handler(async ({ data, context }) => {
    const amount = cents(data.amount)
    if (amount === null) throw new Error('Informe um valor válido, como 45,90.')
    const normalizedAmount = centsToMoney(amount)
    const idempotencyHash = await hashOperationPayload({
      description: data.description,
      category: data.category,
      amount: normalizedAmount,
      occurredAt: data.occurredAt,
      notes: data.notes?.trim() || null,
    })
    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      const [existingExpense] = await tx
        .select({
          id: expenses.id,
          idempotencyHash: expenses.idempotencyHash,
        })
        .from(expenses)
        .where(eq(expenses.idempotencyKey, data.idempotencyKey))
        .limit(1)
      const replay = resolveIdempotentReplay(existingExpense, idempotencyHash)
      if (replay) return replay

      const expense = (
        await tx
          .insert(expenses)
          .values({
            idempotencyKey: data.idempotencyKey,
            idempotencyHash,
            createdByAuthUserId: context.principal!.id,
            description: data.description,
            category: data.category,
            amount: normalizedAmount,
            occurredAt: data.occurredAt,
            notes: data.notes?.trim() || null,
          })
          .onConflictDoNothing({ target: expenses.idempotencyKey })
          .returning({ id: expenses.id })
      ).at(0)
      if (expense) {
        await appendOperationalAudit(tx, {
          actorAuthUserId: context.principal!.id,
          action: 'expense.create',
          entityType: 'expense',
          entityId: expense.id,
          operationReference: data.idempotencyKey,
          reason: data.notes,
        })
        return { id: expense.id, replayed: false as const }
      }

      const [concurrentExpense] = await tx
        .select({
          id: expenses.id,
          idempotencyHash: expenses.idempotencyHash,
        })
        .from(expenses)
        .where(eq(expenses.idempotencyKey, data.idempotencyKey))
        .limit(1)
      const concurrentReplay = resolveIdempotentReplay(
        concurrentExpense,
        idempotencyHash,
      )
      if (concurrentReplay) return concurrentReplay
      throw new Error('Não foi possível reconciliar a operação repetida.')
    })
  })
const expenseHistoryValues = z.object({
  query: z.string().trim().max(100).optional(),
  start: z.string().date().optional(),
  end: z.string().date().optional(),
  page: z.number().int().min(1).max(10_000).default(1),
})

export const listExpenses = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('listExpenses')])
  .validator(expenseHistoryValues)
  .handler(async ({ data }) => {
    if (data.start && data.end && data.start > data.end) {
      throw new Error('A data inicial deve ser anterior à data final.')
    }
    const { getDb } = await import('#/db/index')
    const database = getDb()
    const filters = and(
      data.query
        ? or(
            ilike(expenses.description, `%${data.query}%`),
            ilike(expenses.category, `%${data.query}%`),
          )
        : undefined,
      data.start ? gte(expenses.occurredAt, data.start) : undefined,
      data.end ? lte(expenses.occurredAt, data.end) : undefined,
    )
    const [{ total }] = await database
      .select({ total: count() })
      .from(expenses)
      .where(filters)
    const pagination = calculateExpenseHistoryPage(data.page, Number(total))
    const rows = await database
      .select()
      .from(expenses)
      .where(filters)
      .orderBy(desc(expenses.occurredAt), desc(expenses.id))
      .limit(expenseHistoryPageSize)
      .offset(pagination.offset)
    return { expenses: rows, total: Number(total), ...pagination }
  })

export const getDashboard = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('getDashboard')])
  .handler(async () => {
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
          reorderPoint: products.reorderPoint,
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

    const balancesWithStatus = balances.map((item) => ({
      ...item,
      reorderStatus: calculateReorderStatus(
        item.balance,
        item.reorderPoint ?? '0.000',
      ),
    }))
    const lowStock = balancesWithStatus.filter(
      (item) => item.reorderStatus === 'reorder',
    )
    return {
      activeProducts: activeProducts[0]?.total ?? 0,
      lowStock,
      productsWithStock: balancesWithStatus.filter(
        (item) => calculateReorderStatus(item.balance, '0.000') === 'ok',
      ).length,
      recentPurchases,
      recentSales,
      monthExpenses: monthExpenses[0]?.total ?? '0',
    }
  })
