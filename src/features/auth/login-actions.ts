export const invalidLoginMessage =
  'Não foi possível iniciar a sessão. Verifique as credenciais e tente novamente.'

export const unavailableLoginMessage =
  'A autenticação não está disponível neste ambiente. Tente novamente mais tarde.'

type NeonAuthResult = Promise<{ error: unknown | null }>

export type NeonAuthCredentialsClient = {
  signIn: {
    email: (input: { email: string; password: string }) => NeonAuthResult
  }
  signOut: () => NeonAuthResult
}

export async function signInWithEmailPassword(
  auth: NeonAuthCredentialsClient,
  input: { email: string; password: string },
) {
  try {
    const result = await auth.signIn.email(input)
    return result.error ? { ok: false, message: invalidLoginMessage } : { ok: true }
  } catch {
    return { ok: false, message: unavailableLoginMessage }
  }
}

export async function signOutCurrentSession(auth: NeonAuthCredentialsClient) {
  try {
    const result = await auth.signOut()
    return result.error ? { ok: false, message: unavailableLoginMessage } : { ok: true }
  } catch {
    return { ok: false, message: unavailableLoginMessage }
  }
}
