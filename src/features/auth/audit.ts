export const authAuditActions = [
  'login',
  'logout',
  'password_reset_requested',
  'password_reset_completed',
  'email_verification',
  'role_changed',
  'access_denied',
] as const

export type AuthAuditAction = (typeof authAuditActions)[number]
export type AuthAuditOutcome = 'success' | 'failure' | 'blocked'

/**
 * Writers may record only this allowlisted metadata. Credentials, session
 * cookies, reset tokens and raw network identifiers have no representation.
 */
export type AuthAuditInput = {
  actorAuthUserId?: string
  action: AuthAuditAction
  outcome: AuthAuditOutcome
  targetType?: 'access' | 'session' | 'identity'
  targetId?: string
  requestId?: string
  networkHash?: string
  metadata?: {
    reasonCode?: string
    challengeRequired?: boolean
    provider?: 'neon-auth'
  }
}

export function createAuthAuditEvent(input: AuthAuditInput) {
  return {
    ...input,
    metadata: input.metadata ?? null,
  }
}
