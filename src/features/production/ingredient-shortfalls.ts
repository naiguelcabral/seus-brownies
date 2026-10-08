import {
  quantityToThousandths,
  thousandthsToQuantity,
} from '#/features/production/calculations'

/** Physical shortfall per ingredient; quantities in different units stay separate. */
export function ingredientShortfalls<
  T extends {
    quantity: string
    available: string
  },
>(rows: T[]) {
  return rows.flatMap((row) => {
    const required = quantityToThousandths(row.quantity)
    const available = quantityToThousandths(row.available)
    if (required === null || available === null)
      throw new Error('Quantidade de insumo inválida.')
    return required > available
      ? [{ ...row, shortfall: thousandthsToQuantity(required - available) }]
      : []
  })
}
