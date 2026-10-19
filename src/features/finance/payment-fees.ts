import { z } from 'zod'
import { centsToMoney, moneyToCents } from '#/features/production/calculations'

export const paymentFeeSchedule = z.object({
  debitBps: z.number().int().min(0).max(10000),
  creditBps: z.number().int().min(0).max(10000),
  pixFixedCents: z.number().int().min(0).max(100000),
  effectiveOn: z.string().date(),
})
export type PaymentFeeSchedule = z.infer<typeof paymentFeeSchedule>

export function parseFeePercent(value: string) {
  if (!/^\d{1,3}(?:[,.]\d{1,2})?$/.test(value))
    throw new Error('Informe a taxa com até duas casas decimais.')
  const parsed = moneyToCents(value)
  if (parsed === null || parsed > 10000n)
    throw new Error('Taxa deve estar entre 0% e 100%.')
  return Number(parsed)
}

export function parseFixedFee(value: string) {
  const parsed = moneyToCents(value)
  if (parsed === null || parsed > 100000n)
    throw new Error('Tarifa fixa inválida.')
  return Number(parsed)
}

export function readPaymentFeeSchedule(value: unknown) {
  return value == null ? null : paymentFeeSchedule.parse(value)
}

/** Estimates by method. Pix counts payment transactions, never product units. */
export function estimatePaymentFees(
  schedule: PaymentFeeSchedule,
  revenue: string,
  pixTransactions: string,
) {
  const gross = moneyToCents(revenue)
  if (gross === null || gross <= 0n)
    throw new Error('Informe uma venda maior que zero.')
  if (!/^\d{1,9}$/.test(pixTransactions))
    throw new Error('Informe a quantidade inteira de pagamentos Pix.')
  const fee = (bps: number) => (gross * BigInt(bps) + 5000n) / 10000n
  const rows = [
    { method: 'Débito', fee: fee(schedule.debitBps) },
    { method: 'Crédito', fee: fee(schedule.creditBps) },
    {
      method: 'Pix',
      fee: BigInt(pixTransactions) * BigInt(schedule.pixFixedCents),
    },
    { method: 'Dinheiro', fee: 0n },
  ]
  return rows.map((row) => ({
    method: row.method,
    fee: centsToMoney(row.fee),
    net: centsToMoney(gross - row.fee),
  }))
}
