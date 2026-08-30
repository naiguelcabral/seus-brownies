/**
 * Cálculos determinísticos de produção. Quantidades usam milésimos e valores
 * usam centavos nos totais e milésimos de real nos custos unitários para não
 * depender de ponto flutuante ao concluir um lote.
 */
export type DecimalQuantity = string

const QUANTITY_SCALE = 1_000n
const UNIT_COST_SCALE = 1_000n

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

export function multiplyQuantities(left: bigint, right: bigint): bigint {
  return (left * right + QUANTITY_SCALE / 2n) / QUANTITY_SCALE
}

export function divideQuantities(dividend: bigint, divisor: bigint): bigint {
  if (divisor <= 0n) throw new Error('Rendimento inválido para o perfil.')
  return (dividend * QUANTITY_SCALE + divisor / 2n) / divisor
}

export function calculateMoneyCents(
  unitCostCents: bigint,
  quantity: bigint,
): bigint {
  return (unitCostCents * quantity + QUANTITY_SCALE / 2n) / QUANTITY_SCALE
}

export function calculateUnitCostCents(
  unitCostMillis: bigint,
  quantity: bigint,
): bigint {
  return (unitCostMillis * quantity + 5_000n) / 10_000n
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

export function unitCostToMillis(value: string | null): bigint | null {
  if (!value) return null
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) return null
  const [whole, fraction = ''] = normalized.split('.')
  return BigInt(whole) * UNIT_COST_SCALE + BigInt(fraction.padEnd(3, '0'))
}

export function millisToUnitCost(value: bigint): string {
  const sign = value < 0n ? '-' : ''
  const absolute = value < 0n ? -value : value
  return `${sign}${absolute / UNIT_COST_SCALE}.${String(absolute % UNIT_COST_SCALE).padStart(3, '0')}`
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
  if (
    !multiplierValue ||
    multiplierValue <= 0n ||
    !bordinhasYield ||
    bordinhasYield <= 0n
  ) {
    throw new Error('Multiplicador ou rendimento inválido.')
  }
  let occupied = 0n
  for (const output of outputs) {
    const outputQuantity = quantityToThousandths(output.quantity)
    const expectedYield = quantityToThousandths(output.expectedYield)
    if (
      !outputQuantity ||
      outputQuantity <= 0n ||
      !expectedYield ||
      expectedYield <= 0n
    ) {
      throw new Error(
        'Quantidade ou rendimento inválido para um produto do lote.',
      )
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
  allocatedCost?: string | null
}

export type OutputCostAllocation = {
  productId: number
  quantity: bigint
  allocatedCost: bigint
}

/**
 * Allocates a batch total in cents. Remainder cents go to the largest fractional
 * shares; equal fractions are resolved by the lowest catalog product id.
 */
export function allocateOutputCosts(
  totalCost: bigint,
  outputs: Array<{ productId: number; quantity: bigint }>,
): OutputCostAllocation[] {
  if (totalCost < 0n) throw new Error('Custo total inválido para alocação.')
  if (!outputs.length)
    throw new Error('O lote não possui saídas para alocar o custo.')
  const totalQuantity = outputs.reduce((sum, output) => {
    if (output.quantity <= 0n)
      throw new Error('Quantidade de saída inválida para alocação.')
    return sum + output.quantity
  }, 0n)
  if (totalQuantity <= 0n)
    throw new Error('Quantidade total inválida para alocação.')

  const shares = outputs.map((output, index) => {
    const numerator = totalCost * output.quantity
    return {
      ...output,
      index,
      base: numerator / totalQuantity,
      remainder: numerator % totalQuantity,
    }
  })
  const remainingCents =
    totalCost - shares.reduce((sum, share) => sum + share.base, 0n)
  const receiveRemainder = new Set(
    [...shares]
      .sort((left, right) =>
        right.remainder === left.remainder
          ? left.productId - right.productId || left.index - right.index
          : right.remainder > left.remainder
            ? 1
            : -1,
      )
      .slice(0, Number(remainingCents))
      .map((share) => share.index),
  )
  return shares.map((share) => ({
    productId: share.productId,
    quantity: share.quantity,
    allocatedCost: share.base + (receiveRemainder.has(share.index) ? 1n : 0n),
  }))
}

/** Applies the migration backfill rule only to outputs that do not yet have a total. */
export function backfillMissingOutputAllocations(
  totalCost: bigint,
  outputs: Array<{
    productId: number
    quantity: bigint
    allocatedCost: bigint | null
  }>,
) {
  const missing = outputs.filter((output) => output.allocatedCost === null)
  if (!missing.length) return outputs
  const allocations = allocateOutputCosts(
    totalCost,
    outputs.map((output) => ({
      productId: output.productId,
      quantity: output.quantity,
    })),
  )
  const byProductId = new Map(
    allocations.map((allocation) => [allocation.productId, allocation]),
  )
  return outputs.map((output) => ({
    ...output,
    allocatedCost:
      output.allocatedCost ??
      byProductId.get(output.productId)?.allocatedCost ??
      null,
  }))
}

export function calculateInventoryState(movements: CostedMovement[]) {
  let quantity = 0n
  let valueCents = 0n
  for (const movement of movements) {
    const delta = quantityToThousandths(movement.quantityDelta)
    if (delta === null) throw new Error('Movimentação com quantidade inválida.')
    const allocatedCost = moneyToCents(movement.allocatedCost ?? null)
    if (delta >= 0n) {
      quantity += delta
      const unitCost = unitCostToMillis(movement.unitCost)
      if (allocatedCost !== null) valueCents += allocatedCost
      else if (unitCost !== null)
        valueCents += calculateUnitCostCents(unitCost, delta)
      continue
    }
    const outgoing = -delta
    const providedCost = unitCostToMillis(movement.unitCost)
    const average =
      quantity > 0n ? (valueCents * 10_000n + quantity / 2n) / quantity : 0n
    const unitCost = providedCost ?? average
    valueCents -= allocatedCost ?? calculateUnitCostCents(unitCost, outgoing)
    quantity -= outgoing
  }
  const unitCost =
    quantity > 0n ? (valueCents * 10_000n + quantity / 2n) / quantity : 0n
  return { quantity, valueCents: quantity > 0n ? valueCents : 0n, unitCost }
}

/**
 * Reconstitui o custo médio ponderado perpétuo. Saídas sem custo usam a média
 * disponível naquele instante; novas conclusões sempre gravam o custo usado.
 */
export function calculateWeightedAverageCost(movements: CostedMovement[]) {
  return calculateInventoryState(movements).unitCost
}

/** Shared completion guards keep the UI preview and the transaction rules aligned. */
export function assertCompletableBatchStatus(status: string) {
  if (status !== 'draft')
    throw new Error('Somente lotes em rascunho podem ser concluídos uma vez.')
}

export function assertLossReasons(
  losses: Array<{ quantity: string; reason: string }>,
) {
  for (const loss of losses) {
    if ((quantityToThousandths(loss.quantity) ?? 0n) <= 0n)
      throw new Error('Quantidade de perda inválida.')
    if (loss.reason.trim().length < 3)
      throw new Error('Toda perda manual exige motivo.')
  }
}

export function assertSufficientStock(
  items: Array<{ name: string; available: bigint; required: bigint }>,
) {
  const insufficient = items.filter((item) => item.available < item.required)
  if (insufficient.length) {
    throw new Error(
      `Estoque insuficiente: ${insufficient
        .map(
          (item) =>
            `${item.name} (${thousandthsToQuantity(item.available)} disponível; ${thousandthsToQuantity(item.required)} necessário)`,
        )
        .join(', ')}.`,
    )
  }
}
