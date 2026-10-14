import {
  centsToMoney,
  moneyToCents,
  quantityToThousandths,
  thousandthsToQuantity,
} from '#/features/production/calculations'

export function summarizeDeclaredLosses(
  rows: Array<{ productId: number; productName: string; quantity: string }>,
) {
  const totals = new Map<
    number,
    { productName: string; quantity: bigint; declarations: number }
  >()
  for (const row of rows) {
    const quantity = quantityToThousandths(row.quantity)
    if (quantity === null) throw new Error('Perda declarada inválida.')
    const current = totals.get(row.productId) ?? {
      productName: row.productName,
      quantity: 0n,
      declarations: 0,
    }
    current.quantity += quantity
    current.declarations += 1
    totals.set(row.productId, current)
  }
  return [...totals.entries()]
    .map(([productId, item]) => ({
      productId,
      productName: item.productName,
      quantity: thousandthsToQuantity(item.quantity),
      declarations: item.declarations,
    }))
    .sort((left, right) => left.productId - right.productId)
}

/** Co-product outputs are physical facts, distinct from declared losses. */
export function summarizeCoProducts(
  rows: Array<{
    productId: number
    productName: string
    actualQuantity: string | null
    allocatedCost: string | null
  }>,
) {
  const totals = new Map<
    number,
    {
      productName: string
      quantity: bigint
      cost: bigint
      missingQuantityRows: number
      missingCostRows: number
    }
  >()
  for (const row of rows) {
    const quantity =
      row.actualQuantity === null
        ? null
        : quantityToThousandths(row.actualQuantity)
    const cost = moneyToCents(row.allocatedCost)
    if (row.actualQuantity !== null && quantity === null)
      throw new Error('Quantidade de coproduto inválida.')
    if (row.allocatedCost !== null && cost === null)
      throw new Error('Custo de coproduto inválido.')
    const current = totals.get(row.productId) ?? {
      productName: row.productName,
      quantity: 0n,
      cost: 0n,
      missingQuantityRows: 0,
      missingCostRows: 0,
    }
    if (quantity === null) current.missingQuantityRows += 1
    else current.quantity += quantity
    if (cost === null) current.missingCostRows += 1
    else current.cost += cost
    totals.set(row.productId, current)
  }
  return [...totals.entries()]
    .map(([productId, item]) => ({
      productId,
      productName: item.productName,
      quantity:
        item.missingQuantityRows > 0
          ? null
          : thousandthsToQuantity(item.quantity),
      allocatedCost: item.missingCostRows > 0 ? null : centsToMoney(item.cost),
      missingQuantityRows: item.missingQuantityRows,
      missingCostRows: item.missingCostRows,
    }))
    .sort((left, right) => left.productId - right.productId)
}
