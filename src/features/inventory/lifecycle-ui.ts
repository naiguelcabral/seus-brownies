import {
  cancelSaleValues,
  negativeInventoryValues,
  positiveInventoryValues,
  returnSaleValues,
} from '#/features/inventory/lifecycle-contracts'
import type {
  CancelSaleInput,
  NegativeInventoryInput,
  PositiveInventoryInput,
  ReturnSaleInput,
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

export function canSubmitLifecycle(
  pending: boolean,
  needsConfirmation = false,
  confirmed = true,
) {
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
  return (
    canSubmitLifecycle(pending, true, confirmed) &&
    validateLifecycleForm('positive', {
      ...values,
      productId: Number(values.productId),
    }).ok
  )
}

export function lifecycleErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('0013_fifo_lifecycle'))
    return 'O ciclo FIFO ainda não está disponível: aplique a migration 0013 em development antes de registrar este evento.'
  if (message.includes('migrations 0023 a 0025'))
    return 'O lifecycle financeiro G2 ainda não está disponível: aplique as migrations 0023 a 0025 em ambiente autorizado.'
  return message || 'Não foi possível registrar o evento de estoque.'
}

type ValidationResult<T> =
  { ok: true; data: T } | { ok: false; message: string }

export function validateLifecycleForm(
  kind: 'cancel',
  values: Record<string, unknown>,
): ValidationResult<CancelSaleInput>
export function validateLifecycleForm(
  kind: 'return',
  values: Record<string, unknown>,
): ValidationResult<ReturnSaleInput>
export function validateLifecycleForm(
  kind: 'loss' | 'negative',
  values: Record<string, unknown>,
): ValidationResult<NegativeInventoryInput>
export function validateLifecycleForm(
  kind: 'positive',
  values: Record<string, unknown>,
): ValidationResult<PositiveInventoryInput>
export function validateLifecycleForm(
  kind: 'cancel' | 'return' | 'loss' | 'negative' | 'positive',
  values: Record<string, unknown>,
) {
  const schema =
    kind === 'cancel'
      ? cancelSaleValues
      : kind === 'return'
        ? returnSaleValues
        : kind === 'positive'
          ? positiveInventoryValues
          : negativeInventoryValues
  const result = schema.safeParse(values)
  return result.success
    ? { ok: true as const, data: result.data }
    : {
        ok: false as const,
        message:
          'Revise os campos obrigatórios: quantidade positiva, decisão, data, motivo e referência.',
      }
}
