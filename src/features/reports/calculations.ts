import {
  calculateWeightedAverageCost,
  centsToMoney,
  moneyToCents,
  quantityToThousandths,
  thousandthsToQuantity,
} from '#/features/production/calculations'

export type RevenueRow = { channel: string; amount: string }
export type ExpenseRow = { category: string; amount: string }

function sumMoney(rows: Array<{ amount: string }>) {
  return rows.reduce((total, row) => total + (moneyToCents(row.amount) ?? 0n), 0n)
}

export function groupRevenueByChannel(rows: RevenueRow[]) {
  const totals = new Map<string, bigint>()
  for (const row of rows) {
    totals.set(row.channel, (totals.get(row.channel) ?? 0n) + (moneyToCents(row.amount) ?? 0n))
  }
  return [...totals.entries()]
    .map(([channel, total]) => ({ channel, total: centsToMoney(total) }))
    .sort((left, right) => Number(right.total) - Number(left.total))
}

export function groupExpensesByCategory(rows: ExpenseRow[]) {
  const totals = new Map<string, bigint>()
  for (const row of rows) {
    totals.set(row.category, (totals.get(row.category) ?? 0n) + (moneyToCents(row.amount) ?? 0n))
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

export function valueInventory(
  rows: Array<{ productId: number; productName: string; unit: string; quantityDelta: string; unitCost: string | null }>,
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
      const balance = movements.reduce(
        (total, item) => total + (quantityToThousandths(item.quantityDelta) ?? 0n),
        0n,
      )
      const unitCost = calculateWeightedAverageCost(movements)
      const valueCents = balance > 0n ? (unitCost * balance + 500n) / 1_000n : 0n
      return {
        productId: first.productId,
        productName: first.productName,
        unit: first.unit,
        balance: thousandthsToQuantity(balance),
        unitCost: centsToMoney(unitCost),
        value: centsToMoney(valueCents),
      }
    })
    .filter((item) => Number(item.balance) > 0)
    .sort((left, right) => Number(right.value) - Number(left.value))
}
