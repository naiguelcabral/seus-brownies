import {
  exactCost,
  addCosts,
  sumCosts,
  displayCostMoney,
  decimalCost,
} from '../../lib/exact-cost'
import type { ExactCost } from '../../lib/exact-cost'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  expenses,
  financialEvents,
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
import { reconcileOperationalIntegrity } from '#/features/reports/integrity-reconciliation'
import { summarizeSalesMetrics } from '#/features/reports/sales-metrics'
import {
  businessDayEnd,
  businessDayStart,
  businessMonth,
} from '#/lib/business-date'

const periodValues = z.object({
  start: z.string().date().optional(),
  end: z.string().date().optional(),
})

/** All report calculations run on the server; the browser receives aggregates only. */
export const getOperationalReports = createServerFn({ method: 'GET' })
  .middleware([requireServerFunctionPermission('getOperationalReports')])
  .validator(periodValues)
  .handler(async ({ data }) => {
    const fallback = businessMonth()
    const period = {
      start: data.start ?? fallback.start,
      end: data.end ?? fallback.end,
    }
    if (period.start > period.end)
      throw new Error('A data inicial deve ser anterior à data final.')

    const { getDb } = await import('#/db/index')
    const database = getDb()
    const startAt = businessDayStart(period.start)
    const until = businessDayEnd(period.end)
    const previousPeriod = previousEqualLengthPeriod(period.start, period.end)
    const previousStartAt = businessDayStart(previousPeriod.start)
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
          exactCost: stockMovements.exactCost,
        })
        .from(stockMovements)
        .innerJoin(products, eq(stockMovements.productId, products.id))
        .where(lt(stockMovements.occurredAt, until))
        .orderBy(asc(stockMovements.occurredAt), asc(stockMovements.id)),
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
              exactCost: productionBatchOutputs.exactCost,
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
    let integrity: ReturnType<typeof reconcileOperationalIntegrity> | null =
      null
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
            exactCost: inventoryCostAllocations.exactCost,
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
            exactCost: inventoryCostReversals.exactCost,
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
            productionBatchOutputId:
              inventoryCostLayers.productionBatchOutputId,
            exactOriginalCost: inventoryCostLayers.exactOriginalCost,
            remainingQuantity: inventoryCostLayers.remainingQuantity,
            remainingCost: inventoryCostLayers.remainingCost,
            exactRemainingCost: inventoryCostLayers.exactRemainingCost,
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
            exactCost: inventoryCostAllocations.exactCost,
            movementProductId: stockMovements.productId,
            movementQuantity: stockMovements.quantityDelta,
            movementCost: stockMovements.allocatedCost,
            movementExactCost: stockMovements.exactCost,
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
            exactCost: inventoryCostReversals.exactCost,
            movementProductId: stockMovements.productId,
            movementQuantity: stockMovements.quantityDelta,
            movementCost: stockMovements.allocatedCost,
            movementExactCost: stockMovements.exactCost,
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
        const reversedExactByAllocation = new Map<number, ExactCost>()
        const reversedCostByAllocation = new Map<number, bigint>()
        for (const reversal of reversalRows) {
          const restoredCost = moneyToCents(reversal.restoredCost) ?? 0n
          reversedExactByAllocation.set(
            reversal.originalAllocationId,
            addCosts(
              reversedExactByAllocation.get(reversal.originalAllocationId) ??
                exactCost(0n),
              reversal.exactCost ?? exactCost(restoredCost, 100n),
            ),
          )
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
              exactReversedCost:
                reversedExactByAllocation.get(row.allocationId) ??
                exactCost(0n),
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
      try {
        const [batchRows, outputRows, eventRows] = await Promise.all([
          database
            .select({
              id: productionBatches.id,
              totalCost: productionBatches.totalCost,
              exactCost: productionBatches.exactCost,
            })
            .from(productionBatches)
            .where(
              and(
                eq(productionBatches.status, 'completed'),
                gte(productionBatches.plannedFor, period.start),
                lte(productionBatches.plannedFor, period.end),
              ),
            ),
          database
            .select({
              id: productionBatchOutputs.id,
              productionBatchId: productionBatchOutputs.productionBatchId,
              productId: productionBatchOutputs.productId,
              actualQuantity: productionBatchOutputs.actualQuantity,
              allocatedCost: productionBatchOutputs.allocatedCost,
              exactCost: productionBatchOutputs.exactCost,
            })
            .from(productionBatchOutputs)
            .innerJoin(
              productionBatches,
              eq(
                productionBatchOutputs.productionBatchId,
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
              type: financialEvents.type,
              saleId: financialEvents.saleId,
            })
            .from(financialEvents)
            .where(
              and(
                gte(financialEvents.competenceDate, period.start),
                lte(financialEvents.competenceDate, period.end),
              ),
            ),
        ])
        const saleIds = [
          ...new Set(
            eventRows.flatMap((event) =>
              event.saleId === null ? [] : [event.saleId],
            ),
          ),
        ]
        const deliveredItems = saleIds.length
          ? await database
              .select({
                id: saleItems.id,
                saleId: saleItems.saleId,
                quantity: saleItems.quantity,
              })
              .from(saleItems)
              .where(inArray(saleItems.saleId, saleIds))
          : []
        const deliveredItemIds = deliveredItems.map((item) => item.id)
        const deliveryAllocations = deliveredItemIds.length
          ? await database
              .select({
                id: inventoryCostAllocations.id,
                saleItemId: inventoryCostAllocations.saleItemId,
                quantity: inventoryCostAllocations.quantity,
              })
              .from(inventoryCostAllocations)
              .where(
                inArray(inventoryCostAllocations.saleItemId, deliveredItemIds),
              )
          : []
        const outputsByBatch = new Map<number, typeof outputRows>()
        for (const output of outputRows) {
          const outputs = outputsByBatch.get(output.productionBatchId) ?? []
          outputs.push(output)
          outputsByBatch.set(output.productionBatchId, outputs)
        }
        integrity = reconcileOperationalIntegrity({
          ledger: {
            layers: layerRows,
            allocations: reconciliationAllocations,
            reversals: reconciliationReversals,
          },
          production: batchRows.map((batch) => {
            const outputs = outputsByBatch.get(batch.id) ?? []
            const outputIds = new Set(outputs.map((output) => output.id))
            return {
              ...batch,
              outputs,
              layers: layerRows.filter(
                (layer) =>
                  layer.productionBatchOutputId !== null &&
                  outputIds.has(layer.productionBatchOutputId),
              ),
            }
          }),
          deliveries: {
            events: eventRows,
            saleItems: deliveredItems,
            allocations: deliveryAllocations.flatMap((allocation) =>
              allocation.saleItemId === null
                ? []
                : [
                    {
                      id: allocation.id,
                      saleItemId: allocation.saleItemId,
                      quantity: allocation.quantity,
                    },
                  ],
            ),
          },
        })
      } catch (error) {
        if (!isMissingOptionalSchemaError(error)) throw error
      }
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
      inventoryTotal: displayCostMoney(
        sumCosts(
          inventory.map((item) => item.exactValue ?? decimalCost(item.value)),
        ),
      ),
      salesByProduct: groupSalesByProduct(salesByProduct),
      topProducts: rankProductsByUnits(salesByProduct),
      production,
      fifo,
      reconciliation,
      integrity,
    }
  })
