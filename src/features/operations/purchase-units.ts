/** Convert a kg purchase to canonical grams without changing monetary precision. */
export function convertKilogramPurchase(
  stockUnit: string,
  quantityThousandths: bigint,
  unitCostMillis: bigint,
) {
  if (stockUnit !== 'g') {
    throw new Error('Compra em kg exige um produto com estoque em gramas.')
  }
  if (quantityThousandths <= 0n || unitCostMillis <= 0n) {
    throw new Error('Quantidade e custo devem ser positivos.')
  }
  if (unitCostMillis % 10n !== 0n) {
    throw new Error('Informe o preço por kg com até duas casas decimais.')
  }
  const stockQuantity = quantityThousandths * 1_000n
  if (stockQuantity > 999_999_999_999n) {
    throw new Error('Quantidade convertida excede o limite do estoque.')
  }
  return {
    quantity: `${stockQuantity / 1_000n}.${String(stockQuantity % 1_000n).padStart(3, '0')}`,
    // Informational unit cost; allocatedCost retains the exact purchase total.
    unitCostMillis: (unitCostMillis + 500n) / 1_000n,
  }
}

/** The amount is the invoice total, never a price to multiply by the kg quantity. */
export function convertKilogramTotalPurchase(
  stockUnit: string,
  quantityThousandths: bigint,
  totalCents: bigint,
) {
  if (stockUnit !== 'g' && stockUnit !== 'kg')
    throw new Error('Compra em kg exige produto com unidade de massa.')
  if (quantityThousandths <= 0n || totalCents <= 0n)
    throw new Error('Quantidade e valor total devem ser positivos.')
  const stockQuantity =
    stockUnit === 'g' ? quantityThousandths * 1_000n : quantityThousandths
  if (stockQuantity > 999_999_999_999n)
    throw new Error('Quantidade convertida excede o limite do estoque.')
  return {
    quantity: `${stockQuantity / 1_000n}.${String(stockQuantity % 1_000n).padStart(3, '0')}`,
    // Compatibility display only. Exact valuation uses totalCents and stockQuantity.
    unitCostMillis: (totalCents * 10_000n + stockQuantity / 2n) / stockQuantity,
  }
}
