/** Extract only an opaque ID from a server-validated provider result. */
export function readAuthAuditUserId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || !('user' in data)) return undefined
  const user = data.user
  if (!user || typeof user !== 'object' || !('id' in user)) return undefined
  return typeof user.id === 'string' && /^[A-Za-z0-9_-]{1,191}$/.test(user.id)
    ? user.id
    : undefined
}
