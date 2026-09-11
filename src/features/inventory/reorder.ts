import {
  quantityToThousandths,
  thousandthsToQuantity,
} from '#/features/production/calculations'

export type ReorderStatus = 'not_configured' | 'reorder' | 'ok'

export function normalizeReorderPoint(value?: string) {
  if (!value?.trim()) return null
  const parsed = quantityToThousandths(value)
  return parsed !== null && parsed >= 0n && parsed <= 99_999_999_999_999n
    ? thousandthsToQuantity(parsed)
    : null
}

export function calculateReorderStatus(
  balance: string,
  reorderPoint: string | null,
): ReorderStatus {
  if (reorderPoint === null) return 'not_configured'
  const balanceQuantity = quantityToThousandths(balance)
  const threshold = quantityToThousandths(reorderPoint)
  if (balanceQuantity === null || threshold === null)
    throw new Error('Quantidade de estoque inválida.')
  return balanceQuantity <= threshold ? 'reorder' : 'ok'
}
