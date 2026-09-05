import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createConfiguredNeonAuthServer } from './configured-neon-auth.server'
import {
  resendEmailVerificationOtp,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signOutCurrentSession,
  unavailableLoginMessage,
  verifyEmailVerificationOtp,
} from './login-actions'

const loginInput = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128),
})

const signUpInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
})

const emailInput = z.object({
  email: z.string().trim().email().max(320),
})

const verifyOtpInput = emailInput.extend({
  otp: z.string().trim().min(1).max(32),
})

export const loginWithEmailPassword = createServerFn({ method: 'POST' })
  .validator(loginInput)
  .handler(async ({ data }) => {
    const auth = createConfiguredNeonAuthServer(process.env)
    if (!auth) return { ok: false, message: unavailableLoginMessage }
    return signInWithEmailPassword(auth, data)
  })

export const signUpWithEmailPasswordFn = createServerFn({ method: 'POST' })
  .validator(signUpInput)
  .handler(async ({ data }) => {
    const auth = createConfiguredNeonAuthServer(process.env)
    if (!auth) return { ok: false, message: unavailableLoginMessage }
    return signUpWithEmailPassword(auth, data)
  })

export const resendEmailVerificationOtpFn = createServerFn({ method: 'POST' })
  .validator(emailInput)
  .handler(async ({ data }) => {
    const auth = createConfiguredNeonAuthServer(process.env)
    if (!auth) return { ok: false, message: unavailableLoginMessage }
    return resendEmailVerificationOtp(auth, data)
  })

export const verifyEmailVerificationOtpFn = createServerFn({ method: 'POST' })
  .validator(verifyOtpInput)
  .handler(async ({ data }) => {
    const auth = createConfiguredNeonAuthServer(process.env)
    if (!auth) return { ok: false, message: unavailableLoginMessage }
    return verifyEmailVerificationOtp(auth, data)
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const auth = createConfiguredNeonAuthServer(process.env)
  if (!auth) return { ok: true }
  return signOutCurrentSession(auth)
})
