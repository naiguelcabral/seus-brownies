export const invalidLoginMessage =
  'Não foi possível iniciar a sessão. Verifique as credenciais e tente novamente.'

export const unavailableLoginMessage =
  'A autenticação não está disponível neste ambiente. Tente novamente mais tarde.'

export const invalidSignUpMessage =
  'Não foi possível concluir o cadastro. Confira os dados e tente novamente.'

export const invalidOtpMessage =
  'Não foi possível verificar o código. Solicite um novo código e tente novamente.'

export const otpSentMessage =
  'Se o endereço puder ser verificado, enviaremos um código para o seu e-mail.'

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
    const signUp = await auth.signUp.email(input)
    if (signUp.error) return { ok: false, message: invalidSignUpMessage }

    const otp = await auth.emailOtp.sendVerificationOtp({
      email: input.email,
      type: 'email-verification',
    })
    return otp.error
      ? { ok: false, message: invalidSignUpMessage }
      : { ok: true, message: otpSentMessage }
  } catch {
    return { ok: false, message: unavailableLoginMessage }
  }
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
