import {
  centsToMoney,
  moneyToCents,
  quantityToThousandths,
  thousandthsToQuantity,
} from '#/features/production/calculations'

export type SaleMetricRow = {
  saleId: number
  locationId: number | null
  locationName: string | null
  amount: string
  reportedAmount: string | null
  calculatedAmount: string | null
  auditStatus: string | null
}

export type SaleUnitRow = { saleId: number; quantity: string }

function divideRounded(dividend: bigint, divisor: bigint) {
  if (divisor <= 0n) return null
  return (dividend + divisor / 2n) / divisor
}

function rateString(numerator: bigint, denominator: bigint) {
  if (denominator === 0n) return null
  const negative = numerator < 0n
  const absolute = negative ? -numerator : numerator
  const scaled = divideRounded(absolute * 10_000n, denominator) ?? 0n
  return `${negative ? '-' : ''}${scaled / 10_000n}.${String(scaled % 10_000n).padStart(4, '0')}`
}

function compareBigintsDescending(left: bigint, right: bigint) {
  if (left === right) return 0
  return left > right ? -1 : 1
}

export function summarizeSalesMetrics(
  sales: SaleMetricRow[],
  units: SaleUnitRow[],
) {
  const unitsBySale = new Map<number, bigint>()
  for (const row of units) {
    unitsBySale.set(
      row.saleId,
      (unitsBySale.get(row.saleId) ?? 0n) +
        (quantityToThousandths(row.quantity) ?? 0n),
    )
  }

  type Accumulator = {
    locationId: number | null
    locationName: string
    events: number
    units: bigint
    revenue: bigint
    auditedEvents: number
    reported: bigint
    calculated: bigint
    normal: number
    attention: number
    critical: number
  }
  const create = (
    locationId: number | null,
    locationName: string,
  ): Accumulator => ({
    locationId,
    locationName,
    events: 0,
    units: 0n,
    revenue: 0n,
    auditedEvents: 0,
    reported: 0n,
    calculated: 0n,
    normal: 0,
    attention: 0,
    critical: 0,
  })
  const total = create(null, 'Todos os locais')
  const byLocation = new Map<string, Accumulator>()

  for (const row of sales) {
    const key = row.locationId === null ? 'unassigned' : String(row.locationId)
    const location =
      byLocation.get(key) ??
      create(row.locationId, row.locationName ?? 'Sem local informado')
    byLocation.set(key, location)
    const revenue = moneyToCents(row.amount) ?? 0n
    const saleUnits = unitsBySale.get(row.saleId) ?? 0n
    for (const target of [total, location]) {
      target.events += 1
      target.revenue += revenue
      target.units += saleUnits
      if (row.reportedAmount !== null && row.calculatedAmount !== null) {
        target.auditedEvents += 1
        target.reported += moneyToCents(row.reportedAmount) ?? 0n
        target.calculated += moneyToCents(row.calculatedAmount) ?? 0n
        if (row.auditStatus === 'normal') target.normal += 1
        if (row.auditStatus === 'attention') target.attention += 1
        if (row.auditStatus === 'critical') target.critical += 1
      }
    }
  }

  const result = (value: Accumulator) => {
    const difference = value.reported - value.calculated
    const ticketCents = divideRounded(value.revenue, BigInt(value.events))
    const averageUnitPriceCents = divideRounded(
      value.revenue * 1_000n,
      value.units,
    )
    return {
      locationId: value.locationId,
      locationName: value.locationName,
      events: value.events,
      units: thousandthsToQuantity(value.units),
      revenue: centsToMoney(value.revenue),
      ticketAverage: ticketCents === null ? null : centsToMoney(ticketCents),
      averageUnitPrice:
        averageUnitPriceCents === null
          ? null
          : centsToMoney(averageUnitPriceCents),
      audit: {
        auditedEvents: value.auditedEvents,
        reported:
          value.auditedEvents === 0 ? null : centsToMoney(value.reported),
        calculated:
          value.auditedEvents === 0 ? null : centsToMoney(value.calculated),
        difference: value.auditedEvents === 0 ? null : centsToMoney(difference),
        differenceRate:
          value.auditedEvents === 0
            ? null
            : rateString(difference, value.calculated),
        normal: value.normal,
        attention: value.attention,
        critical: value.critical,
      },
    }
  }

  return {
    total: result(total),
    byLocation: [...byLocation.values()]
      .sort(
        (left, right) =>
          compareBigintsDescending(left.revenue, right.revenue) ||
          left.locationName.localeCompare(right.locationName, 'pt-BR'),
      )
      .map(result),
  }
}
