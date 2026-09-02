import { z } from 'zod'

const quantity = z.string().trim().regex(/^\d+(?:[,.]\d{1,3})?$/)
const money = z.string().trim().regex(/^\d+(?:[,.]\d{1,2})?$/)
const reason = z.string().trim().min(3).max(500)
const reference = z.string().trim().min(1).max(160)

export const cancelSaleValues = z.object({
  saleId: z.number().int().positive(),
  reason,
})
export const returnSaleValues = z.object({
  saleItemId: z.number().int().positive(),
  quantity,
  reason,
  reference,
})
export const negativeInventoryValues = z.object({
  productId: z.number().int().positive(),
  quantity,
  reason,
  reference,
})
export const positiveInventoryValues = negativeInventoryValues.extend({
  totalCost: money,
  originReference: reference,
})

export type CancelSaleInput = z.infer<typeof cancelSaleValues>
export type ReturnSaleInput = z.infer<typeof returnSaleValues>
export type NegativeInventoryInput = z.infer<typeof negativeInventoryValues>
export type PositiveInventoryInput = z.infer<typeof positiveInventoryValues>
