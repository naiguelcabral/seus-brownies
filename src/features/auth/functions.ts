import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createConfiguredNeonAuthServer } from './configured-neon-auth.server'
import {
  hashAuthIdentity,
  protectPublicAuthAction,
} from './auth-rate-limit.server'
import type { AuthRateLimitScope } from './auth-rate-limit'
import {
  createDatabaseLoginAttemptStore,
  evaluateLoginAttempt,
} from './login-attempts.server'
import { decideLoginAttempt } from './login-security'
import {
  invalidLoginMessage,
  invalidOtpMessage,
  invalidPasswordResetMessage,
  otpSentMessage,
  passwordResetRequestMessage,
  resendEmailVerificationOtp,
  resetPasswordWithToken,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signOutCurrentSession,
  unavailableLoginMessage,
  verifyEmailVerificationOtp,
} from './login-actions'
import type { AuthActionAuditContext } from './login-actions'
import {
  executeAuditedPasswordReset,
  isAuditedPasswordResetSuccessful,
} from './password-reset-audit'
import { createAuthAuditTelemetry } from './auth-audit-telemetry.server'
import { createPasswordResetTelemetry } from './password-reset-telemetry.server'
import { requestTanStackNeonPasswordReset } from './neon-tanstack-adapter.server'
import {
  readNeonAuthRuntimeConfig,
  readPasswordResetRedirectTo,
} from './runtime-config.server'

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

const passwordResetInput = emailInput

const publicAuthInput = z.object({
  turnstileToken: z.string().trim().min(1).max(2048).optional(),
})

const passwordResetCompletionInput = z
  .object({
    token: z.string().trim().min(1).max(2048),
    newPassword: z.string().min(8).max(128),
  })
  .merge(publicAuthInput)

const loginWithProtectionInput = loginInput.merge(publicAuthInput)
const signUpWithProtectionInput = signUpInput.merge(publicAuthInput)
const emailWithProtectionInput = emailInput.merge(publicAuthInput)
const verifyOtpWithProtectionInput = verifyOtpInput.merge(publicAuthInput)
const passwordResetWithProtectionInput =
  passwordResetInput.merge(publicAuthInput)

async function getAuthAuditWriter() {
  if (!process.env.DATABASE_URL) return null
  try {
    const { createDatabaseAuthAuditWriter } =
      await import('./audit-writer.server')
    return createDatabaseAuthAuditWriter()
  } catch {
    return null
  }
}

async function getAuthActionAuditContext(): Promise<
  AuthActionAuditContext | undefined
> {
  const writer = await getAuthAuditWriter()
  return writer
    ? {
        writer,
        requestId: crypto.randomUUID(),
        telemetry: createAuthAuditTelemetry(),
      }
    : undefined
}

async function getPublicAuthProtection(
  scope: AuthRateLimitScope,
  data: { email: string; turnstileToken?: string },
  options: { forceChallenge?: boolean } = {},
) {
  return protectPublicAuthAction(
    {
      scope,
      identifier: data.email,
      turnstileToken: data.turnstileToken,
    },
    process.env,
    {},
    options,
  )
}

async function getPublicAuthProtectionForIdentifier(
  scope: AuthRateLimitScope,
  identifier: string,
  turnstileToken?: string,
) {
  return protectPublicAuthAction(
    { scope, identifier, turnstileToken },
    process.env,
  )
}

export const loginWithEmailPassword = createServerFn({ method: 'POST' })
  .validator(loginWithProtectionInput)
  .handler(async ({ data }) => {
    const pepper = process.env.AUTH_LOGIN_HASH_PEPPER
    const store = pepper ? createDatabaseLoginAttemptStore() : null
    const loginIdentity = pepper
      ? await hashAuthIdentity('login', data.email, pepper)
      : null
    const loginAttempt =
      store && loginIdentity
        ? await evaluateLoginAttempt(store, loginIdentity)
        : null
    if (loginAttempt && !loginAttempt.decision.allowed) {
      return {
        ok: false,
        message: invalidLoginMessage,
        requiresChallenge: loginAttempt.decision.requiresChallenge,
      }
    }
    const protection = await getPublicAuthProtection('login', data, {
      forceChallenge: loginAttempt?.decision.requiresChallenge === true,
    })
    if (!protection.allowed) {
      return {
        ok: false,
        message: invalidLoginMessage,
        requiresChallenge: protection.requiresChallenge,
      }
    }
    const auth = createConfiguredNeonAuthServer(process.env)
    if (!auth) return { ok: false, message: unavailableLoginMessage }
    const result = await signInWithEmailPassword(
      auth,
      {
        email: data.email,
        password: data.password,
      },
      await getAuthActionAuditContext(),
    )
    if (store && loginIdentity && result.message !== unavailableLoginMessage) {
      await store.record(loginIdentity, result.ok)
      if (!result.ok) {
        const postFailure = decideLoginAttempt({
          state: loginAttempt?.state ?? null,
          succeeded: false,
          now: new Date(),
          policy: { cooldownMs: 15 * 60 * 1000 },
        })
        return {
          ...result,
          requiresChallenge: postFailure.requiresChallenge,
        }
      }
    }
    return result
  })

export const signUpWithEmailPasswordFn = createServerFn({ method: 'POST' })
  .validator(signUpWithProtectionInput)
  .handler(async ({ data }) => {
    const protection = await getPublicAuthProtection('sign-up', data)
    if (!protection.allowed) {
      return {
        ok: false,
        message: otpSentMessage,
        requiresChallenge: protection.requiresChallenge,
      }
    }
    const auth = createConfiguredNeonAuthServer(process.env)
    if (!auth) return { ok: false, message: unavailableLoginMessage }
    return signUpWithEmailPassword(auth, {
      name: data.name,
      email: data.email,
      password: data.password,
    })
  })

export const resendEmailVerificationOtpFn = createServerFn({ method: 'POST' })
  .validator(emailWithProtectionInput)
  .handler(async ({ data }) => {
    const protection = await getPublicAuthProtection('verification-otp', data)
    if (!protection.allowed) {
      return {
        ok: false,
        message: otpSentMessage,
        requiresChallenge: protection.requiresChallenge,
      }
    }
    const auth = createConfiguredNeonAuthServer(process.env)
    if (!auth) return { ok: false, message: unavailableLoginMessage }
    return resendEmailVerificationOtp(auth, { email: data.email })
  })

export const verifyEmailVerificationOtpFn = createServerFn({ method: 'POST' })
  .validator(verifyOtpWithProtectionInput)
  .handler(async ({ data }) => {
    const protection = await getPublicAuthProtection('verification-otp', data)
    if (!protection.allowed) {
      return {
        ok: false,
        message: invalidOtpMessage,
        requiresChallenge: protection.requiresChallenge,
      }
    }
    const auth = createConfiguredNeonAuthServer(process.env)
    if (!auth) return { ok: false, message: unavailableLoginMessage }
    return verifyEmailVerificationOtp(
      auth,
      {
        email: data.email,
        otp: data.otp,
      },
      await getAuthActionAuditContext(),
    )
  })

export const requestPasswordResetFn = createServerFn({ method: 'POST' })
  .validator(passwordResetWithProtectionInput)
  .handler(async ({ data }) => {
    const requestId = crypto.randomUUID()
    const telemetry = createPasswordResetTelemetry()
    const protection = await getPublicAuthProtection('password-reset', data)
    if (!protection.allowed) {
      return {
        ok: false,
        message: passwordResetRequestMessage,
        requiresChallenge: protection.requiresChallenge,
      }
    }
    let config
    let redirectTo
    try {
      config = readNeonAuthRuntimeConfig(process.env)
      redirectTo = config
        ? readPasswordResetRedirectTo(process.env, {
            development: import.meta.env.DEV,
          })
        : null
    } catch {
      telemetry.emit({
        requestId,
        stage: 'runtime_config_missing',
      })
      return { ok: false, message: passwordResetRequestMessage }
    }
    if (!config || !redirectTo) {
      telemetry.emit({
        requestId,
        stage: 'runtime_config_missing',
      })
      return { ok: false, message: passwordResetRequestMessage }
    }

    const writer = await getAuthAuditWriter()
    if (!writer) {
      telemetry.emit({
        requestId,
        stage: 'initial_audit_failed',
      })
      return { ok: false, message: passwordResetRequestMessage }
    }

    const audit = await executeAuditedPasswordReset({
      action: 'password_reset_requested',
      requestId,
      telemetry,
      writer,
      execute: () =>
        requestTanStackNeonPasswordReset(config, {
          email: data.email,
          redirectTo,
        }),
      getOutcome: (result) => (result.ok ? 'success' : 'failure'),
      getFailureReasonCode: (result) =>
        !result.ok && result.reasonCode !== 'provider_success'
          ? result.reasonCode
          : undefined,
    })
    return {
      ok: isAuditedPasswordResetSuccessful(audit),
      message: passwordResetRequestMessage,
    }
  })

export const resetPasswordWithTokenFn = createServerFn({ method: 'POST' })
  .validator(passwordResetCompletionInput)
  .handler(async ({ data }) => {
    const protection = await getPublicAuthProtectionForIdentifier(
      'password-reset-completion',
      data.token,
      data.turnstileToken,
    )
    if (!protection.allowed) {
      return {
        ok: false,
        message: invalidPasswordResetMessage,
        requiresChallenge: protection.requiresChallenge,
      }
    }
    const auth = createConfiguredNeonAuthServer(process.env)
    if (!auth) {
      return { ok: false, message: invalidPasswordResetMessage }
    }

    const writer = await getAuthAuditWriter()
    if (!writer) return { ok: false, message: invalidPasswordResetMessage }

    const audit = await executeAuditedPasswordReset({
      action: 'password_reset_completed',
      writer,
      execute: () =>
        resetPasswordWithToken(auth, {
          newPassword: data.newPassword,
          token: data.token,
        }),
      getOutcome: (result) => (result.ok ? 'success' : 'failure'),
    })
    if (!audit.auditComplete) {
      return { ok: false, message: invalidPasswordResetMessage }
    }
    return audit.result
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const auth = createConfiguredNeonAuthServer(process.env)
  if (!auth) return { ok: true }
  return signOutCurrentSession(auth, await getAuthActionAuditContext())
})
