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
