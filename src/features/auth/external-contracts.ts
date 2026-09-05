/** Provider adapters must verify challenge tokens on the server. */
export type TurnstileVerifier = {
  verify: (input: { token: string; remoteAddress?: string }) => Promise<{
    success: boolean
    reasonCode?: string
  }>
}

/** Password-reset delivery deliberately exposes no account-existence signal. */
export type PasswordResetDispatcher = {
  request: (input: { email: string; callbackUrl: string }) => Promise<void>
}

export const passwordResetRequestResponse = {
  message:
    'Se houver uma conta compatível, enviaremos instruções para o e-mail informado.',
} as const

/** Reset credentials are accepted only for the in-flight provider request. */
export type PasswordResetCompletion = {
  newPassword: string
  token: string
}
