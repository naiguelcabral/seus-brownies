export const invalidLoginMessage =
  'Não foi possível iniciar a sessão. Verifique as credenciais e tente novamente.'

export const unavailableLoginMessage =
  'A autenticação não está disponível neste ambiente. Tente novamente mais tarde.'

export const accessDeniedLoginMessage =
  'Sua conta foi autenticada, mas ainda não possui acesso ao Cacau. Peça a um administrador para liberar seu acesso.'

export const emailVerificationRequiredMessage =
  'Verifique seu e-mail antes de acessar o Cacau. Use o código enviado ou solicite um novo.'

export const invalidSignUpMessage =
  'Não foi possível concluir o cadastro. Confira os dados e tente novamente.'

export const invalidOtpMessage =
  'Não foi possível verificar o código. Solicite um novo código e tente novamente.'

export const otpSentMessage =
  'Se o endereço puder ser verificado, enviaremos um código para o seu e-mail.'

export const passwordResetRequestMessage =
  'Se houver uma conta compatível, enviaremos instruções para o e-mail informado.'

export const invalidPasswordResetMessage =
  'Não foi possível redefinir a senha. Solicite um novo link e tente novamente.'

type NeonAuthResult = Promise<{ error: unknown | null }>

export type NeonAuthCredentialsClient = {
  signIn: {
    email: (input: { email: string; password: string }) => NeonAuthResult
  }
  signUp: {
    email: (input: {
      name: string
      email: string
      password: string
    }) => NeonAuthResult
  }
  emailOtp: {
    sendVerificationOtp: (input: {
      email: string
      type: 'email-verification'
    }) => NeonAuthResult
    verifyEmail: (input: { email: string; otp: string }) => NeonAuthResult
  }
  signOut: () => NeonAuthResult
}

export type NeonAuthPasswordResetClient = {
  requestPasswordReset: (input: {
    email: string
    redirectTo: string
  }) => NeonAuthResult
  resetPassword: (input: {
    newPassword: string
    token: string
  }) => NeonAuthResult
}

export async function signInWithEmailPassword(
  auth: NeonAuthCredentialsClient,
  input: { email: string; password: string },
) {
  try {
    const result = await auth.signIn.email(input)
    return result.error
      ? { ok: false, message: invalidLoginMessage }
      : { ok: true }
  } catch {
    return { ok: false, message: unavailableLoginMessage }
  }
}

export async function signUpWithEmailPassword(
  auth: NeonAuthCredentialsClient,
  input: { name: string; email: string; password: string },
) {
  try {
    // Always attempt the same OTP delivery step. An existing unverified
    // identity can continue here, while the visible response stays identical.
    await auth.signUp.email(input)
    await auth.emailOtp.sendVerificationOtp({
      email: input.email,
      type: 'email-verification',
    })
  } catch {
    // Intentionally opaque: provider failures and account existence must not
    // select a different message, status, or next screen.
  }

  return { ok: true, message: otpSentMessage }
}

export async function resendEmailVerificationOtp(
  auth: NeonAuthCredentialsClient,
  input: { email: string },
) {
  try {
    const result = await auth.emailOtp.sendVerificationOtp({
      email: input.email,
      type: 'email-verification',
    })
    return result.error
      ? { ok: false, message: otpSentMessage }
      : { ok: true, message: otpSentMessage }
  } catch {
    return { ok: false, message: unavailableLoginMessage }
  }
}

export async function verifyEmailVerificationOtp(
  auth: NeonAuthCredentialsClient,
  input: { email: string; otp: string },
) {
  try {
    const result = await auth.emailOtp.verifyEmail(input)
    return result.error
      ? { ok: false, message: invalidOtpMessage }
      : { ok: true }
  } catch {
    return { ok: false, message: unavailableLoginMessage }
  }
}

export async function signOutCurrentSession(auth: NeonAuthCredentialsClient) {
  try {
    const result = await auth.signOut()
    return result.error
      ? { ok: false, message: unavailableLoginMessage }
      : { ok: true }
  } catch {
    return { ok: false, message: unavailableLoginMessage }
  }
}

/**
 * Keeps the request response identical whether or not the address is known.
 * Provider and transport failures are deliberately not exposed to the caller.
 */
export async function requestPasswordReset(
  auth: NeonAuthPasswordResetClient,
  input: { email: string; redirectTo: string },
) {
  try {
    const result = await auth.requestPasswordReset(input)
    return {
      ok: !result.error,
      message: passwordResetRequestMessage,
    }
  } catch {
    return { ok: false, message: passwordResetRequestMessage }
  }
}

export async function resetPasswordWithToken(
  auth: NeonAuthPasswordResetClient,
  input: { newPassword: string; token: string },
) {
  try {
    const result = await auth.resetPassword(input)
    return result.error
      ? { ok: false, message: invalidPasswordResetMessage }
      : { ok: true }
  } catch {
    return { ok: false, message: invalidPasswordResetMessage }
  }
}
