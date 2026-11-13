/** Offline policy only: the caller must independently authenticate the webhook. */
const e164 = /^\+[1-9]\d{7,14}$/

export type PilotParticipant = {
  phone: string
  authUserId: string
  active: boolean
}

export function authorizePilotSender(
  sender: string,
  participants: readonly PilotParticipant[],
): string | null {
  if (
    participants.length !== 2 ||
    participants.some((p) => !e164.test(p.phone) || !p.authUserId.trim()) ||
    new Set(participants.map((p) => p.phone)).size !== 2 ||
    new Set(participants.map((p) => p.authUserId)).size !== 2 ||
    !e164.test(sender)
  )
    return null
  return (
    participants.find((p) => p.active && p.phone === sender)?.authUserId ?? null
  )
}
