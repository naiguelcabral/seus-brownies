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
