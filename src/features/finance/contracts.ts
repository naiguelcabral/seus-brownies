import { z } from 'zod'

const quantity = z
  .string()
  .trim()
  .regex(/^\d+(?:[,.]\d{1,3})?$/)

export const deliverSaleValues = z.object({
  saleId: z.number().int().positive(),
  deliveredOn: z.string().date(),
})

export const compensateSaleValues = z.object({
  saleItemId: z.number().int().positive(),
  quantity,
  settlement: z.enum(['refund', 'store_credit']),
  occurredOn: z.string().date(),
  reason: z.string().trim().min(3).max(500),
  reference: z.string().trim().min(1).max(160),
})

export type DeliverSaleInput = z.infer<typeof deliverSaleValues>
export type CompensateSaleInput = z.infer<typeof compensateSaleValues>
