export const revenueAuditStatuses = ['normal', 'attention', 'critical'] as const

export type RevenueAuditStatus = (typeof revenueAuditStatuses)[number]

function absolute(value: bigint) {
  return value < 0n ? -value : value
}

export function classifyRevenueDifference(input: {
  reportedCents: bigint
  calculatedCents: bigint
  normalTolerance: bigint
  criticalTolerance: bigint
}) {
  if (input.calculatedCents <= 0n)
    throw new Error('Faturamento calculado deve ser positivo.')
  if (
    input.normalTolerance < 0n ||
    input.criticalTolerance < 0n ||
    input.normalTolerance > 10_000n ||
    input.criticalTolerance > 10_000n ||
    input.normalTolerance >= input.criticalTolerance
  ) {
    throw new Error('Tolerâncias de auditoria inválidas.')
  }
  const differenceCents = input.reportedCents - input.calculatedCents
  const scaledDifference = absolute(differenceCents) * 10_000n
  const normalLimit = input.calculatedCents * input.normalTolerance
  const criticalLimit = input.calculatedCents * input.criticalTolerance
  const status: RevenueAuditStatus =
    scaledDifference <= normalLimit
      ? 'normal'
      : scaledDifference <= criticalLimit
        ? 'attention'
        : 'critical'
  return { differenceCents, status }
}

/** Allocates reported revenue across items and preserves the exact sale total. */
export function allocateReportedRevenue(
  calculatedItemCents: bigint[],
  reportedCents: bigint,
) {
  if (reportedCents < 0n)
    throw new Error('Faturamento informado não pode ser negativo.')
  const calculatedTotal = calculatedItemCents.reduce((sum, value) => {
    if (value <= 0n) throw new Error('Item de venda sem valor calculado.')
    return sum + value
  }, 0n)
  if (calculatedTotal <= 0n) throw new Error('Venda sem valor calculado.')
  const shares = calculatedItemCents.map((value, index) => {
    const numerator = reportedCents * value
    return {
      index,
      base: numerator / calculatedTotal,
      remainder: numerator % calculatedTotal,
    }
  })
  const remainder =
    reportedCents - shares.reduce((sum, share) => sum + share.base, 0n)
  const recipients = new Set(
    [...shares]
      .sort((left, right) =>
        right.remainder === left.remainder
          ? left.index - right.index
          : right.remainder > left.remainder
            ? 1
            : -1,
      )
      .slice(0, Number(remainder))
      .map((share) => share.index),
  )
  return shares.map(
    (share) => share.base + (recipients.has(share.index) ? 1n : 0n),
  )
}
