import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createConfiguredNeonAuthServer } from './configured-neon-auth.server'
import {
  signInWithEmailPassword,
  signOutCurrentSession,
  unavailableLoginMessage,
} from './login-actions'

const loginInput = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128),
})

export const loginWithEmailPassword = createServerFn({ method: 'POST' })
  .validator(loginInput)
  .handler(async ({ data }) => {
    const auth = createConfiguredNeonAuthServer(process.env)
    if (!auth) return { ok: false, message: unavailableLoginMessage }
    return signInWithEmailPassword(auth, data)
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const auth = createConfiguredNeonAuthServer(process.env)
  if (!auth) return { ok: true }
  return signOutCurrentSession(auth)
})
