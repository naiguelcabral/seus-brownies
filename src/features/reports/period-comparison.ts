import {
  centsToMoney,
  moneyToCents,
  quantityToThousandths,
  thousandthsToQuantity,
} from '#/features/production/calculations'

type OperationalTotals = {
  revenue: string
  units: string
  ticketAverage: string | null
}

const DAY_MS = 24 * 60 * 60 * 1_000

/** Adjacent UTC date ranges have the same inclusive number of calendar days. */
export function previousEqualLengthPeriod(start: string, end: string) {
  const startAt = new Date(`${start}T00:00:00.000Z`)
  const endAt = new Date(`${end}T00:00:00.000Z`)
  const days = Math.round((endAt.getTime() - startAt.getTime()) / DAY_MS) + 1
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('Período inválido para comparação.')
  }
  return {
    start: new Date(startAt.getTime() - days * DAY_MS)
      .toISOString()
      .slice(0, 10),
    end: new Date(startAt.getTime() - DAY_MS).toISOString().slice(0, 10),
  }
}

/** Compares operational sales dates; financial accrual is a separate report. */
export function compareOperationalTotals(
  current: OperationalTotals,
  previous: OperationalTotals,
) {
  const currentRevenue = moneyToCents(current.revenue)
  const previousRevenue = moneyToCents(previous.revenue)
  const currentUnits = quantityToThousandths(current.units)
  const previousUnits = quantityToThousandths(previous.units)
  if (
    currentRevenue === null ||
    previousRevenue === null ||
    currentUnits === null ||
    previousUnits === null
  ) {
    throw new Error('Indicador operacional inválido para comparação.')
  }
  const currentTicket = moneyToCents(current.ticketAverage)
  const previousTicket = moneyToCents(previous.ticketAverage)
  return {
    revenue: {
      current: current.revenue,
      previous: previous.revenue,
      difference: centsToMoney(currentRevenue - previousRevenue),
    },
    units: {
      current: current.units,
      previous: previous.units,
      difference: thousandthsToQuantity(currentUnits - previousUnits),
    },
    ticketAverage: {
      current: current.ticketAverage,
      previous: previous.ticketAverage,
      difference:
        currentTicket === null || previousTicket === null
          ? null
          : centsToMoney(currentTicket - previousTicket),
    },
  }
}
