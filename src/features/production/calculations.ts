/**
 * Cálculos determinísticos de produção. Quantidades usam milésimos e valores
 * usam centavos para não depender de ponto flutuante ao concluir um lote.
 */
export type DecimalQuantity = string

const QUANTITY_SCALE = 1_000n

export function normalizeDecimal(value: string): string | null {
  const normalized = value.trim().replace(',', '.')
  if (!/^-?\d+(?:\.\d{1,3})?$/.test(normalized)) return null
  const negative = normalized.startsWith('-')
  const unsigned = negative ? normalized.slice(1) : normalized
  const [whole, fraction = ''] = unsigned.split('.')
  return `${negative ? '-' : ''}${BigInt(whole)}.${fraction.padEnd(3, '0')}`
}

export function quantityToThousandths(value: string): bigint | null {
  const normalized = normalizeDecimal(value)
  if (!normalized) return null
  const negative = normalized.startsWith('-')
  const unsigned = negative ? normalized.slice(1) : normalized
  const [whole, fraction] = unsigned.split('.')
  const parsed = BigInt(whole) * QUANTITY_SCALE + BigInt(fraction)
  return negative ? -parsed : parsed
}

export function thousandthsToQuantity(value: bigint): DecimalQuantity {
  const sign = value < 0n ? '-' : ''
  const absolute = value < 0n ? -value : value
  const whole = absolute / QUANTITY_SCALE
  const fraction = String(absolute % QUANTITY_SCALE).padStart(3, '0')
  return `${sign}${whole}.${fraction}`
}

export function multiplyQuantities(
  left: bigint,
  right: bigint,
): bigint {
  return (left * right + QUANTITY_SCALE / 2n) / QUANTITY_SCALE
}

export function divideQuantities(
  dividend: bigint,
  divisor: bigint,
): bigint {
  if (divisor <= 0n) throw new Error('Rendimento inválido para o perfil.')
  return (dividend * QUANTITY_SCALE + divisor / 2n) / divisor
}

export function calculateMoneyCents(
  unitCostCents: bigint,
  quantity: bigint,
): bigint {
  return (unitCostCents * quantity + QUANTITY_SCALE / 2n) / QUANTITY_SCALE
}

export function centsToMoney(value: bigint): string {
  const sign = value < 0n ? '-' : ''
  const absolute = value < 0n ? -value : value
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

export function moneyToCents(value: string | null): bigint | null {
  if (!value) return null
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const [whole, fraction = ''] = normalized.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
}

export type PlannedProfileOutput = {
  productId: number
  quantity: string
  expectedYield: string
}

export function calculateRecipeCapacity(
  multiplier: string,
  outputs: PlannedProfileOutput[],
  bordinhasExpectedYield: string,
) {
  const multiplierValue = quantityToThousandths(multiplier)
  const bordinhasYield = quantityToThousandths(bordinhasExpectedYield)
  if (!multiplierValue || multiplierValue <= 0n || !bordinhasYield || bordinhasYield <= 0n) {
    throw new Error('Multiplicador ou rendimento inválido.')
  }
  let occupied = 0n
  for (const output of outputs) {
    const outputQuantity = quantityToThousandths(output.quantity)
    const expectedYield = quantityToThousandths(output.expectedYield)
    if (!outputQuantity || outputQuantity <= 0n || !expectedYield || expectedYield <= 0n) {
      throw new Error('Quantidade ou rendimento inválido para um produto do lote.')
    }
    occupied += divideQuantities(outputQuantity, expectedYield)
  }
  const remaining = multiplierValue - occupied
  const suggestedBordinhas =
    remaining > 0n ? multiplyQuantities(remaining, bordinhasYield) : 0n
  return {
    multiplier: thousandthsToQuantity(multiplierValue),
    occupied: thousandthsToQuantity(occupied),
    remaining: thousandthsToQuantity(remaining > 0n ? remaining : 0n),
    overCapacity: occupied > multiplierValue,
    suggestedBordinhas: thousandthsToQuantity(suggestedBordinhas),
  }
}

export type CostedMovement = {
  quantityDelta: string
  unitCost: string | null
}

/**
 * Reconstitui o custo médio ponderado perpétuo. Saídas sem custo usam a média
 * disponível naquele instante; novas conclusões sempre gravam o custo usado.
 */
export function calculateWeightedAverageCost(movements: CostedMovement[]) {
  let quantity = 0n
  let valueCents = 0n
  for (const movement of movements) {
    const delta = quantityToThousandths(movement.quantityDelta)
    if (delta === null) throw new Error('Movimentação com quantidade inválida.')
    if (delta >= 0n) {
      quantity += delta
      const unitCost = moneyToCents(movement.unitCost)
      if (unitCost !== null) valueCents += calculateMoneyCents(unitCost, delta)
      continue
    }
    const outgoing = -delta
    const providedCost = moneyToCents(movement.unitCost)
    const average = quantity > 0n ? (valueCents * QUANTITY_SCALE + quantity / 2n) / quantity : 0n
    const unitCost = providedCost ?? average
    valueCents -= calculateMoneyCents(unitCost, outgoing)
    quantity -= outgoing
  }
  if (quantity <= 0n) return 0n
  return (valueCents * QUANTITY_SCALE + quantity / 2n) / quantity
}
