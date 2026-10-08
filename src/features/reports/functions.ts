import { createServerFn } from '@tanstack/react-start'
import { and, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  expenses,
  inventoryCostAllocations,
  inventoryCostLayers,
  inventoryCostReversals,
  managementSettings,
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
  rankProductsByUnits,
  sumReportMoney,
  summarizeFifoMargins,
  valueFifoLayers,
  valueInventory,
} from '#/features/reports/calculations'
import { centsToMoney, moneyToCents } from '#/features/production/calculations'
import { isMissingOptionalSchemaError } from '#/features/reports/optional-schema'
import {
  compareOperationalTotals,
  previousEqualLengthPeriod,
} from '#/features/reports/period-comparison'
import {
  summarizeCoProducts,
  summarizeDeclaredLosses,
} from '#/features/reports/production-outcomes'
import { reconcileInventoryLedger } from '#/features/reports/inventory-reconciliation'
import type { ReconciliationDivergence } from '#/features/reports/inventory-reconciliation'
import { summarizeSalesMetrics } from '#/features/reports/sales-metrics'

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
    const previousPeriod = previousEqualLengthPeriod(period.start, period.end)
    const previousStartAt = new Date(`${previousPeriod.start}T00:00:00.000Z`)
    const completedSale = inArray(sales.status, ['confirmed', 'paid'])

    const [
      saleMetricRows,
      saleUnitRows,
      expenseRows,
      movementRows,
      salesByProduct,
      previousSaleMetricRows,
      previousSaleUnitRows,
    ] = await Promise.all([
      database
        .select({
          saleId: sales.id,
          locationId: sales.locationId,
          locationName: salesLocations.name,
          amount: sales.totalAmount,
          reportedAmount: sales.reportedAmount,
          calculatedAmount: sales.calculatedAmount,
          auditStatus: sales.auditStatus,
        })
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
        .select({ saleId: saleItems.saleId, quantity: saleItems.quantity })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
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
          productId: saleItems.productId,
          productName: saleItems.productName,
          catalogName: products.name,
          quantity: saleItems.quantity,
          amount:
            sql<string>`coalesce(${saleItems.reportedAmount}, ${saleItems.totalAmount})`.as(
              'amount',
            ),
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .leftJoin(products, eq(saleItems.productId, products.id))
        .where(
          and(
            completedSale,
            gte(sales.soldAt, startAt),
            lt(sales.soldAt, until),
          ),
        ),
      database
        .select({
          saleId: sales.id,
          locationId: sales.locationId,
          locationName: salesLocations.name,
          amount: sales.totalAmount,
          reportedAmount: sales.reportedAmount,
          calculatedAmount: sales.calculatedAmount,
          auditStatus: sales.auditStatus,
        })
        .from(sales)
        .leftJoin(salesLocations, eq(sales.locationId, salesLocations.id))
        .where(
          and(
            completedSale,
            gte(sales.soldAt, previousStartAt),
            lt(sales.soldAt, startAt),
          ),
        ),
      database
        .select({ saleId: saleItems.saleId, quantity: saleItems.quantity })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .where(
          and(
            completedSale,
            gte(sales.soldAt, previousStartAt),
            lt(sales.soldAt, startAt),
          ),
        ),
    ])

    let reportSettings: {
      monthlyProfitGoal: string
      fixedMonthlyCosts: string
      salesDaysPerMonth: number
      weeksPerMonth: string
      normalRevenueTolerance: string
      criticalRevenueTolerance: string
      minimumProductMargin: string
      feeTaxReserveRate: string
    } | null = null
    try {
      reportSettings =
        (
          await database
            .select({
              monthlyProfitGoal: managementSettings.monthlyProfitGoal,
              fixedMonthlyCosts: managementSettings.fixedMonthlyCosts,
              salesDaysPerMonth: managementSettings.salesDaysPerMonth,
              weeksPerMonth: managementSettings.weeksPerMonth,
              normalRevenueTolerance: managementSettings.normalRevenueTolerance,
              criticalRevenueTolerance:
                managementSettings.criticalRevenueTolerance,
              minimumProductMargin: managementSettings.minimumProductMargin,
              feeTaxReserveRate: managementSettings.feeTaxReserveRate,
            })
            .from(managementSettings)
            .where(eq(managementSettings.id, 1))
            .limit(1)
        ).at(0) ?? null
    } catch (error) {
      if (!isMissingOptionalSchemaError(error)) throw error
    }

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
      lossSummary: ReturnType<typeof summarizeDeclaredLosses>
      coProducts: ReturnType<typeof summarizeCoProducts>
      operationalCosts: Array<{ type: 'energy' | 'labor'; amount: string }>
    } | null = null
    try {
      const [batchCosts, consumptions, losses, costs, coProductRows] =
        await Promise.all([
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
              productId: productionBatchLosses.productId,
              productName: products.name,
              quantity: productionBatchLosses.quantity,
              reason: productionBatchLosses.reason,
            })
            .from(productionBatchLosses)
            .innerJoin(
              productionBatches,
              eq(productionBatchLosses.productionBatchId, productionBatches.id),
            )
            .innerJoin(
              products,
              eq(productionBatchLosses.productId, products.id),
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
          database
            .select({
              productId: productionBatchOutputs.productId,
              productName: products.name,
              actualQuantity: productionBatchOutputs.actualQuantity,
              allocatedCost: productionBatchOutputs.allocatedCost,
            })
            .from(productionBatchOutputs)
            .innerJoin(
              productionBatches,
              eq(
                productionBatchOutputs.productionBatchId,
                productionBatches.id,
              ),
            )
            .innerJoin(
              products,
              eq(productionBatchOutputs.productId, products.id),
            )
            .where(
              and(
                eq(productionBatches.status, 'completed'),
                eq(productionBatchOutputs.role, 'co_product'),
                gte(productionBatches.plannedFor, period.start),
                lte(productionBatches.plannedFor, period.end),
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
        lossSummary: summarizeDeclaredLosses(losses),
        coProducts: summarizeCoProducts(coProductRows),
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
            saleItemRevenue:
              sql<string>`coalesce(${saleItems.reportedAmount}, ${saleItems.totalAmount})`.as(
                'sale_item_revenue',
              ),
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
      saleMetricRows.map((row) => ({
        channel: row.locationName ?? 'Sem canal',
        amount: row.amount,
      })),
    )
    const salesMetrics = summarizeSalesMetrics(saleMetricRows, saleUnitRows)
    const previousSalesMetrics = summarizeSalesMetrics(
      previousSaleMetricRows,
      previousSaleUnitRows,
    )
    const operationalComparison = {
      previousPeriod,
      ...compareOperationalTotals(
        salesMetrics.total,
        previousSalesMetrics.total,
      ),
    }
    const expensesByCategory = groupExpensesByCategory(expenseRows)
    const inventory = valueInventory(movementRows)
    return {
      period,
      revenue,
      revenueTotal: salesMetrics.total.revenue,
      salesMetrics,
      operationalComparison,
      managementSettings: reportSettings,
      expensesByCategory,
      expensesTotal: sumReportMoney(expenseRows),
      inventory,
      inventoryTotal: sumReportMoney(
        inventory.map((item) => ({ amount: item.value })),
      ),
      salesByProduct: groupSalesByProduct(salesByProduct),
      topProducts: rankProductsByUnits(salesByProduct),
      production,
      fifo,
      reconciliation,
    }
  })
