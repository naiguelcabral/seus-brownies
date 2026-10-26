import { createAuthAuditEvent } from './audit'
import { z } from 'zod'

import type {
  AuthAuditAction,
  AuthAuditOutcome,
  AuthAuditWriter,
} from './audit'
import type { PasswordResetTelemetry } from './password-reset-telemetry.server'
import { readAuditErrorCode } from './password-reset-telemetry.server'

type PasswordResetAuditAction = Extract<
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
  subjectHash?: string | undefined
  /** Resolved inside the trusted provider directory before consuming the token. */
  trustedSubjectAuthUserId?: string
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
    auditErrorCode?: Parameters<
      PasswordResetTelemetry['emit']
    >[0]['auditErrorCode'],
  ) =>
    operation.telemetry?.emit({
      requestId,
      stage,
      ...(reasonCode ? { reasonCode } : {}),
      ...(auditErrorCode ? { auditErrorCode } : {}),
    })
  const baseEvent = {
    action: operation.action,
    targetType: 'identity' as const,
    requestId,
    ...(operation.trustedSubjectAuthUserId
      ? { targetId: operation.trustedSubjectAuthUserId }
      : {}),
    metadata: createAuthAuditEvent({
      action: operation.action,
      outcome: 'blocked',
      metadata: {
        provider: 'neon-auth',
        ...(operation.subjectHash
          ? { subjectHash: operation.subjectHash }
          : {}),
      },
    }).metadata,
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
  } catch (error) {
    emit('initial_audit_failed', undefined, readAuditErrorCode(error))
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
      ...(operation.action === 'password_reset_completed' &&
      outcome === 'success' &&
      operation.trustedSubjectAuthUserId
        ? { actorAuthUserId: operation.trustedSubjectAuthUserId }
        : {}),
      metadata: failureReasonCode
        ? { ...baseEvent.metadata, reasonCode: failureReasonCode }
        : baseEvent.metadata,
    })
    if (outcome === 'success') emit('completed')
    return { auditComplete: true, result }
  } catch (error) {
    emit('final_audit_failed', undefined, readAuditErrorCode(error))
    return { auditComplete: false, result, stage: 'after-provider' }
  }
}

/** Missing/unavailable identity must stop before changing the provider password. */
export async function executeIdentifiedPasswordReset<T>(
  operation: Omit<
    PasswordResetAuditOperation<T>,
    'action' | 'trustedSubjectAuthUserId'
  > & {
    resolveSubject: () => Promise<string | null>
  },
): Promise<AuditedPasswordResetResult<T>> {
  let subject: string | null
  try {
    subject = await operation.resolveSubject()
  } catch {
    return { auditComplete: false, stage: 'before-provider' }
  }
  const identity = z.string().uuid().safeParse(subject)
  if (!identity.success)
    return { auditComplete: false, stage: 'before-provider' }
  return executeAuditedPasswordReset({
    ...operation,
    action: 'password_reset_completed',
    trustedSubjectAuthUserId: identity.data,
  })
}

export function isAuditedPasswordResetSuccessful(
  result: AuditedPasswordResetResult<{ ok: boolean }>,
) {
  return result.auditComplete && result.result.ok
}
