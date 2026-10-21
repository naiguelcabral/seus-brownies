import { requireDefined } from '../../lib/required-value'

/** Calendar month used by the business; date-only bounds are half-open. */
export function dashboardMonth(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  const year = requireDefined(parts.find((part) => part.type === 'year')).value
  const month = requireDefined(
    parts.find((part) => part.type === 'month'),
  ).value
  return {
    start: `${year}-${month}-01`,
    end: new Date(Date.UTC(Number(year), Number(month), 1))
      .toISOString()
      .slice(0, 10),
  }
}
