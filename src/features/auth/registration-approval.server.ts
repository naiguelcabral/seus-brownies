import { eq, sql } from 'drizzle-orm'

import type { getDb } from '#/db/index'
import { appUserAccess, authAuditEvents } from '#/db/schema'
import { requireFirst } from '#/lib/required-value'

import { isAppRole } from './authorization'
import { assertPrincipalPermission } from './principal'
import type { AppPrincipal } from './principal'
import { sessionFollowsRoleChange } from './neon-adapter'
import {
  assertEligibleRegistration,
  registrationApprovalInput,
  registrationRevision,
  RegistrationApprovalError,
} from './registration-approval'
import type {
  RegistrationApprovalInput,
  RegistrationDirectory,
} from './registration-approval'

type Database = ReturnType<typeof getDb>

async function verifyDirectoryActor(
  directory: RegistrationDirectory,
  principal: AppPrincipal,
) {
  const actor = assertEligibleRegistration(
    await directory.findById(principal.id),
  )
  if (
    actor.id !== principal.id ||
    actor.email.toLowerCase() !== principal.email.toLowerCase()
  ) {
    throw new RegistrationApprovalError(
      'Seu cadastro mudou. Entre novamente antes de aprovar cadastros.',
    )
  }
}

export async function findRegistrationCandidate(
  db: Database,
  directory: RegistrationDirectory,
  principal: AppPrincipal,
  email: string,
) {
  assertPrincipalPermission(principal, 'access:approve')
  await verifyDirectoryActor(directory, principal)
  const user = assertEligibleRegistration(await directory.findByEmail(email))
  if (user.id === principal.id)
    throw new RegistrationApprovalError(
      'Você não pode aprovar o próprio acesso.',
    )
  const [existing] = await db
    .select({ id: appUserAccess.id })
    .from(appUserAccess)
    .where(eq(appUserAccess.authUserId, user.id))
    .limit(1)
  if (existing)
    throw new RegistrationApprovalError(
      'Este cadastro já possui um vínculo. Alterações devem ser tratadas pelo Dono.',
    )
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    revision: await registrationRevision(user),
  }
}

/** First employee grant only; existing access rows can never be updated here. */
export async function approveRegistration(
  db: Database,
  directory: RegistrationDirectory,
  principal: AppPrincipal,
  rawInput: RegistrationApprovalInput,
) {
  assertPrincipalPermission(principal, 'access:approve')
  const input = registrationApprovalInput.parse(rawInput)
  if (input.authUserId === principal.id)
    throw new RegistrationApprovalError(
      'Você não pode aprovar o próprio acesso.',
    )
  return db.transaction(async (tx) => {
    // Stable order: reference, target, then approving access row. All writers
    // of this flow serialize replay and concurrent grants without retries.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`cacau:approval:reference:${input.operationReference}`}, 0))`,
    )
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`cacau:approval:target:${input.authUserId}`}, 0))`,
    )
    const [actor] = await tx
      .select()
      .from(appUserAccess)
      .where(eq(appUserAccess.authUserId, principal.id))
      .limit(1)
      .for('update')
    if (
      !actor?.isActive ||
      !isAppRole(actor.role) ||
      !sessionFollowsRoleChange(principal.sessionCreatedAt, actor.roleUpdatedAt)
    ) {
      throw new RegistrationApprovalError(
        'Seu acesso mudou. Entre novamente antes de aprovar cadastros.',
      )
    }
    assertPrincipalPermission(
      { ...principal, role: actor.role },
      'access:approve',
    )
    await verifyDirectoryActor(directory, principal)

    const previousEvents = await tx
      .select()
      .from(authAuditEvents)
      .where(eq(authAuditEvents.requestId, input.operationReference))
      .limit(2)
    if (previousEvents.length > 1)
      throw new RegistrationApprovalError(
        'A referência de aprovação já foi utilizada.',
      )
    const [previous] = previousEvents
    const [existing] = await tx
      .select()
      .from(appUserAccess)
      .where(eq(appUserAccess.authUserId, input.authUserId))
      .limit(1)
    if (previous) {
      const metadata = previous.metadata
      const same =
        typeof metadata === 'object' &&
        metadata !== null &&
        'reasonCode' in metadata &&
        metadata.reasonCode === 'registration_approved' &&
        'revision' in metadata &&
        metadata.revision === input.revision &&
        'reason' in metadata &&
        metadata.reason === input.reason &&
        'sessionNotBefore' in metadata &&
        metadata.sessionNotBefore === existing?.roleUpdatedAt.toISOString() &&
        previous.action === 'role_changed' &&
        previous.actorAuthUserId === principal.id &&
        previous.outcome === 'success' &&
        existing?.isActive &&
        existing.role === 'employee' &&
        previous.targetType === 'access' &&
        previous.targetId === String(existing.id)
      if (!same)
        throw new RegistrationApprovalError(
          'A referência de aprovação já foi utilizada ou o acesso mudou.',
        )
      return { approved: true, replayed: true }
    }
    if (existing)
      throw new RegistrationApprovalError(
        'Este cadastro já possui um vínculo. Alterações devem ser tratadas pelo Dono.',
      )

    const user = assertEligibleRegistration(
      await directory.findById(input.authUserId),
    )
    if (
      user.id !== input.authUserId ||
      (await registrationRevision(user)) !== input.revision
    ) {
      throw new RegistrationApprovalError(
        'O cadastro mudou. Verifique os dados novamente antes de aprovar.',
      )
    }
    const created = requireFirst(
      await tx
        .insert(appUserAccess)
        .values({
          authUserId: user.id,
          role: 'employee',
          isActive: true,
          roleUpdatedAt: sql`clock_timestamp()`,
        })
        .returning(),
    )
    await tx.insert(authAuditEvents).values({
      actorAuthUserId: principal.id,
      action: 'role_changed',
      outcome: 'success',
      targetType: 'access',
      targetId: String(created.id),
      requestId: input.operationReference,
      metadata: {
        reasonCode: 'registration_approved',
        reason: input.reason,
        revision: input.revision,
        operationReference: input.operationReference,
        before: null,
        after: { role: 'employee', isActive: true },
        sessionNotBefore: created.roleUpdatedAt.toISOString(),
      },
    })
    return { approved: true, replayed: false }
  })
}
