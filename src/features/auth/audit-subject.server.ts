import { hashAuthIdentity } from './auth-rate-limit.server'

/** Pseudonymous subject, not a verified actor. Never call this with reset tokens. */
export async function hashAuthAuditSubject(
  email: string,
  pepper: string | undefined,
) {
  return pepper ? hashAuthIdentity('audit-subject', email, pepper) : undefined
}
