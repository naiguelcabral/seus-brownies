/** Exact costs in reais. Integer fractions preserve repeating divisions as well. */
export type ExactCost = { numerator: string; denominator: string }

export function exactCost(numerator: bigint, denominator = 1n): ExactCost {
  if (denominator <= 0n) throw new Error('Denominador de custo inválido.')
  let a = numerator < 0n ? -numerator : numerator
  let b = denominator
  while (b) [a, b] = [b, a % b]
  const divisor = a || 1n
  return {
    numerator: String(numerator / divisor),
    denominator: String(denominator / divisor),
  }
}

export function readExactCost(value: ExactCost): ExactCost {
  if (!/^-?\d+$/.test(value.numerator) || !/^\d+$/.test(value.denominator))
    throw new Error('Custo exato inválido.')
  return exactCost(BigInt(value.numerator), BigInt(value.denominator))
}

export function decimalCost(value: string): ExactCost {
  if (!/^-?\d+(?:\.\d+)?$/.test(value))
    throw new Error('Custo decimal inválido.')
  const negative = value.startsWith('-')
  const [whole = '0', fraction = ''] = (
    negative ? value.slice(1) : value
  ).split('.')
  return exactCost(
    BigInt(whole + fraction) * (negative ? -1n : 1n),
    10n ** BigInt(fraction.length),
  )
}

export function addCosts(left: ExactCost, right: ExactCost): ExactCost {
  const a = readExactCost(left)
  const b = readExactCost(right)
  return exactCost(
    BigInt(a.numerator) * BigInt(b.denominator) +
      BigInt(b.numerator) * BigInt(a.denominator),
    BigInt(a.denominator) * BigInt(b.denominator),
  )
}

export function scaleCost(
  value: ExactCost,
  numerator: bigint,
  denominator = 1n,
): ExactCost {
  const cost = readExactCost(value)
  return exactCost(
    BigInt(cost.numerator) * numerator,
    BigInt(cost.denominator) * denominator,
  )
}

export function subtractCosts(left: ExactCost, right: ExactCost): ExactCost {
  return addCosts(left, scaleCost(right, -1n))
}

export function sumCosts(values: ExactCost[]): ExactCost {
  return values.reduce(addCosts, exactCost(0n))
}

/** Projection for the existing cent-based views only; never feed it back into exact costs. */
export function displayCostCents(value: ExactCost): bigint {
  const cost = readExactCost(value)
  const numerator = BigInt(cost.numerator)
  const denominator = BigInt(cost.denominator)
  const absolute = numerator < 0n ? -numerator : numerator
  const cents = (absolute * 200n + denominator) / (denominator * 2n)
  return numerator < 0n ? -cents : cents
}

export function displayCostMoney(value: ExactCost): string {
  const cents = displayCostCents(value)
  const absolute = cents < 0n ? -cents : cents
  return `${cents < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

export function costOrDecimal(
  value: ExactCost | null | undefined,
  fallback: string,
): ExactCost {
  return value == null ? decimalCost(fallback) : readExactCost(value)
}
