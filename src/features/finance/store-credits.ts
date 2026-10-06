import { centsToMoney, moneyToCents } from '#/features/production/calculations'

export type StoreCreditLedgerEvent = {
  id: number
  type: 'store_credit_issued' | 'store_credit_redeemed'
  settlesEventId: number | null
  saleId: number | null
  saleItemId: number | null
  amount: string
  occurredAt: Date
  reason: string
}

function positiveMoney(value: string) {
  const cents = moneyToCents(value)
  if (cents === null || cents <= 0n)
    throw new Error('Crédito possui valor monetário inválido.')
  return cents
}

export function calculateStoreCreditBalance(input: {
  issuedAmount: string
  redeemedAmounts: string[]
  requestedAmount?: string
}) {
  const issued = positiveMoney(input.issuedAmount)
  const redeemed = input.redeemedAmounts.reduce(
    (sum, amount) => sum + positiveMoney(amount),
    0n,
  )
  if (redeemed > issued)
    throw new Error('Resgates existentes excedem o crédito emitido.')
  const requested = input.requestedAmount
    ? positiveMoney(input.requestedAmount)
    : 0n
  if (requested > issued - redeemed)
    throw new Error('O resgate excede o saldo disponível do crédito.')
  return {
    issued: centsToMoney(issued),
    redeemed: centsToMoney(redeemed),
    available: centsToMoney(issued - redeemed),
    remainingAfterRequest: centsToMoney(issued - redeemed - requested),
  }
}

export function summarizeStoreCreditLedger(events: StoreCreditLedgerEvent[]) {
  const byId = new Map<number, StoreCreditLedgerEvent>()
  for (const event of events) {
    if (byId.has(event.id))
      throw new Error('Ledger de créditos contém fato financeiro duplicado.')
    byId.set(event.id, event)
  }

  const redemptions = new Map<number, string[]>()
  for (const event of events) {
    if (event.type !== 'store_credit_redeemed') continue
    if (event.settlesEventId === null)
      throw new Error('Resgate de crédito sem emissão vinculada.')
    const issue = byId.get(event.settlesEventId)
    if (!issue || issue.type !== 'store_credit_issued')
      throw new Error('Resgate aponta para uma emissão de crédito inválida.')
    const amounts = redemptions.get(issue.id) ?? []
    amounts.push(event.amount)
    redemptions.set(issue.id, amounts)
  }

  const credits = events
    .filter((event) => event.type === 'store_credit_issued')
    .map((event) => ({
      eventId: event.id,
      saleId: event.saleId,
      saleItemId: event.saleItemId,
      occurredAt: event.occurredAt,
      reason: event.reason,
      ...calculateStoreCreditBalance({
        issuedAmount: event.amount,
        redeemedAmounts: redemptions.get(event.id) ?? [],
      }),
    }))
    .filter((credit) => credit.available !== '0.00')
    .sort(
      (left, right) =>
        left.occurredAt.getTime() - right.occurredAt.getTime() ||
        left.eventId - right.eventId,
    )

  return {
    credits,
    totalAvailable: centsToMoney(
      credits.reduce(
        (sum, credit) => sum + positiveMoney(credit.available),
        0n,
      ),
    ),
  }
}
