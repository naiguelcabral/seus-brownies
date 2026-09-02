import {
  cancelSaleValues,
  negativeInventoryValues,
  positiveInventoryValues,
  returnSaleValues,
} from '#/features/inventory/lifecycle-contracts'

export type NegativeInventoryFormValues = {
  productId: string
  quantity: string
  reason: string
  reference: string
}

export function createNegativeInventoryFormValues(): NegativeInventoryFormValues {
  return { productId: '', quantity: '', reason: '', reference: '' }
}

export function canCancelSale(status: string) {
  return status === 'confirmed' || status === 'paid'
}

export function canSubmitLifecycle(pending: boolean, needsConfirmation = false, confirmed = true) {
  return !pending && (!needsConfirmation || confirmed)
}

/**
 * UI-only guard for positive adjustments. The server contract remains the
 * authorization boundary; this merely prevents an accidental local submit.
 */
export function canSubmitPositiveAdjustment(
  pending: boolean,
  values: Record<string, unknown>,
  confirmed: boolean,
) {
  return canSubmitLifecycle(pending, true, confirmed)
    && validateLifecycleForm('positive', { ...values, productId: Number(values.productId) }).ok
}

export function lifecycleErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('0013_fifo_lifecycle'))
    return 'O ciclo FIFO ainda não está disponível: aplique a migration 0013 em development antes de registrar este evento.'
  return message || 'Não foi possível registrar o evento de estoque.'
}

export function validateLifecycleForm(kind: 'cancel' | 'return' | 'loss' | 'negative' | 'positive', values: Record<string, unknown>) {
  const schema = kind === 'cancel' ? cancelSaleValues
    : kind === 'return' ? returnSaleValues
      : kind === 'positive' ? positiveInventoryValues
        : negativeInventoryValues
  const result = schema.safeParse(values)
  return result.success ? { ok: true as const, data: result.data } : {
    ok: false as const,
    message: 'Revise os campos obrigatórios: quantidade positiva (até três casas), motivo e referência.',
  }
}
