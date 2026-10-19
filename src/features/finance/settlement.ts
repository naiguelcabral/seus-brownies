import { z } from 'zod'
import { paymentFeeSchedule } from './payment-fees'
import type { PaymentFeeSchedule } from './payment-fees'
import { centsToMoney, moneyToCents } from '../production/calculations'

export const paymentMethod = z.enum(['cash', 'debit', 'credit', 'pix'])
export type PaymentMethod = z.infer<typeof paymentMethod>
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  debit: 'Débito',
  credit: 'Crédito',
  pix: 'Pix',
}
const snapshot = z.object({
  version: z.literal(1),
  method: paymentMethod,
  gross: z.string(),
  fee: z.string(),
  net: z.string(),
  occurredOn: z.string().date(),
  schedule: paymentFeeSchedule.nullable(),
  reference: z.string().uuid().optional(),
  commandHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
})

/** One payment transaction can contain many products. Never calculate Pix per item. */
export function calculateSettlement(
  method: PaymentMethod,
  gross: string,
  occurredOn: string,
  schedule: PaymentFeeSchedule | null,
) {
  const amount = moneyToCents(gross)
  if (amount === null || amount <= 0n)
    throw new Error('Informe o valor bruto positivo do pagamento.')
  if (method !== 'cash' && (!schedule || schedule.effectiveOn > occurredOn))
    throw new Error('Não há tarifa válida para a data deste pagamento.')
  const bps =
    method === 'debit'
      ? schedule!.debitBps
      : method === 'credit'
        ? schedule!.creditBps
        : 0
  const fee =
    method === 'pix'
      ? BigInt(schedule!.pixFixedCents)
      : (amount * BigInt(bps) + 5000n) / 10000n
  if (fee > amount) throw new Error('A taxa excede o valor do pagamento.')
  return snapshot.parse({
    version: 1,
    method,
    gross: centsToMoney(amount),
    fee: centsToMoney(fee),
    net: centsToMoney(amount - fee),
    occurredOn,
    schedule: method === 'cash' ? null : schedule,
  })
}

export function readSettlement(value: unknown) {
  if (value == null) return null
  const parsed = snapshot.parse(value)
  const expected = calculateSettlement(
    parsed.method,
    parsed.gross,
    parsed.occurredOn,
    parsed.schedule,
  )
  if (expected.net !== parsed.net || expected.fee !== parsed.fee)
    throw new Error('Pagamento com valores inconsistentes.')
  return {
    ...expected,
    ...(parsed.reference ? { reference: parsed.reference } : {}),
    ...(parsed.commandHash ? { commandHash: parsed.commandHash } : {}),
  }
}
