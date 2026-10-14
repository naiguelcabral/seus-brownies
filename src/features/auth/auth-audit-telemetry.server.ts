import type { AuthAuditAction, AuthAuditOutcome } from './audit'
import { telemetryRequestId } from './telemetry-request-id'

export type AuthAuditTelemetryEvent = {
  requestId: string
  action: Extract<AuthAuditAction, 'login' | 'logout' | 'email_verification'>
  outcome: Extract<AuthAuditOutcome, 'success' | 'failure'>
  stage: 'persistence_failed'
}

export type AuthAuditTelemetry = {
  emit: (event: AuthAuditTelemetryEvent) => void
}

/**
 * Observability for an audit write that cannot be retried in the same auth
 * request. It deliberately has no credentials, cookies, provider response,
 * identity or network fields.
 */
export function createAuthAuditTelemetry(): AuthAuditTelemetry {
  return {
    emit: (event) => {
      if (
        !['login', 'logout', 'email_verification'].includes(event.action) ||
        !['success', 'failure'].includes(event.outcome) ||
        !['persistence_failed'].includes(event.stage)
      )
        return
      console.warn(
        JSON.stringify({
          event: 'auth.audit',
          level: 'warn',
          requestId: telemetryRequestId(event.requestId),
          action: event.action,
          outcome: event.outcome,
          stage: event.stage,
        }),
      )
    },
  }
}
