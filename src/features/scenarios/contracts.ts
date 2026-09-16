import { z } from 'zod'

export const scenarioStatuses = ['draft', 'active', 'archived'] as const

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional()
const money = z
  .string()
  .trim()
  .regex(/^\d+(?:[,.]\d{1,2})?$/, 'Informe um valor monetário válido.')
  .refine(
    (value) => value.replace(',', '.').split('.')[0].length <= 10,
    'O valor monetário excede o limite permitido.',
  )
const positiveMoney = money.refine(
  (value) => !/^0+(?:[,.]0+)?$/.test(value),
  'Informe um valor maior que zero.',
)
const unitCost = z
  .string()
  .trim()
  .regex(/^\d+(?:[,.]\d{1,3})?$/, 'Informe um custo unitário válido.')
  .refine(
    (value) => value.replace(',', '.').split('.')[0].length <= 9,
    'O custo unitário excede o limite permitido.',
  )
const positiveWeight = z
  .string()
  .trim()
  .regex(/^\d+(?:[,.]\d{1,6})?$/, 'Informe um peso válido.')
  .refine(
    (value) => value.replace(',', '.').split('.')[0].length <= 6,
    'O peso excede o limite permitido.',
  )
  .refine(
    (value) => !/^0+(?:[,.]0+)?$/.test(value),
    'O peso deve ser maior que zero.',
  )
const rate = z
  .string()
  .trim()
  .regex(/^\d+(?:[,.]\d{1,4})?$/, 'Informe um percentual válido.')
const weeks = z
  .string()
  .trim()
  .regex(/^\d+(?:[,.]\d{1,2})?$/, 'Informe uma quantidade de semanas válida.')
const reason = z.string().trim().min(3).max(500)

export const scenarioMixValues = z.object({
  productId: z.number().int().positive(),
  originalWeight: positiveWeight,
  plannedUnitPrice: positiveMoney,
  plannedUnitCost: unitCost,
})

export const scenarioDraftValues = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: optionalText(1_000),
    effectiveOn: z.string().date(),
    monthlyProfitGoal: positiveMoney,
    fixedMonthlyCosts: money,
    salesDaysPerMonth: z.number().int().min(1).max(31),
    weeksPerMonth: weeks,
    minimumMarginRate: rate,
    feeTaxReserveRate: rate,
    mix: z.array(scenarioMixValues).max(200),
  })
  .superRefine((value, context) => {
    for (const field of ['minimumMarginRate', 'feeTaxReserveRate'] as const) {
      const normalized = value[field].replace(',', '.')
      const [whole, fraction = ''] = normalized.split('.')
      const scaled = BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, '0'))
      if (scaled > 10_000n)
        context.addIssue({
          code: 'custom',
          path: [field],
          message: 'Informe um percentual entre 0 e 100%.',
        })
    }

    const normalizedWeeks = value.weeksPerMonth.replace(',', '.')
    const [whole, fraction = ''] = normalizedWeeks.split('.')
    const scaledWeeks = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
    if (scaledWeeks < 100n || scaledWeeks > 600n)
      context.addIssue({
        code: 'custom',
        path: ['weeksPerMonth'],
        message: 'Informe de 1 a 6 semanas.',
      })

    const productIds = value.mix.map((item) => item.productId)
    if (new Set(productIds).size !== productIds.length)
      context.addIssue({
        code: 'custom',
        path: ['mix'],
        message: 'O mix não pode repetir produto.',
      })
  })

export const listScenariosValues = z.object({
  query: z.string().trim().max(100).optional(),
  status: z.enum(scenarioStatuses).optional(),
  page: z.number().int().min(1).max(10_000).default(1),
})

export const updateScenarioDraftValues = scenarioDraftValues.and(
  z.object({
    id: z.number().int().positive(),
    expectedRevision: z.number().int().positive(),
  }),
)

export const createScenarioVersionValues = z.object({
  sourceScenarioId: z.number().int().positive(),
  reason,
})

export const activateScenarioValues = z.object({
  id: z.number().int().positive(),
  expectedRevision: z.number().int().positive(),
  reason: reason.optional(),
})

export const archiveScenarioValues = z.object({
  id: z.number().int().positive(),
  expectedRevision: z.number().int().positive(),
  reason,
})

export type ScenarioDraftInput = z.infer<typeof scenarioDraftValues>
export type ScenarioMixInput = z.infer<typeof scenarioMixValues>
export type UpdateScenarioDraftInput = z.infer<typeof updateScenarioDraftValues>
export type CreateScenarioVersionInput = z.infer<
  typeof createScenarioVersionValues
>
export type ActivateScenarioInput = z.infer<typeof activateScenarioValues>
export type ArchiveScenarioInput = z.infer<typeof archiveScenarioValues>
