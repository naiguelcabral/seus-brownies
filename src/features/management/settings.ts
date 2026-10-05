import { z } from 'zod'

const decimalText = z.string().trim().min(1).max(32)

export const managementSettingsValues = z
  .object({
    monthlyProfitGoal: decimalText,
    fixedMonthlyCosts: decimalText,
    salesDaysPerMonth: z.number().int().min(1).max(31),
    weeksPerMonth: decimalText,
    normalRevenueTolerance: decimalText,
    criticalRevenueTolerance: decimalText,
    minimumProductMargin: decimalText,
    feeTaxReserveRate: decimalText,
  })
  .superRefine((value, context) => {
    const moneyFields = [
      ['monthlyProfitGoal', value.monthlyProfitGoal, false],
      ['fixedMonthlyCosts', value.fixedMonthlyCosts, true],
    ] as const
    for (const [field, input, allowZero] of moneyFields) {
      const parsed = parseUnsignedDecimal(input, 2)
      if (parsed === null || (!allowZero && parsed.scaled === 0n)) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: 'Informe um valor monetário válido.',
        })
      }
    }

    const weeks = parseUnsignedDecimal(value.weeksPerMonth, 2)
    if (weeks === null || weeks.scaled < 100n || weeks.scaled > 600n) {
      context.addIssue({
        code: 'custom',
        path: ['weeksPerMonth'],
        message: 'Informe de 1 a 6 semanas.',
      })
    }

    const rates = [
      ['normalRevenueTolerance', value.normalRevenueTolerance],
      ['criticalRevenueTolerance', value.criticalRevenueTolerance],
      ['minimumProductMargin', value.minimumProductMargin],
      ['feeTaxReserveRate', value.feeTaxReserveRate],
    ] as const
    for (const [field, input] of rates) {
      const parsed = parseUnsignedDecimal(input, 4)
      if (parsed === null || parsed.scaled > 10_000n) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: 'Informe um percentual entre 0 e 1.',
        })
      }
    }

    const normal = rateToTenThousandths(value.normalRevenueTolerance)
    const critical = rateToTenThousandths(value.criticalRevenueTolerance)
    if (normal !== null && critical !== null && normal >= critical) {
      context.addIssue({
        code: 'custom',
        path: ['criticalRevenueTolerance'],
        message: 'A tolerância crítica deve ser maior que a normal.',
      })
    }
  })

export type ManagementSettingsInput = z.infer<typeof managementSettingsValues>

export function parseUnsignedDecimal(value: string, scale: number) {
  const normalized = value.trim().replace(',', '.')
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized)
  if (!match) return null
  const [whole, fraction = ''] = normalized.split('.')
  if (fraction.length > scale) return null
  const paddedFraction = fraction.padEnd(scale, '0')
  const factor = 10n ** BigInt(scale)
  const scaled = BigInt(whole) * factor + BigInt(paddedFraction || '0')
  return {
    scaled,
    normalized: `${BigInt(whole)}.${paddedFraction}`,
  }
}

export function rateToTenThousandths(value: string) {
  return parseUnsignedDecimal(value, 4)?.scaled ?? null
}

export function normalizeManagementSettings(input: ManagementSettingsInput) {
  return {
    monthlyProfitGoal: parseUnsignedDecimal(input.monthlyProfitGoal, 2)!
      .normalized,
    fixedMonthlyCosts: parseUnsignedDecimal(input.fixedMonthlyCosts, 2)!
      .normalized,
    salesDaysPerMonth: input.salesDaysPerMonth,
    weeksPerMonth: parseUnsignedDecimal(input.weeksPerMonth, 2)!.normalized,
    normalRevenueTolerance: parseUnsignedDecimal(
      input.normalRevenueTolerance,
      4,
    )!.normalized,
    criticalRevenueTolerance: parseUnsignedDecimal(
      input.criticalRevenueTolerance,
      4,
    )!.normalized,
    minimumProductMargin: parseUnsignedDecimal(input.minimumProductMargin, 4)!
      .normalized,
    feeTaxReserveRate: parseUnsignedDecimal(input.feeTaxReserveRate, 4)!
      .normalized,
  }
}
