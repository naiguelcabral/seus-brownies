import {
  requestPasswordReset,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  verifyEmailVerificationOtp,
} from '../../../src/features/auth/login-actions'

const listeners = new Set<() => void>()
let calls: string[] = []
let newAccount = false
let password = 'synthetic-original-password'
let authenticated = false
let cachedSnapshot = '[]'

function record(action: string) {
  calls = [...calls, action]
  cachedSnapshot = JSON.stringify(calls)
  listeners.forEach((listener) => listener())
}

const auth = {
  signUp: {
    email: async (input: { password: string }) => {
      record('sign-up')
      if (newAccount) password = input.password
      return { error: newAccount ? null : { status: 409 } }
    },
  },
  signIn: {
    email: async (input: { password: string }) => {
      record('sign-in')
      authenticated = input.password === password
      return { error: authenticated ? null : { status: 401 } }
    },
  },
  emailOtp: {
    sendVerificationOtp: async () => {
      record('send-verification')
      return { error: null }
    },
    verifyEmail: async ({ otp }: { otp: string }) => {
      record('verify-email')
      return { error: otp === '123456' ? null : { status: 400 } }
    },
  },
  signOut: async () => ({ error: null }),
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const snapshot = () => cachedSnapshot
export function selectNewAccount() {
  newAccount = true
}
export function recordNavigation(to: string) {
  record(`navigate:${to}`)
}
export const signUpWithEmailPasswordFn = ({
  data,
}: {
  data: { name: string; email: string; password: string }
}) => signUpWithEmailPassword(auth, data)
export const loginWithEmailPassword = ({
  data,
}: {
  data: { email: string; password: string }
}) => signInWithEmailPassword(auth, data)
export const resendEmailVerificationOtpFn = () =>
  auth.emailOtp.sendVerificationOtp()
export const verifyEmailVerificationOtpFn = ({
  data,
}: {
  data: { email: string; otp: string }
}) => verifyEmailVerificationOtp(auth, data)
export const requestPasswordResetFn = ({ data }: { data: { email: string } }) =>
  requestPasswordReset(
    {
      requestPasswordReset: async () => {
        record('request-password-reset')
        return { error: null }
      },
      resetPassword: async () => {
        throw new Error('Este ensaio não altera senhas')
      },
    },
    { email: data.email, redirectTo: 'http://127.0.0.1/reset-simulado' },
  )
export const getSessionStatus = async () => ({
  authenticated,
  sessionPresent: authenticated,
  emailVerified: authenticated,
  role: authenticated ? 'manager' : null,
})
