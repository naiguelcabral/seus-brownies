import { z } from 'zod'
import { paymentMethod } from '../finance/settlement'
import { saleStatuses } from './sale-history'
import { maxOperationItems, maxNumericInputLength } from '#/lib/input-limits'

export const purchaseInput = z
  .object({
    idempotencyKey: z.string().uuid(),
    supplierName: z.string().trim().min(2).max(160),
    purchasedAt: z.string().date(),
    invoiceFileReference: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          quantity: z.string().trim().max(maxNumericInputLength),
          unitCost: z.string().trim().max(32).optional(),
          totalAmount: z.string().trim().max(32).optional(),
          purchaseUnit: z.literal('kg').optional(),
          supplierLot: z.string().trim().max(80).optional(),
          expiresOn: z.string().date().optional(),
        }),
      )
      .min(1, 'Inclua ao menos um item.')
      .max(maxOperationItems),
  })
  .superRefine((value, context) => {
    value.items.forEach((item, index) => {
      if (item.expiresOn && item.expiresOn < value.purchasedAt) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'expiresOn'],
          message: 'A validade não pode ser anterior à data da compra.',
        })
      }
    })
  })

export const saleInput = z
  .object({
    idempotencyKey: z.string().uuid(),
    locationId: z.number().int().positive(),
    customerName: z.string().trim().max(120).optional(),
    customerPhone: z.string().trim().max(32).optional(),
    status: z.enum(saleStatuses),
    paymentMethod: paymentMethod.optional(),
    reportedAmount: z.string().trim().max(32),
    adjustmentKind: z.enum([
      'none',
      'discount',
      'combo',
      'gift',
      'manual_adjustment',
    ]),
    adjustmentReason: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          quantity: z.string().trim().max(maxNumericInputLength),
        }),
      )
      .min(1)
      .max(maxOperationItems),
  })
  .superRefine((value, context) => {
    if (value.status === 'paid' && !value.paymentMethod)
      context.addIssue({
        code: 'custom',
        path: ['paymentMethod'],
        message: 'Selecione o meio do pagamento recebido.',
      })
    if (value.adjustmentKind !== 'none' && !value.adjustmentReason?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['adjustmentReason'],
        message: 'Informe o motivo do desconto, combo, brinde ou ajuste.',
      })
    }
  })
