export class IdempotencyConflictError extends Error {
  constructor() {
    super('Esta chave de operação já foi usada com dados diferentes.')
    this.name = 'IdempotencyConflictError'
  }
}

export type IdempotentRecord = {
  id: number
  idempotencyHash: string | null
}

export function resolveIdempotentReplay(
  existing: IdempotentRecord | undefined,
  expectedHash: string,
) {
  if (!existing) return null
  if (existing.idempotencyHash !== expectedHash) {
    throw new IdempotencyConflictError()
  }
  return { id: existing.id, replayed: true as const }
}

export async function hashOperationPayload(payload: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
