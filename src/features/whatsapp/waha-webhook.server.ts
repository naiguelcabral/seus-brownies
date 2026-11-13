import { z } from 'zod'
import { authorizePilotSender } from './pilot-access'
import { verifyWahaSignature } from './waha-signature'

const pilotOrigin = 'https://cacau-v1-piloto.naiguelcabral.workers.dev'
const maxBytes = 16_384
const configSchema = z
  .array(
    z.object({
      phone: z.string(),
      authUserId: z.string(),
      active: z.literal(true),
    }),
  )
  .length(2)
const eventSchema = z.object({
  event: z.literal('message'),
  session: z.string().min(1),
  payload: z.object({
    id: z.string().min(1).max(191),
    from: z.string().regex(/^[1-9]\d{7,14}@c\.us$/),
    fromMe: z.literal(false),
    body: z.string().min(1).max(4000),
    hasMedia: z.literal(false),
  }),
})

export type AcceptedWahaMessage = {
  id: string
  actor: string
  text: string
  fingerprint: string
}
export type WahaDependencies = {
  allowRequest: () => Promise<boolean>
  isActiveUser: (id: string) => Promise<boolean>
  record: (
    message: AcceptedWahaMessage,
  ) => Promise<'new' | 'duplicate' | 'conflict' | 'denied'>
}

async function readBounded(request: Request): Promise<Uint8Array | null> {
  if (!request.body) return null
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    let item = await reader.read()
    while (!item.done) {
      size += item.value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        return null
      }
      chunks.push(item.value)
      item = await reader.read()
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.length
  }
  return body
}

const reply = (status: number, state: string) =>
  Response.json(
    { state },
    {
      status,
      headers: { 'Cache-Control': 'no-store' },
    },
  )

/** Ingress only. Accepted messages are recorded; no command is executed. */
export async function handleWahaWebhook(
  request: Request,
  env: Record<string, string | undefined>,
  deps: WahaDependencies,
): Promise<Response> {
  if (
    env.WAHA_PILOT_ENABLED !== '1' ||
    env.PASSWORD_RESET_REDIRECT_ORIGIN !== pilotOrigin ||
    new URL(request.url).origin !== pilotOrigin
  )
    return reply(404, 'unavailable')
  const secret = env.WAHA_WEBHOOK_HMAC_KEY
  if (
    !secret ||
    secret.length < 32 ||
    !env.WAHA_PILOT_SESSION ||
    !env.WAHA_PILOT_PARTICIPANTS
  )
    return reply(503, 'unavailable')
  let participants: z.infer<typeof configSchema>
  try {
    participants = configSchema.parse(JSON.parse(env.WAHA_PILOT_PARTICIPANTS))
  } catch {
    return reply(503, 'unavailable')
  }
  if (!(await deps.allowRequest())) return reply(429, 'unavailable')
  const body = await readBounded(request)
  if (!body) return reply(413, 'invalid')
  if (
    !(await verifyWahaSignature({
      body,
      secret,
      signature: request.headers.get('x-webhook-hmac'),
      algorithm: request.headers.get('x-webhook-hmac-algorithm'),
    }))
  )
    return reply(401, 'invalid')
  let raw: unknown
  try {
    raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body))
  } catch {
    return reply(400, 'invalid')
  }
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success || parsed.data.session !== env.WAHA_PILOT_SESSION)
    return reply(400, 'invalid')
  const event = parsed.data.payload
  const phone = `+${event.from.slice(0, -5)}`
  const actor = authorizePilotSender(phone, participants)
  if (!actor || !(await deps.isActiveUser(actor))) return reply(403, 'denied')
  const canonical = JSON.stringify([event.id, actor, phone, event.body])
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical),
  )
  const fingerprint = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
  const result = await deps.record({
    id: event.id,
    actor,
    text: event.body,
    fingerprint,
  })
  if (result === 'denied') return reply(403, 'denied')
  return result === 'conflict'
    ? reply(409, 'conflict')
    : reply(202, result === 'new' ? 'received' : 'duplicate')
}
