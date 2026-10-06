const wholeNumber = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
  useGrouping: true,
})

/** Formats the server's exact decimal money representation without using Number. */
export function formatBrlMoney(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value)
  if (!match) throw new Error('Valor monetário inválido para exibição.')

  const [, sign, whole, fraction = ''] = match
  const cents = fraction.padEnd(2, '0')
  const isNegative = sign === '-' && (BigInt(whole) !== 0n || cents !== '00')

  return `${isNegative ? '-' : ''}R$ ${wholeNumber.format(BigInt(whole))},${cents}`
}
