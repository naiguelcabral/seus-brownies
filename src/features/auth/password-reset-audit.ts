import type { AuthAuditAction, AuthAuditOutcome } from './audit'
import type { AuthAuditWriter } from './audit-writer.server'
import type { PasswordResetTelemetry } from './password-reset-telemetry.server'

export type PasswordResetAuditAction = Extract<
  AuthAuditAction,
  'password_reset_requested' | 'password_reset_completed'
>

type PasswordResetAuditOperation<T> = {
  action: PasswordResetAuditAction
  execute: () => Promise<T>
  getOutcome: (result: T) => Extract<AuthAuditOutcome, 'success' | 'failure'>
  getFailureReasonCode?: (
    result: T,
  ) =>
    | 'provider_timeout'
    | 'provider_network_error'
    | 'provider_http_error'
    | undefined
  requestId?: string
  telemetry?: PasswordResetTelemetry
  writer: AuthAuditWriter
}

export type AuditedPasswordResetResult<T> =
  | { auditComplete: true; result: T }
  | {
      auditComplete: false
      result?: T
      stage: 'before-provider' | 'after-provider'
    }

/**
 * There is no distributed transaction between Neon Auth and the Cacau
 * database. Persisting an explicit pending event before calling the provider
 * makes that boundary auditable. A caller must not report success unless the
 * final outcome event is also stored.
 */
export async function executeAuditedPasswordReset<T>(
  operation: PasswordResetAuditOperation<T>,
): Promise<AuditedPasswordResetResult<T>> {
  const requestId = operation.requestId ?? crypto.randomUUID()
  const emit = (
    stage: Parameters<PasswordResetTelemetry['emit']>[0]['stage'],
    reasonCode?: Parameters<PasswordResetTelemetry['emit']>[0]['reasonCode'],
  ) =>
    operation.telemetry?.emit({
      requestId,
      stage,
      ...(reasonCode ? { reasonCode } : {}),
    })
  const baseEvent = {
    action: operation.action,
    targetType: 'identity' as const,
    requestId,
    metadata: { provider: 'neon-auth' as const },
  }

  try {
    await operation.writer.append({
      ...baseEvent,
      outcome: 'blocked',
      metadata: {
        ...baseEvent.metadata,
        reasonCode: 'provider_outcome_pending',
      },
    })
  } catch {
    emit('initial_audit_failed')
    return { auditComplete: false, stage: 'before-provider' }
  }

  emit('provider_request_started')
  const result = await operation.execute()
  const outcome = operation.getOutcome(result)
  const failureReasonCode =
    outcome === 'failure' ? operation.getFailureReasonCode?.(result) : undefined
  emit(
    outcome === 'success'
      ? 'provider_request_succeeded'
      : 'provider_request_failed',
    failureReasonCode,
  )

  try {
    await operation.writer.append({
      ...baseEvent,
      outcome,
      metadata: failureReasonCode
        ? { ...baseEvent.metadata, reasonCode: failureReasonCode }
        : baseEvent.metadata,
    })
    if (outcome === 'success') emit('completed')
    return { auditComplete: true, result }
  } catch {
    emit('final_audit_failed')
    return { auditComplete: false, result, stage: 'after-provider' }
  }
}

export function isAuditedPasswordResetSuccessful(
  result: AuditedPasswordResetResult<{ ok: boolean }>,
) {
  return result.auditComplete && result.result.ok
}
