import { z } from 'zod'
import { quantityToThousandths } from './calculations'
import { maxOperationItems, maxNumericInputLength } from '#/lib/input-limits'

const quantityInput = z
  .string()
  .trim()
  .max(maxNumericInputLength)
  .refine(
    (value) =>
      value.length <= maxNumericInputLength &&
      (quantityToThousandths(value) ?? 0n) > 0n,
    'Informe uma quantidade positiva com até três casas decimais.',
  )

const outputInput = z.object({
  productId: z.number().int().positive(),
  quantity: quantityInput,
})

export const lossInput = z.object({
  productId: z.number().int().positive(),
  quantity: quantityInput,
  reason: z.string().trim().min(3, 'Informe o motivo da perda.').max(240),
})

export const batchInput = z.object({
  recipeVersionId: z.number().int().positive(),
  productionDate: z.string().date(),
  recipeMultiplier: quantityInput,
  outputs: z
    .array(outputInput)
    .min(1, 'Inclua ao menos um produto final.')
    .max(maxOperationItems),
  bordinhasQuantity: z.string().trim().max(maxNumericInputLength).optional(),
  bordinhasWeightGrams: z.string().trim().max(maxNumericInputLength).optional(),
  operationalAmounts: z
    .object({
      energy: z.string().trim().max(maxNumericInputLength),
      labor: z.string().trim().max(maxNumericInputLength),
    })
    .optional(),
  losses: z.array(lossInput).max(maxOperationItems).default([]),
  notes: z.string().trim().max(1_000).optional(),
})
