import { createServerFn } from '@tanstack/react-start'
import { and, eq, gte, inArray, lt, lte } from 'drizzle-orm'
import { z } from 'zod'

import {
  expenses,
  inventoryCostAllocations,
  inventoryCostLayers,
  inventoryCostReversals,
  operationalCosts,
  products,
  productionBatchConsumptions,
  productionBatchLosses,
  productionBatchOutputs,
  productionBatches,
  saleItems,
  sales,
  salesLocations,
  stockMovements,
} from '#/db/schema'
import { requireServerFunctionPermission } from '#/features/auth/server-function-middleware'
import {
  groupExpensesByCategory,
  groupRevenueByChannel,
  groupSalesByProduct,
  sumReportMoney,
  summarizeFifoMargins,
  valueFifoLayers,
  valueInventory,
} from '#/features/reports/calculations'
import { centsToMoney, moneyToCents } from '#/features/production/calculations'
import { isMissingOptionalSchemaError } from '#/features/reports/optional-schema'
import { reconcileInventoryLedger } from '#/features/reports/inventory-reconciliation'
import type { ReconciliationDivergence } from '#/features/reports/inventory-reconciliation'

const periodValues = z.object({
  start: z.string().date().optional(),
  end: z.string().date().optional(),
})

function defaultPeriod() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function endExclusive(end: string) {
  const date = new Date(`${end}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date
}

/** All report calculations run on the server; the browser receives aggregates only. */
export const getOperationalReports = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('getOperationalReports')])
  .validator(periodValues)
  .handler(async ({ data }) => {
    const fallback = defaultPeriod()
    const period = {
      start: data.start ?? fallback.start,
      end: data.end ?? fallback.end,
    }
    if (period.start > period.end)
      throw new Error('A data inicial deve ser anterior à data final.')

    const { getDb } = await import('#/db/index')
    const database = getDb()
    const startAt = new Date(`${period.start}T00:00:00.000Z`)
    const until = endExclusive(period.end)
    const completedSale = inArray(sales.status, ['confirmed', 'paid'])

    const [revenueRows, expenseRows, movementRows, salesByProduct] =
      await Promise.all([
        database
          .select({ channel: salesLocations.name, amount: sales.totalAmount })
          .from(sales)
          .leftJoin(salesLocations, eq(sales.locationId, salesLocations.id))
          .where(
            and(
              completedSale,
              gte(sales.soldAt, startAt),
              lt(sales.soldAt, until),
            ),
          ),
        database
          .select({ category: expenses.category, amount: expenses.amount })
          .from(expenses)
          .where(
            and(
              gte(expenses.occurredAt, period.start),
              lte(expenses.occurredAt, period.end),
            ),
          ),
        database
          .select({
            productId: products.id,
            productName: products.name,
            unit: products.unit,
            quantityDelta: stockMovements.quantityDelta,
            unitCost: stockMovements.unitCost,
            allocatedCost: stockMovements.allocatedCost,
          })
          .from(stockMovements)
          .innerJoin(products, eq(stockMovements.productId, products.id))
          .where(lt(stockMovements.occurredAt, until)),
        database
          .select({
            productName: saleItems.productName,
            quantity: saleItems.quantity,
            amount: saleItems.totalAmount,
          })
          .from(saleItems)
          .innerJoin(sales, eq(saleItems.saleId, sales.id))
          .where(
            and(
              completedSale,
              gte(sales.soldAt, startAt),
              lt(sales.soldAt, until),
            ),
          ),
      ])

    // Production facts are available only after the production migrations. Keep
    // revenue, expenses and inventory usable on the already-migrated base.
    let production: {
      batchCosts: Array<{
        id: number
        plannedFor: string | null
        amount: string
      }>
      consumptions: Array<{
        productName: string
        quantity: string
        amount: string | null
      }>
      losses: Array<{
        productName: string
        quantity: string
        reason: string | null
      }>
      operationalCosts: Array<{ type: 'energy' | 'labor'; amount: string }>
    } | null = null
    try {
      const [batchCosts, consumptions, losses, costs] = await Promise.all([
        database
          .select({
            id: productionBatches.id,
            plannedFor: productionBatches.plannedFor,
            amount: productionBatchConsumptions.totalCost,
          })
          .from(productionBatches)
          .innerJoin(
            productionBatchConsumptions,
            eq(
              productionBatchConsumptions.productionBatchId,
              productionBatches.id,
            ),
          )
          .where(
            and(
              eq(productionBatches.status, 'completed'),
              gte(productionBatches.plannedFor, period.start),
              lte(productionBatches.plannedFor, period.end),
            ),
          ),
        database
          .select({
            productName: products.name,
            quantity: productionBatchConsumptions.quantity,
            amount: productionBatchConsumptions.totalCost,
          })
          .from(productionBatchConsumptions)
          .innerJoin(
            productionBatches,
            eq(
              productionBatchConsumptions.productionBatchId,
              productionBatches.id,
            ),
          )
          .innerJoin(
            products,
            eq(productionBatchConsumptions.productId, products.id),
          )
          .where(
            and(
              eq(productionBatches.status, 'completed'),
              gte(productionBatches.plannedFor, period.start),
              lte(productionBatches.plannedFor, period.end),
            ),
          ),
        database
          .select({
            productName: products.name,
            quantity: productionBatchLosses.quantity,
            reason: productionBatchLosses.reason,
          })
          .from(productionBatchLosses)
          .innerJoin(
            productionBatches,
            eq(productionBatchLosses.productionBatchId, productionBatches.id),
          )
          .innerJoin(products, eq(productionBatchLosses.productId, products.id))
          .where(
            and(
              eq(productionBatches.status, 'completed'),
              gte(productionBatches.plannedFor, period.start),
              lte(productionBatches.plannedFor, period.end),
            ),
          ),
        database
          .select({
            batchId: operationalCosts.productionBatchId,
            type: operationalCosts.type,
            amount: operationalCosts.amount,
          })
          .from(operationalCosts)
          .where(
            and(
              gte(operationalCosts.occurredAt, period.start),
              lte(operationalCosts.occurredAt, period.end),
            ),
          ),
      ])
      const totalsByBatch = new Map<
        number,
        { plannedFor: string | null; amount: bigint }
      >()
      for (const item of batchCosts) {
        const current = totalsByBatch.get(item.id) ?? {
          plannedFor: item.plannedFor,
          amount: 0n,
        }
        current.amount += moneyToCents(item.amount) ?? 0n
        totalsByBatch.set(item.id, current)
      }
      for (const item of costs) {
        if (!item.batchId) continue
        const current = totalsByBatch.get(item.batchId) ?? {
          plannedFor: null,
          amount: 0n,
        }
        current.amount += moneyToCents(item.amount) ?? 0n
        totalsByBatch.set(item.batchId, current)
      }
      production = {
        batchCosts: [...totalsByBatch.entries()].map(([id, item]) => ({
          id,
          plannedFor: item.plannedFor,
          amount: centsToMoney(item.amount),
        })),
        consumptions,
        losses,
        operationalCosts: costs.map(({ type, amount }) => ({ type, amount })),
      }
    } catch (error) {
      if (!isMissingOptionalSchemaError(error)) throw error
      production = null
    }

    let fifo: {
      netRevenue: string
      cogs: string
      grossMargin: string
      byProduct: Array<{
        productName: string
        revenue: string
        cogs: string
        grossMargin: string
      }>
      byBatch: Array<{
        productionBatchId: number
        revenue: string
        cogs: string
        grossMargin: string
      }>
      inventory: Array<{
        productId: number
        productName: string
        unit: string
        balance: string
        value: string
      }>
    } | null = null
    let reconciliation: {
      checked: {
        layers: number
        allocations: number
        reversals: number
        movements: number
      }
      divergences: ReconciliationDivergence[]
    } | null = null
    try {
      const [
        allocationRows,
        reversalRows,
        layerRows,
        reconciliationAllocations,
        reconciliationReversals,
      ] = await Promise.all([
        database
          .select({
            allocationId: inventoryCostAllocations.id,
            saleItemId: saleItems.id,
            productId: products.id,
            productName: products.name,
            productionBatchId: productionBatchOutputs.productionBatchId,
            quantity: inventoryCostAllocations.quantity,
            allocatedCost: inventoryCostAllocations.allocatedCost,
            saleItemRevenue: saleItems.totalAmount,
          })
          .from(inventoryCostAllocations)
          .innerJoin(
            saleItems,
            eq(inventoryCostAllocations.saleItemId, saleItems.id),
          )
          .innerJoin(sales, eq(saleItems.saleId, sales.id))
          .innerJoin(
            products,
            eq(inventoryCostAllocations.productId, products.id),
          )
          .innerJoin(
            inventoryCostLayers,
            eq(
              inventoryCostAllocations.inventoryCostLayerId,
              inventoryCostLayers.id,
            ),
          )
          .leftJoin(
            productionBatchOutputs,
            eq(
              inventoryCostLayers.productionBatchOutputId,
              productionBatchOutputs.id,
            ),
          )
          .where(
            and(
              completedSale,
              gte(sales.soldAt, startAt),
              lt(sales.soldAt, until),
            ),
          ),
        database
          .select({
            originalAllocationId: inventoryCostReversals.originalAllocationId,
            restoredCost: inventoryCostReversals.restoredCost,
          })
          .from(inventoryCostReversals),
        database
          .select({
            id: inventoryCostLayers.id,
            productId: products.id,
            productName: products.name,
            unit: products.unit,
            originalQuantity: inventoryCostLayers.originalQuantity,
            originalCost: inventoryCostLayers.originalCost,
            remainingQuantity: inventoryCostLayers.remainingQuantity,
            remainingCost: inventoryCostLayers.remainingCost,
          })
          .from(inventoryCostLayers)
          .innerJoin(products, eq(inventoryCostLayers.productId, products.id)),
        database
          .select({
            id: inventoryCostAllocations.id,
            layerId: inventoryCostAllocations.inventoryCostLayerId,
            outgoingMovementId:
              inventoryCostAllocations.outgoingStockMovementId,
            productId: inventoryCostAllocations.productId,
            quantity: inventoryCostAllocations.quantity,
            allocatedCost: inventoryCostAllocations.allocatedCost,
            movementProductId: stockMovements.productId,
            movementQuantity: stockMovements.quantityDelta,
            movementCost: stockMovements.allocatedCost,
          })
          .from(inventoryCostAllocations)
          .innerJoin(
            stockMovements,
            eq(
              inventoryCostAllocations.outgoingStockMovementId,
              stockMovements.id,
            ),
          ),
        database
          .select({
            id: inventoryCostReversals.id,
            allocationId: inventoryCostReversals.originalAllocationId,
            incomingMovementId: inventoryCostReversals.incomingStockMovementId,
            quantity: inventoryCostReversals.quantity,
            restoredCost: inventoryCostReversals.restoredCost,
            movementProductId: stockMovements.productId,
            movementQuantity: stockMovements.quantityDelta,
            movementCost: stockMovements.allocatedCost,
          })
          .from(inventoryCostReversals)
          .innerJoin(
            stockMovements,
            eq(
              inventoryCostReversals.incomingStockMovementId,
              stockMovements.id,
            ),
          ),
      ])
      if (allocationRows.length || layerRows.length) {
        const reversedCostByAllocation = new Map<number, bigint>()
        for (const reversal of reversalRows) {
          const restoredCost = moneyToCents(reversal.restoredCost) ?? 0n
          reversedCostByAllocation.set(
            reversal.originalAllocationId,
            (reversedCostByAllocation.get(reversal.originalAllocationId) ??
              0n) + restoredCost,
          )
        }
        fifo = {
          ...summarizeFifoMargins(
            allocationRows.map((row) => ({
              ...row,
              reversedCost: centsToMoney(
                reversedCostByAllocation.get(row.allocationId) ?? 0n,
              ),
            })),
          ),
          inventory: valueFifoLayers(layerRows),
        }
      }
      reconciliation = reconcileInventoryLedger({
        layers: layerRows,
        allocations: reconciliationAllocations,
        reversals: reconciliationReversals,
      })
    } catch (error) {
      // The feature is additively migrated; older bases retain existing reports.
      if (!isMissingOptionalSchemaError(error)) throw error
      fifo = null
      reconciliation = null
    }

    const revenue = groupRevenueByChannel(
      revenueRows.map((row) => ({
        channel: row.channel ?? 'Sem canal',
        amount: row.amount,
      })),
    )
    const expensesByCategory = groupExpensesByCategory(expenseRows)
    const inventory = valueInventory(movementRows)
    return {
      period,
      revenue,
      revenueTotal: sumReportMoney(revenueRows),
      expensesByCategory,
      expensesTotal: sumReportMoney(expenseRows),
      inventory,
      inventoryTotal: sumReportMoney(
        inventory.map((item) => ({ amount: item.value })),
      ),
      salesByProduct: groupSalesByProduct(salesByProduct),
      production,
      fifo,
      reconciliation,
    }
  })
