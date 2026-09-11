import type { AppRole } from '#/features/auth/authorization'
import { centsToMoney, moneyToCents } from '#/features/production/calculations'

const RATE_SCALE = 10_000n

export type FinancialIndicatorInput = {
  grossRevenue: string[]
  refunds: string[]
  storeCreditsIssued: string[]
  cogs: string[]
  variableExpenses: string[]
  fixedCosts: string[]
  feeTaxReserve: string[]
  cashReceipts: string[]
  cashRefunds: string[]
  cashPayments: string[]
}

function sumMoney(values: string[]) {
  return values.reduce((total, value) => {
    const cents = moneyToCents(value)
    if (cents === null) throw new Error('Valor monetário inválido.')
    return total + cents
  }, 0n)
}

/** Direct production energy/labor is already embedded in FIFO COGS. */
export function summarizeFinancialIndicators(input: FinancialIndicatorInput) {
  const grossRevenue = sumMoney(input.grossRevenue)
  const refunds = sumMoney(input.refunds)
  const storeCreditsIssued = sumMoney(input.storeCreditsIssued)
  const cogs = sumMoney(input.cogs)
  const variableExpenses = sumMoney(input.variableExpenses)
  const fixedCosts = sumMoney(input.fixedCosts)
  const feeTaxReserve = sumMoney(input.feeTaxReserve)
  const netRevenue = grossRevenue - refunds - storeCreditsIssued
  const grossMargin = netRevenue - cogs
  const contributionMargin = grossMargin - variableExpenses
  const managerialProfit = contributionMargin - fixedCosts - feeTaxReserve
  const cashFlow =
    sumMoney(input.cashReceipts) -
    sumMoney(input.cashRefunds) -
    sumMoney(input.cashPayments)

  return {
    grossRevenue: centsToMoney(grossRevenue),
    refunds: centsToMoney(refunds),
    storeCreditsIssued: centsToMoney(storeCreditsIssued),
    netRevenue: centsToMoney(netRevenue),
    cogs: centsToMoney(cogs),
    grossMargin: centsToMoney(grossMargin),
    contributionMargin: centsToMoney(contributionMargin),
    managerialProfit: centsToMoney(managerialProfit),
    cashFlow: centsToMoney(cashFlow),
  }
}

function parseWeight(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized))
    throw new Error('Peso do mix inválido.')
  const [whole, fraction = ''] = normalized.split('.')
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'))
}

function formatRate(value: bigint) {
  return `${value / RATE_SCALE}.${String(value % RATE_SCALE).padStart(4, '0')}`
}

/** Proportional largest-remainder normalization, stable by product id. */
export function normalizeSalesMix(
  rows: Array<{ productId: number; weight: string }>,
) {
  if (!rows.length) throw new Error('Informe ao menos um produto no mix.')
  if (new Set(rows.map((row) => row.productId)).size !== rows.length)
    throw new Error('O mix não pode repetir produto.')
  const parsed = rows.map((row) => ({ ...row, units: parseWeight(row.weight) }))
  if (parsed.some((row) => row.units <= 0n))
    throw new Error('Todos os pesos do mix devem ser positivos.')
  const total = parsed.reduce((sum, row) => sum + row.units, 0n)
  const shares = parsed.map((row) => {
    const numerator = row.units * RATE_SCALE
    return {
      productId: row.productId,
      units: numerator / total,
      remainder: numerator % total,
    }
  })
  let residue = RATE_SCALE - shares.reduce((sum, row) => sum + row.units, 0n)
  for (const row of [...shares].sort((left, right) => {
    if (left.remainder === right.remainder)
      return left.productId - right.productId
    return left.remainder > right.remainder ? -1 : 1
  })) {
    if (residue === 0n) break
    row.units += 1n
    residue -= 1n
  }
  return shares
    .sort((left, right) => left.productId - right.productId)
    .map(({ productId, units }) => ({
      productId,
      weight: formatRate(units),
    }))
}

export function canCorrectClosedFinancialPeriod(role: AppRole) {
  return role === 'owner'
}

export function inventoryEffectForSaleLifecycle(input: {
  event: 'cancellation' | 'return'
  deliveredAt: Date | null
}) {
  if (input.event === 'cancellation') {
    if (input.deliveredAt)
      throw new Error('Venda entregue deve usar devolução, não cancelamento.')
    return 'restore_fifo' as const
  }
  if (!input.deliveredAt)
    throw new Error('Devolução exige venda previamente entregue.')
  return 'no_vendable_stock_return' as const
}

export function calculateCompensationAmount(input: {
  itemAmount: string
  itemQuantity: string
  priorCompensatedAmount: string
  priorCompensatedQuantity: string
  requestedQuantity: string
}) {
  const itemAmount = moneyToCents(input.itemAmount)
  const priorAmount = moneyToCents(input.priorCompensatedAmount)
  const itemQuantity = parseQuantity(input.itemQuantity)
  const priorQuantity = parseQuantity(input.priorCompensatedQuantity)
  const requestedQuantity = parseQuantity(input.requestedQuantity)
  if (
    itemAmount === null ||
    priorAmount === null ||
    itemQuantity <= 0n ||
    requestedQuantity <= 0n ||
    priorQuantity < 0n ||
    priorQuantity + requestedQuantity > itemQuantity
  )
    throw new Error('Quantidade de compensação excede o item entregue.')

  const cumulativeQuantity = priorQuantity + requestedQuantity
  const cumulativeAmount =
    (itemAmount * cumulativeQuantity + itemQuantity / 2n) / itemQuantity
  const amount = cumulativeAmount - priorAmount
  if (amount <= 0n) throw new Error('Valor de compensação inválido.')
  return centsToMoney(amount)
}

function parseQuantity(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized))
    throw new Error('Quantidade de compensação inválida.')
  const [whole, fraction = ''] = normalized.split('.')
  return BigInt(whole) * 1_000n + BigInt(fraction.padEnd(3, '0'))
}
