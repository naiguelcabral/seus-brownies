const businessTimeZone = 'America/Sao_Paulo'

/** Calendar date used by operational forms; UTC rolls over three hours too early. */
export function businessDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: businessTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Inclusive first and last calendar day of the current business month. */
export function businessMonth(now = new Date()) {
  const today = businessDate(now)
  const [year, month] = today.split('-').map(Number)
  return {
    start: `${today.slice(0, 7)}-01`,
    end: new Date(Date.UTC(Number(year), Number(month), 0))
      .toISOString()
      .slice(0, 10),
  }
}

function businessUtcOffset(date: string) {
  const noon = new Date(`${date}T12:00:00.000Z`)
  if (Number.isNaN(noon.getTime())) throw new Error('Data inválida.')
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: businessTimeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(noon)
    .find((part) => part.type === 'timeZoneName')?.value
  const offset = name?.replace(/^GMT/, '')
  if (!offset || !/^[+-]\d{2}:\d{2}$/.test(offset))
    throw new Error('Fuso operacional indisponível.')
  return offset
}

/** First instant of a business calendar day (`YYYY-MM-DD`), for timestamp filters. */
export function businessDayStart(date: string) {
  return new Date(`${date}T00:00:00.000${businessUtcOffset(date)}`)
}

/** Exclusive end of a business calendar day: the first instant of the next one. */
export function businessDayEnd(date: string) {
  const next = new Date(`${date}T00:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return businessDayStart(next.toISOString().slice(0, 10))
}
