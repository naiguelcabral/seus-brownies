import { z } from 'zod'

export const registrationLookupInput = z
  .object({
    email: z.string().trim().email().max(320),
  })
  .strict()

export const registrationApprovalInput = z
  .object({
    authUserId: z.string().trim().min(1).max(191),
    revision: z.string().regex(/^[a-f0-9]{64}$/),
    reason: z.string().trim().min(5).max(500),
    operationReference: z
      .string()
      .uuid()
      .transform((value) => value.toLowerCase()),
  })
  .strict()

/** Only the provider directory adapter may supply this identity. */
export const directoryIdentity = z.object({
  id: z.string().trim().min(1).max(191),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  emailVerified: z.boolean(),
  banned: z.boolean(),
  updatedAt: z.coerce.date(),
})

export type DirectoryIdentity = z.infer<typeof directoryIdentity>
export type RegistrationApprovalInput = z.infer<
  typeof registrationApprovalInput
>
export type RegistrationDirectory = {
  findByEmail: (email: string) => Promise<DirectoryIdentity | null>
  findById: (id: string) => Promise<DirectoryIdentity | null>
}

export class RegistrationApprovalError extends Error {
  constructor(
    message = 'Não foi possível aprovar este cadastro. Verifique os dados e tente novamente.',
  ) {
    super(message)
    this.name = 'RegistrationApprovalError'
  }
}

export function assertEligibleRegistration(user: unknown) {
  const parsed = directoryIdentity.safeParse(user)
  if (!parsed.success || !parsed.data.emailVerified || parsed.data.banned) {
    throw new RegistrationApprovalError(
      'O cadastro precisa estar completo, com e-mail confirmado e sem bloqueio.',
    )
  }
  return parsed.data
}

/** Detects changes between the displayed identity and the approval write. */
export async function registrationRevision(user: DirectoryIdentity) {
  const payload = JSON.stringify([
    user.id,
    user.name,
    user.email.toLowerCase(),
    user.emailVerified,
    user.banned,
    user.updatedAt.toISOString(),
  ])
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload),
  )
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
}
