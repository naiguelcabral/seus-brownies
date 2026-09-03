export const maxConsecutiveLoginFailures = 5

export type LoginAttemptState = {
  consecutiveFailures: number
  cooldownUntil: Date | null
}

export type LoginSecurityPolicy = {
  cooldownMs: number
}

export type LoginAttemptDecision = {
  allowed: boolean
  requiresChallenge: boolean
  nextState: LoginAttemptState
}

export function decideLoginAttempt(input: {
  state: LoginAttemptState | null
  succeeded: boolean
  now: Date
  policy: LoginSecurityPolicy
}): LoginAttemptDecision {
  const state = input.state ?? { consecutiveFailures: 0, cooldownUntil: null }
  const coolingDown = state.cooldownUntil?.getTime() > input.now.getTime()

  if (coolingDown) {
    return { allowed: false, requiresChallenge: true, nextState: state }
  }

  if (input.succeeded) {
    return {
      allowed: true,
      requiresChallenge: false,
      nextState: { consecutiveFailures: 0, cooldownUntil: null },
    }
  }

  const consecutiveFailures = state.consecutiveFailures + 1
  const requiresChallenge = consecutiveFailures >= maxConsecutiveLoginFailures
  return {
    allowed: false,
    requiresChallenge,
    nextState: {
      consecutiveFailures,
      cooldownUntil: requiresChallenge
        ? new Date(input.now.getTime() + input.policy.cooldownMs)
        : null,
    },
  }
}
