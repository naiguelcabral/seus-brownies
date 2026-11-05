import { z } from 'zod'
import { readExactCost, scaleCost } from '#/lib/exact-cost'
import type { ExactCost } from '#/lib/exact-cost'

const entry = z.object({
  unit: z.string().min(1),
  unitCost: z.object({
    numerator: z.string().regex(/^\d+$/),
    denominator: z.string().regex(/^[1-9]\d*$/),
  }),
  source: z.string().min(1),
})
const manifest = z.object({
  schemaVersion: z.literal(1),
  workbookSha256: z.string().regex(/^[a-f0-9]{64}$/),
  costs: z.record(z.string().min(1), entry),
  operationalPerRecipe: z.object({
    energy: entry.extend({ unit: z.literal('batch') }),
    labor: entry.extend({ unit: z.literal('batch') }),
  }),
})
export type PilotWorkbookCosts = z.infer<typeof manifest>

/** Server configuration only. Client payloads cannot enable the pilot exception. */
export function readPilotWorkbookCosts(
  environment: Record<string, string | undefined>,
): PilotWorkbookCosts | null {
  if (
    environment.PILOT_STOCK_POLICY !== 'workbook_negative' ||
    environment.PASSWORD_RESET_REDIRECT_ORIGIN !==
      'https://cacau-v1-piloto.naiguelcabral.workers.dev'
  )
    return null
  const raw = environment.PILOT_WORKBOOK_COSTS
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('Referências do workbook inválidas no piloto.')
  }
  const result = manifest.safeParse(value)
  if (!result.success)
    throw new Error('Referências do workbook inválidas no piloto.')
  return result.data
}

export function pilotMaterialCost(
  policy: PilotWorkbookCosts,
  sku: string,
  unit: string,
  quantity: bigint,
): ExactCost {
  const cost = policy.costs[sku]
  if (!cost || cost.unit !== unit)
    throw new Error(
      `Custo do workbook ausente ou unidade incompatível: ${sku}.`,
    )
  if (quantity < 0n) throw new Error('Quantidade de referência inválida.')
  return scaleCost(readExactCost(cost.unitCost), quantity, 1_000n)
}

export function pilotCostProvenance(policy: PilotWorkbookCosts) {
  return {
    method: 'pilot_workbook_reference',
    workbookSha256: policy.workbookSha256,
  }
}

export function pilotInventoryValue(
  policy: PilotWorkbookCosts,
  sku: string,
  unit: string,
  balance: bigint,
) {
  const cost = pilotMaterialCost(policy, sku, unit, 1_000n)
  return scaleCost(cost, balance, 1_000n)
}
