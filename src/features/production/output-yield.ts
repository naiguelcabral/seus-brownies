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

/** Localized presentation only; the recorded quantities remain unchanged. */
export function formatOutputYield(
  plannedQuantity: string | null,
  actualQuantity: string | null,
  unit: string,
) {
  const facts = compareOutputYield(plannedQuantity, actualQuantity)
  function format(value: string | null) {
    if (value === null) return null
    const negative = value.startsWith('-')
    const unsigned = negative ? value.slice(1) : value
    const [whole = '0', fraction = ''] = unsigned.split('.')
    const digits = fraction.replace(/0+$/, '')
    const quantity = `${negative ? '-' : ''}${new Intl.NumberFormat('pt-BR').format(BigInt(whole))}${digits ? `,${digits}` : ''}`
    return `${quantity}${unit ? ` ${unit === 'unit' ? 'un.' : unit}` : ''}`
  }
  return {
    planned: format(facts.planned),
    actual: format(facts.actual),
    difference: format(facts.difference),
  }
}
