import {
  centsToMoney,
  moneyToCents,
  unitCostToMillis,
} from '#/features/production/calculations'
import { normalizeSalesMix } from '#/features/finance/policy'
import type { ScenarioDraftInput } from '#/features/scenarios/contracts'

const RATE_SCALE = 10_000n
const WEIGHT_SCALE = 1_000_000n

type ProductState = {
  id: number
  name: string
  type: string
  isActive: boolean
}

export type NormalizedScenarioMix = {
  productId: number
  originalWeight: string
  normalizedWeightBps: number
  plannedUnitPrice: string
  plannedUnitCost: string
}

function unsignedDecimal(value: string, scale: number) {
  const normalized = value.trim().replace(',', '.')
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized)
  if (!match) return null
  const [, whole, fraction = ''] = match
  if (fraction.length > scale) return null
  return (
    BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0'))
  )
}

function formatScaled(value: bigint, scale: number) {
  const factor = 10n ** BigInt(scale)
  return `${value / factor}.${String(value % factor).padStart(scale, '0')}`
}

function roundHalfUp(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n) throw new Error('Divisor inválido na projeção.')
  return (numerator + denominator / 2n) / denominator
}

function ceilDiv(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n)
    throw new Error('Contribuição unitária insuficiente para a meta.')
  return numerator === 0n ? 0n : (numerator + denominator - 1n) / denominator
}

function allocateExact<T extends { productId: number }>(
  total: bigint,
  rows: T[],
  weightFor: (row: T) => bigint,
) {
  const totalWeight = rows.reduce((sum, row) => sum + weightFor(row), 0n)
  if (totalWeight <= 0n) throw new Error('A base de rateio deve ser positiva.')
  const shares = rows.map((row) => {
    const numerator = total * weightFor(row)
    return {
      productId: row.productId,
      value: numerator / totalWeight,
      remainder: numerator % totalWeight,
    }
  })
  let residue = total - shares.reduce((sum, row) => sum + row.value, 0n)
  for (const row of [...shares].sort((left, right) => {
    if (left.remainder === right.remainder)
      return left.productId - right.productId
    return left.remainder > right.remainder ? -1 : 1
  })) {
    if (residue === 0n) break
    row.value += 1n
    residue -= 1n
  }
  return new Map(shares.map((row) => [row.productId, row.value]))
}

export function normalizeScenarioMix(mix: ScenarioDraftInput['mix']): {
  rows: NormalizedScenarioMix[]
  originalTotal: string
  wasNormalized: boolean
} {
  const normalized = normalizeSalesMix(
    mix.map((row) => ({
      productId: row.productId,
      weight: row.originalWeight,
    })),
  )
  const normalizedByProduct = new Map(
    normalized.map((row) => [
      row.productId,
      Number(BigInt(row.weight.replace('.', ''))),
    ]),
  )
  const rows = mix
    .map((row) => {
      const original = unsignedDecimal(row.originalWeight, 6)
      if (original === null || original <= 0n)
        throw new Error('Peso original inválido.')
      const normalizedWeightBps = normalizedByProduct.get(row.productId)
      if (normalizedWeightBps === undefined)
        throw new Error('Falha ao normalizar o mix.')
      const price = moneyToCents(row.plannedUnitPrice)
      const cost = unitCostToMillis(row.plannedUnitCost)
      if (price === null || price <= 0n || cost === null || cost < 0n)
        throw new Error('Preço ou custo planejado inválido.')
      return {
        productId: row.productId,
        originalWeight: formatScaled(original, 6),
        normalizedWeightBps,
        plannedUnitPrice: centsToMoney(price),
        plannedUnitCost: formatScaled(cost, 3),
      }
    })
    .sort((left, right) => left.productId - right.productId)
  const originalTotalUnits = rows.reduce(
    (sum, row) => sum + unsignedDecimal(row.originalWeight, 6)!,
    0n,
  )
  const normalizedTotal = rows.reduce(
    (sum, row) => sum + BigInt(row.normalizedWeightBps),
    0n,
  )
  if (normalizedTotal !== RATE_SCALE)
    throw new Error('O mix normalizado não fecha exatamente em 100%.')
  return {
    rows,
    originalTotal: formatScaled(originalTotalUnits, 6),
    wasNormalized: originalTotalUnits !== WEIGHT_SCALE,
  }
}

export function validateScenarioActivation(
  draft: ScenarioDraftInput,
  products: ProductState[],
) {
  if (!draft.mix.length)
    throw new Error('Informe ao menos um produto antes de ativar o cenário.')
  const productsById = new Map(products.map((product) => [product.id, product]))
  for (const item of draft.mix) {
    const product = productsById.get(item.productId)
    if (!product)
      throw new Error(`Produto ${item.productId} não encontrado no catálogo.`)
    if (!product.isActive)
      throw new Error(`O produto ${product.name} está inativo.`)
    if (product.type !== 'finished_product')
      throw new Error(`O produto ${product.name} não é um produto final.`)
  }
  return normalizeScenarioMix(draft.mix)
}

function parseRateBps(value: string) {
  const parsed = unsignedDecimal(value, 4)
  if (parsed === null || parsed > RATE_SCALE)
    throw new Error('Percentual inválido na projeção.')
  return parsed
}

function compareSigned(left: bigint, right: bigint) {
  if (left === right) return 0
  return left < right ? -1 : 1
}

export function calculateScenarioProjection(
  draft: ScenarioDraftInput,
  products: ProductState[],
) {
  if (!draft.mix.length)
    throw new Error('Informe ao menos um produto para calcular a projeção.')
  const normalized = normalizeScenarioMix(draft.mix)
  const productById = new Map(products.map((product) => [product.id, product]))
  for (const item of draft.mix) {
    const product = productById.get(item.productId)
    if (!product)
      throw new Error(`Produto ${item.productId} não encontrado no catálogo.`)
    if (product.type !== 'finished_product')
      throw new Error(`O produto ${product.name} não é um produto final.`)
  }
  const targetProfit = moneyToCents(draft.monthlyProfitGoal)
  const fixedCosts = moneyToCents(draft.fixedMonthlyCosts)
  const weeksHundredths = unsignedDecimal(draft.weeksPerMonth, 2)
  const minimumMarginBps = parseRateBps(draft.minimumMarginRate)
  const feeTaxReserveBps = parseRateBps(draft.feeTaxReserveRate)
  if (
    targetProfit === null ||
    targetProfit <= 0n ||
    fixedCosts === null ||
    fixedCosts < 0n ||
    weeksHundredths === null ||
    weeksHundredths < 100n ||
    weeksHundredths > 600n
  )
    throw new Error('Premissas financeiras inválidas para a projeção.')

  const marginNeeded = targetProfit + fixedCosts
  const targetByProduct = allocateExact(marginNeeded, normalized.rows, (row) =>
    BigInt(row.normalizedWeightBps),
  )
  const lines = normalized.rows.map((row) => {
    const priceCents = moneyToCents(row.plannedUnitPrice)!
    const priceMillis = priceCents * 10n
    const costMillis = unitCostToMillis(row.plannedUnitCost)!
    const grossUnitMarginMillis = priceMillis - costMillis
    const effectiveContributionNumerator =
      grossUnitMarginMillis * RATE_SCALE - priceMillis * feeTaxReserveBps
    if (effectiveContributionNumerator <= 0n)
      throw new Error(
        `O produto ${productById.get(row.productId)!.name} não possui contribuição positiva após a reserva.`,
      )
    const targetContribution = targetByProduct.get(row.productId) ?? 0n
    const quantity = ceilDiv(
      targetContribution * 10n * RATE_SCALE,
      effectiveContributionNumerator,
    )
    const revenue = priceCents * quantity
    const cost = roundHalfUp(costMillis * quantity, 10n)
    const grossMargin = revenue - cost
    const unitMarginBps =
      grossUnitMarginMillis <= 0n
        ? (grossUnitMarginMillis * RATE_SCALE) / priceMillis
        : roundHalfUp(grossUnitMarginMillis * RATE_SCALE, priceMillis)
    return {
      productId: row.productId,
      productName: productById.get(row.productId)!.name,
      originalWeight: row.originalWeight,
      normalizedWeightBps: row.normalizedWeightBps,
      plannedUnitPrice: row.plannedUnitPrice,
      plannedUnitCost: row.plannedUnitCost,
      targetContribution,
      quantity,
      weeklyQuantity: ceilDiv(quantity * 100n, weeksHundredths),
      revenue,
      cost,
      grossMargin,
      unitMarginBps,
      belowMinimumMargin: compareSigned(unitMarginBps, minimumMarginBps) < 0,
    }
  })

  const targetRevenue = lines.reduce((sum, line) => sum + line.revenue, 0n)
  const projectedCost = lines.reduce((sum, line) => sum + line.cost, 0n)
  const mixGeneratedProfit = targetRevenue - projectedCost
  const feeTaxReserve = roundHalfUp(
    targetRevenue * feeTaxReserveBps,
    RATE_SCALE,
  )
  const reserveByProduct = allocateExact(
    feeTaxReserve,
    lines,
    (line) => line.revenue,
  )
  const projectedManagerialProfit =
    mixGeneratedProfit - fixedCosts - feeTaxReserve
  const unitsPerMonth = lines.reduce((sum, line) => sum + line.quantity, 0n)
  const unitsPerWeek = lines.reduce(
    (sum, line) => sum + line.weeklyQuantity,
    0n,
  )

  return {
    kind: 'projection' as const,
    label: 'Estimativa baseada nas premissas da versão do cenário',
    originalMixTotal: normalized.originalTotal,
    mixWasNormalized: normalized.wasNormalized,
    normalizedMixTotalBps: 10_000,
    marginNeededBeforeFixedCosts: centsToMoney(marginNeeded),
    targetRevenue: centsToMoney(targetRevenue),
    mixGeneratedProfit: centsToMoney(mixGeneratedProfit),
    feeTaxReserve: centsToMoney(feeTaxReserve),
    projectedManagerialProfit: centsToMoney(projectedManagerialProfit),
    gapToTarget: centsToMoney(projectedManagerialProfit - targetProfit),
    unitsPerMonth: unitsPerMonth.toString(),
    unitsPerWeek: unitsPerWeek.toString(),
    targetAverageTicket:
      unitsPerMonth === 0n
        ? null
        : centsToMoney(roundHalfUp(targetRevenue, unitsPerMonth)),
    targetAverageTicketBasis: 'por unidade planejada' as const,
    productLines: lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      originalWeight: line.originalWeight,
      normalizedWeightBps: line.normalizedWeightBps,
      plannedUnitPrice: line.plannedUnitPrice,
      plannedUnitCost: line.plannedUnitCost,
      quantityPerMonth: line.quantity.toString(),
      quantityPerWeek: line.weeklyQuantity.toString(),
      projectedRevenue: centsToMoney(line.revenue),
      projectedMargin: centsToMoney(line.grossMargin),
      projectedFeeTaxReserve: centsToMoney(
        reserveByProduct.get(line.productId) ?? 0n,
      ),
      projectedMarginBps: line.unitMarginBps.toString(),
      belowMinimumMargin: line.belowMinimumMargin,
    })),
    pendingAssumptions: [
      'Despesas variáveis fora da reserva de taxas e impostos não estão classificadas neste cenário.',
    ],
  }
}

export type RealizedScenarioInput = {
  netRevenue: string
  cogs: string
  grossMargin: string
  byProduct: Array<{
    productId: number | null
    productName: string
    revenue: string
    grossMargin: string
  }>
}

export type ScenarioProjection = ReturnType<typeof calculateScenarioProjection>

export function compareProjectionWithRealized(
  projection: ReturnType<typeof calculateScenarioProjection>,
  realized?: RealizedScenarioInput | null,
) {
  if (!realized)
    return {
      kind: 'realized' as const,
      status: 'missing' as const,
      message: 'Não há dados históricos realizados disponíveis para o período.',
      managerialProfit: {
        status: 'pending_decision' as const,
        message:
          'Lucro gerencial realizado aguarda classificação homologada das despesas variáveis e fixas.',
      },
      productLines: [],
    }

  const actualByProduct = new Map(
    realized.byProduct.flatMap((row) =>
      row.productId === null ? [] : [[row.productId, row] as const],
    ),
  )
  return {
    kind: 'realized' as const,
    status: 'available' as const,
    message: 'Resultado por competência com CMV FIFO realizado.',
    netRevenue: realized.netRevenue,
    cogs: realized.cogs,
    grossMargin: realized.grossMargin,
    managerialProfit: {
      status: 'pending_decision' as const,
      message:
        'Lucro gerencial realizado aguarda classificação homologada das despesas variáveis e fixas.',
    },
    productLines: projection.productLines.map((planned) => {
      const actual = actualByProduct.get(planned.productId)
      return {
        productId: planned.productId,
        productName: planned.productName,
        plannedRevenue: planned.projectedRevenue,
        plannedMargin: planned.projectedMargin,
        realizedRevenue: actual?.revenue ?? null,
        realizedMargin: actual?.grossMargin ?? null,
        status: actual ? ('available' as const) : ('missing' as const),
      }
    }),
  }
}

export type ScenarioRealizedComparison = ReturnType<
  typeof compareProjectionWithRealized
>
