import type { AuthAuditAction, AuthAuditOutcome } from './audit'

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
      console.warn('[auth.audit]', JSON.stringify(event))
    },
  }
}
