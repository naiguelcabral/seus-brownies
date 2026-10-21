import { z } from 'zod'
import { exactCost, scaleCost, sumCosts, subtractCosts } from '#/lib/exact-cost'
import type { ExactCost } from '#/lib/exact-cost'
import { quantityToThousandths, thousandthsToQuantity } from './calculations'

const weight = z.string().refine((value) => {
  const parsed = quantityToThousandths(value)
  return parsed !== null && parsed > 0n
})
const recoveryConfig = z.object({
  mode: z.literal('weighed'),
  operationalInput: z.literal('batch_totals').optional(),
  bakedWeightGrams: weight,
  packWeightGrams: weight,
})

export function readRecoveryConfig(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('recovery' in payload))
    return null
  return recoveryConfig.parse(payload.recovery)
}

export function calculateRecovery(
  config: z.infer<typeof recoveryConfig>,
  multiplier: bigint,
  measuredGrams: string | undefined,
) {
  const perRecipe = quantityToThousandths(config.bakedWeightGrams)
  const pack = quantityToThousandths(config.packWeightGrams)
  if (perRecipe === null || pack === null)
    throw new Error('Configuração de peso inválida.')
  const total = (perRecipe * multiplier) / 1000n
  const recovered =
    measuredGrams === undefined ? null : quantityToThousandths(measuredGrams)
  if (recovered === null || recovered < 0n || recovered >= total)
    throw new Error(
      'Informe o peso das bordas aproveitáveis, de zero até menos que a massa fria do lote.',
    )
  return {
    totalMass: total,
    packagedMass: (recovered / pack) * pack,
    packages: (recovered / pack) * 1000n,
    measuredGrams: thousandthsToQuantity(recovered),
    unpackagedGrams: thousandthsToQuantity(recovered % pack),
  }
}

/** Shared recipe cost follows mass; each product keeps its own finishing costs. */
export function allocateRecoveryCosts(input: {
  sharedCost: ExactCost
  directCosts: Map<number, ExactCost>
  primary: Array<{ productId: number; quantity: bigint; expectedYield: bigint }>
  coProductId: number
  totalMass: bigint
  packagedMass: bigint
}) {
  const weights = input.primary.map((row) => ({
    productId: row.productId,
    weight: exactCost(row.quantity, row.expectedYield),
  }))
  const totalWeight = sumCosts(weights.map((row) => row.weight))
  const coProductCost = scaleCost(
    input.sharedCost,
    input.packagedMass,
    input.totalMass,
  )
  const primaryCost = subtractCosts(input.sharedCost, coProductCost)
  const costs = new Map<number, ExactCost>()
  for (const row of weights) {
    const shared = scaleCost(
      primaryCost,
      BigInt(row.weight.numerator) * BigInt(totalWeight.denominator),
      BigInt(row.weight.denominator) * BigInt(totalWeight.numerator),
    )
    costs.set(
      row.productId,
      sumCosts([shared, input.directCosts.get(row.productId) ?? exactCost(0n)]),
    )
  }
  if (input.packagedMass > 0n)
    costs.set(
      input.coProductId,
      sumCosts([
        coProductCost,
        input.directCosts.get(input.coProductId) ?? exactCost(0n),
      ]),
    )
  return costs
}
