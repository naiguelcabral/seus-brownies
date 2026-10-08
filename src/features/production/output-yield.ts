import {
  quantityToThousandths,
  thousandthsToQuantity,
} from '#/features/production/calculations'

/** Compares recorded physical facts; missing actual output is not a forecast. */
export function compareOutputYield(
  plannedQuantity: string | null,
  actualQuantity: string | null,
) {
  function parse(value: string | null) {
    if (value === null) return null
    const parsed = quantityToThousandths(value)
    if (parsed === null) throw new Error('Quantidade de saída inválida.')
    return parsed
  }
  const planned = parse(plannedQuantity)
  const actual = parse(actualQuantity)
  return {
    planned: planned === null ? null : thousandthsToQuantity(planned),
    actual: actual === null ? null : thousandthsToQuantity(actual),
    difference:
      planned === null || actual === null
        ? null
        : thousandthsToQuantity(actual - planned),
  }
}
