export type TurnstileChallengeState = {
  canRenderWidget: boolean
  requiresChallenge: boolean
}

/** The site key is public, but an absent or blank value must not enable a bypass. */
export function getTurnstileChallengeState(
  requiresChallenge: boolean,
  siteKey: string | undefined,
): TurnstileChallengeState {
  return {
    requiresChallenge,
    canRenderWidget: requiresChallenge && Boolean(siteKey?.trim()),
  }
}
