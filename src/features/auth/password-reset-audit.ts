import type { AuthAuditAction, AuthAuditOutcome } from './audit'
import type { AuthAuditWriter } from './audit-writer.server'

export type PasswordResetAuditAction = Extract<
  AuthAuditAction,
  'password_reset_requested' | 'password_reset_completed'
>

type PasswordResetAuditOperation<T> = {
  action: PasswordResetAuditAction
  execute: () => Promise<T>
  getOutcome: (result: T) => Extract<AuthAuditOutcome, 'success' | 'failure'>
  requestId?: string
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
    return { auditComplete: false, stage: 'before-provider' }
  }

  const result = await operation.execute()

  try {
    await operation.writer.append({
      ...baseEvent,
      outcome: operation.getOutcome(result),
    })
    return { auditComplete: true, result }
  } catch {
    return { auditComplete: false, result, stage: 'after-provider' }
  }
}
