import {
  calculateInventoryState,
  calculateWeightedAverageCost,
  centsToMoney,
  millisToUnitCost,
  moneyToCents,
  quantityToThousandths,
  thousandthsToQuantity,
} from '#/features/production/calculations'

export type RevenueRow = { channel: string; amount: string }
export type ExpenseRow = { category: string; amount: string }

function sumMoney(rows: Array<{ amount: string }>) {
  return rows.reduce(
    (total, row) => total + (moneyToCents(row.amount) ?? 0n),
    0n,
  )
}

export function groupRevenueByChannel(rows: RevenueRow[]) {
  const totals = new Map<string, bigint>()
  for (const row of rows) {
    totals.set(
      row.channel,
      (totals.get(row.channel) ?? 0n) + (moneyToCents(row.amount) ?? 0n),
    )
  }
  return [...totals.entries()]
    .map(([channel, total]) => ({ channel, total: centsToMoney(total) }))
    .sort((left, right) => Number(right.total) - Number(left.total))
}

export function groupExpensesByCategory(rows: ExpenseRow[]) {
  const totals = new Map<string, bigint>()
  for (const row of rows) {
    totals.set(
      row.category,
      (totals.get(row.category) ?? 0n) + (moneyToCents(row.amount) ?? 0n),
    )
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total: centsToMoney(total) }))
    .sort((left, right) => Number(right.total) - Number(left.total))
}

export function sumReportMoney(rows: Array<{ amount: string }>) {
  return centsToMoney(sumMoney(rows))
}

export function groupSalesByProduct(
  rows: Array<{ productName: string; quantity: string; amount: string }>,
) {
  const totals = new Map<string, { quantity: bigint; amount: bigint }>()
  for (const row of rows) {
    const current = totals.get(row.productName) ?? { quantity: 0n, amount: 0n }
    current.quantity += quantityToThousandths(row.quantity) ?? 0n
    current.amount += moneyToCents(row.amount) ?? 0n
    totals.set(row.productName, current)
  }
  return [...totals.entries()]
    .map(([productName, total]) => ({
      productName,
      quantity: thousandthsToQuantity(total.quantity),
      amount: centsToMoney(total.amount),
    }))
    .sort((left, right) => Number(right.amount) - Number(left.amount))
}

export type FifoMarginRow = {
  allocationId: number
  saleItemId: number
  productId: number
  productName: string
  productionBatchId: number
  quantity: string
  allocatedCost: string
  saleItemRevenue: string
}

function allocateRevenueAcrossLayers(rows: FifoMarginRow[]) {
  const byItem = new Map<number, FifoMarginRow[]>()
  for (const row of rows) {
    const group = byItem.get(row.saleItemId) ?? []
    group.push(row)
    byItem.set(row.saleItemId, group)
  }
  const revenueByAllocation = new Map<number, bigint>()
  for (const allocations of byItem.values()) {
    const revenue = moneyToCents(allocations[0].saleItemRevenue) ?? 0n
    const totalQuantity = allocations.reduce(
      (sum, allocation) =>
        sum + (quantityToThousandths(allocation.quantity) ?? 0n),
      0n,
    )
    if (totalQuantity <= 0n) continue
    const shares = allocations.map((allocation) => {
      const quantity = quantityToThousandths(allocation.quantity) ?? 0n
      const numerator = revenue * quantity
      return {
        allocation,
        base: numerator / totalQuantity,
        remainder: numerator % totalQuantity,
      }
    })
    const residual =
      revenue - shares.reduce((sum, share) => sum + share.base, 0n)
    const recipients = new Set(
      [...shares]
        .sort((left, right) =>
          right.remainder === left.remainder
            ? left.allocation.allocationId - right.allocation.allocationId
            : right.remainder > left.remainder
              ? 1
              : -1,
        )
        .slice(0, Number(residual))
        .map((share) => share.allocation.allocationId),
    )
    for (const share of shares)
      revenueByAllocation.set(
        share.allocation.allocationId,
        share.base + (recipients.has(share.allocation.allocationId) ? 1n : 0n),
      )
  }
  return revenueByAllocation
}

export function summarizeFifoMargins(rows: FifoMarginRow[]) {
  const revenueByAllocation = allocateRevenueAcrossLayers(rows)
  const totals = rows.reduce(
    (sum, row) => {
      sum.revenue += revenueByAllocation.get(row.allocationId) ?? 0n
      sum.cogs += moneyToCents(row.allocatedCost) ?? 0n
      return sum
    },
    { revenue: 0n, cogs: 0n },
  )
  const group = <T extends string | number>(keyFor: (row: FifoMarginRow) => T) => {
    const byKey = new Map<T, { revenue: bigint; cogs: bigint }>()
    for (const row of rows) {
      const key = keyFor(row)
      const current = byKey.get(key) ?? { revenue: 0n, cogs: 0n }
      current.revenue += revenueByAllocation.get(row.allocationId) ?? 0n
      current.cogs += moneyToCents(row.allocatedCost) ?? 0n
      byKey.set(key, current)
    }
    return byKey
  }
  const asMargin = <T extends string | number>(
    groups: Map<T, { revenue: bigint; cogs: bigint }>,
  ) =>
    [...groups.entries()].map(([key, total]) => ({
      key,
      revenue: centsToMoney(total.revenue),
      cogs: centsToMoney(total.cogs),
      grossMargin: centsToMoney(total.revenue - total.cogs),
    }))

  return {
    netRevenue: centsToMoney(totals.revenue),
    cogs: centsToMoney(totals.cogs),
    grossMargin: centsToMoney(totals.revenue - totals.cogs),
    byProduct: asMargin(group((row) => row.productName)).map(
      ({ key, ...item }) => ({
        productName: key,
        ...item,
      }),
    ),
    byBatch: asMargin(group((row) => row.productionBatchId)).map(
      ({ key, ...item }) => ({
        productionBatchId: key,
        ...item,
      }),
    ),
  }
}

export function valueFifoLayers(
  rows: Array<{
    productId: number
    productName: string
    unit: string
    remainingQuantity: string
    remainingCost: string
  }>,
) {
  const totals = new Map<
    number,
    { productName: string; unit: string; quantity: bigint; value: bigint }
  >()
  for (const row of rows) {
    const current = totals.get(row.productId) ?? {
      productName: row.productName,
      unit: row.unit,
      quantity: 0n,
      value: 0n,
    }
    current.quantity += quantityToThousandths(row.remainingQuantity) ?? 0n
    current.value += moneyToCents(row.remainingCost) ?? 0n
    totals.set(row.productId, current)
  }
  return [...totals.entries()]
    .map(([productId, item]) => ({
      productId,
      productName: item.productName,
      unit: item.unit,
      balance: thousandthsToQuantity(item.quantity),
      value: centsToMoney(item.value),
    }))
    .filter((item) => Number(item.balance) > 0)
}

export function valueInventory(
  rows: Array<{
    productId: number
    productName: string
    unit: string
    quantityDelta: string
    unitCost: string | null
    allocatedCost?: string | null
  }>,
) {
  const byProduct = new Map<number, typeof rows>()
  for (const row of rows) {
    const group = byProduct.get(row.productId) ?? []
    group.push(row)
    byProduct.set(row.productId, group)
  }
  return [...byProduct.values()]
    .map((movements) => {
      const first = movements[0]
      const state = calculateInventoryState(movements)
      const balance = state.quantity
      const unitCost = calculateWeightedAverageCost(movements)
      const valueCents = state.valueCents
      return {
        productId: first.productId,
        productName: first.productName,
        unit: first.unit,
        balance: thousandthsToQuantity(balance),
        unitCost: millisToUnitCost(unitCost),
        value: centsToMoney(valueCents),
      }
    })
    .filter((item) => Number(item.balance) > 0)
    .sort((left, right) => Number(right.value) - Number(left.value))
}
