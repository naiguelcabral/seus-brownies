const saoPaulo = 'America/Sao_Paulo'

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: saoPaulo }).format(new Date(value))
}

/** Date-only database fields are calendar values, not instants. */
export function formatDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: saoPaulo }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}
