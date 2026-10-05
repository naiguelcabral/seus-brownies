import { z } from 'zod'

const quantity = z
  .string()
  .trim()
  .regex(/^\d+(?:[,.]\d{1,3})?$/)
const signedMoney = z
  .string()
  .trim()
  .regex(/^-?\d+(?:[,.]\d{1,2})?$/)
  .refine((value) => !/^-?0+(?:[,.]0+)?$/.test(value), {
    message: 'A correção deve ter efeito diferente de zero.',
  })
const positiveMoney = z
  .string()
  .trim()
  .regex(/^\d+(?:[,.]\d{1,2})?$/)
  .refine((value) => !/^0+(?:[,.]0+)?$/.test(value), {
    message: 'O resgate deve ter valor maior que zero.',
  })
const reason = z.string().trim().min(3).max(500)
const reference = z.string().trim().min(1).max(160)
const periodMonth = z
  .string()
  .regex(/^\d{4}-(?:0[1-9]|1[0-2])-01$/, 'Informe o primeiro dia do mês.')

export const deliverSaleValues = z.object({
  saleId: z.number().int().positive(),
  deliveredOn: z.string().date(),
})

export const compensateSaleValues = z.object({
  saleItemId: z.number().int().positive(),
  quantity,
  settlement: z.enum(['refund', 'store_credit']),
  occurredOn: z.string().date(),
  reason,
  reference,
})

export const closeFinancialPeriodValues = z.object({
  periodMonth,
  notes: reason,
})

export const correctFinancialEventValues = z.object({
  correctsEventId: z.number().int().positive(),
  effect: z.enum(['revenue', 'cash']),
  deltaAmount: signedMoney,
  occurredOn: z.string().date(),
  reason,
  reference,
})

export const redeemStoreCreditValues = z.object({
  issuanceEventId: z.number().int().positive(),
  amount: positiveMoney,
  occurredOn: z.string().date(),
  reason,
  reference,
})

export const financialOverviewValues = z.object({
  periodMonth,
})

export type DeliverSaleInput = z.infer<typeof deliverSaleValues>
export type CompensateSaleInput = z.infer<typeof compensateSaleValues>
export type CloseFinancialPeriodInput = z.infer<
  typeof closeFinancialPeriodValues
>
export type CorrectFinancialEventInput = z.infer<
  typeof correctFinancialEventValues
>
export type RedeemStoreCreditInput = z.infer<typeof redeemStoreCreditValues>
export type FinancialOverviewInput = z.infer<typeof financialOverviewValues>
