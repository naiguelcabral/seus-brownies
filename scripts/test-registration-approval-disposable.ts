// Fixed synthetic loopback fixture. Never reads dotenv or a real database URL.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { eq } from 'drizzle-orm'

import * as schema from '../src/db/schema'
import { z } from 'zod'
import {
  approveRegistration,
  findRegistrationCandidate,
} from '../src/features/auth/registration-approval.server'
import {
  createRegistrationDirectory,
  readPasswordResetSubject,
} from '../src/features/auth/registration-directory.server'
import {
  registrationRevision,
  RegistrationApprovalError,
} from '../src/features/auth/registration-approval'
import type { AppPrincipal } from '../src/features/auth/principal'
import type { DirectoryIdentity } from '../src/features/auth/registration-approval'

assert.deepEqual(process.argv.slice(2), ['--ack-disposable-postgres17'])
const connection = {
  host: '127.0.0.1',
  port: 5439,
  user: 'recovery_fixture',
  password: 'synthetic-recovery-only',
  database: 'cacau_recovery',
}
const admin = new pg.Client(connection)
await admin.connect()
const identity = (
  await admin.query<Record<string, unknown>>(
    "SELECT current_database() db, current_user role, current_setting('server_version_num') version",
  )
).rows[0]
assert.equal(identity?.db, connection.database)
assert.equal(identity.role, connection.user)
assert.equal(Math.floor(Number(identity.version) / 10000), 17)

const suffix = `${Date.now()}_${process.pid}`
const applicationDatabase = `cacau_approval_${suffix}`
const authDatabase = `cacau_directory_${suffix}`
const directoryRole = `cacau_directory_fixture_${suffix}`
for (const name of [applicationDatabase, authDatabase, directoryRole])
  assert.match(name, /^[a-z0-9_]+$/)
await admin.query(`CREATE DATABASE "${applicationDatabase}"`)
await admin.query(`CREATE DATABASE "${authDatabase}"`)
const pool = new pg.Pool({
  ...connection,
  database: applicationDatabase,
  max: 4,
})
const provider = new pg.Client({ ...connection, database: authDatabase })
await provider.connect()
const db = drizzle(pool, { schema })
const candidate = z.object({ folder: z.string() }).parse(
  JSON.parse(
    execFileSync(process.execPath, ['scripts/migration-chain-prepare.mjs'], {
      encoding: 'utf8',
    }),
  ),
)
let fixtures = 0
const passed: string[] = []
const actorUpdatedAt = new Date(Date.now() - 60_000)
const manager: AppPrincipal = {
  id: 'b8cd40fb-58bd-4631-8514-4bfd6474186f',
  email: 'manager@example.test',
  emailVerified: true,
  role: 'manager',
  sessionCreatedAt: Date.now() - 1_000,
}
const owner: AppPrincipal = {
  ...manager,
  id: 'ecbf8eac-441a-4aa2-93d7-1eadcf65a032',
  email: 'owner@example.test',
  role: 'owner',
}

async function fixtureIdentity(changes: Partial<DirectoryIdentity> = {}) {
  const user = {
    id: crypto.randomUUID(),
    name: 'Cadastro sintético',
    email: `person-${++fixtures}@example.test`,
    emailVerified: true,
    banned: false,
    updatedAt: new Date(),
    ...changes,
  }
  await provider.query(
    'INSERT INTO neon_auth."user" (id,name,email,"emailVerified",banned,"updatedAt",private_marker) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [
      user.id,
      user.name,
      user.email,
      user.emailVerified,
      user.banned,
      user.updatedAt,
      'synthetic-private-marker',
    ],
  )
  return user
}

async function approvalInput(user: DirectoryIdentity) {
  return {
    authUserId: user.id,
    revision: await registrationRevision(user),
    reason: 'Cadastro validado no laboratório isolado',
    operationReference: crypto.randomUUID(),
  }
}

async function noAccess(user: DirectoryIdentity) {
  assert.equal(
    (
      await db
        .select()
        .from(schema.appUserAccess)
        .where(eq(schema.appUserAccess.authUserId, user.id))
    ).length,
    0,
  )
}

async function check(name: string, work: () => Promise<void>) {
  await work()
  passed.push(name)
  console.log(`PASS ${name}`)
}

try {
  await migrate(db, { migrationsFolder: candidate.folder })
  await provider.query('CREATE SCHEMA neon_auth')
  await provider.query(
    'CREATE TABLE neon_auth."user" (id uuid PRIMARY KEY, name text, email text, "emailVerified" boolean, banned boolean, "updatedAt" timestamptz, private_marker text)',
  )
  await provider.query('CREATE TABLE neon_auth.account (private_marker text)')
  await provider.query(
    'CREATE TABLE neon_auth.verification (id uuid PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL)',
  )
  // Only fixture names differ from the review-only operator proposal.
  const roleProposal = readFileSync(
    new URL('./auth-directory-role.proposed.sql', import.meta.url),
    'utf8',
  )
    .replaceAll('cacau_auth_directory', directoryRole)
    .replaceAll('neondb', authDatabase)
  await provider.query(roleProposal)
  await provider.query(
    `ALTER ROLE "${directoryRole}" LOGIN PASSWORD 'synthetic-directory-only'`,
  )
  const directoryUrl = new URL(`postgresql://127.0.0.1:5439/${authDatabase}`)
  directoryUrl.username = directoryRole
  directoryUrl.password = 'synthetic-directory-only'
  const directory = createRegistrationDirectory({
    AUTH_DIRECTORY_DATABASE_URL: directoryUrl.toString(),
  })
  for (const actor of [manager, owner]) {
    await fixtureIdentity({ id: actor.id, email: actor.email })
    await db.insert(schema.appUserAccess).values({
      authUserId: actor.id,
      role: actor.role,
      roleUpdatedAt: actorUpdatedAt,
    })
  }

  await check(
    'directory role reads only approved provider columns, with no credential access or writes',
    async () => {
      const reader = new pg.Client(directoryUrl.toString())
      await reader.connect()
      try {
        await assert.rejects(reader.query('SELECT * FROM neon_auth."user"'), {
          code: '42501',
        })
        await assert.rejects(reader.query('SELECT * FROM neon_auth.account'), {
          code: '42501',
        })
        await assert.rejects(
          reader.query('SELECT * FROM neon_auth.verification'),
          { code: '42501' },
        )
        assert.equal(
          (await reader.query('SHOW default_transaction_read_only')).rows[0]
            .default_transaction_read_only,
          'on',
        )
        // Prove grants still block writes even if a client disables its default.
        await reader.query('SET default_transaction_read_only=off')
        await assert.rejects(
          reader.query('UPDATE neon_auth."user" SET banned=false'),
          { code: '42501' },
        )
        await assert.rejects(
          reader.query('CREATE TABLE neon_auth.unwanted (id int)'),
          { code: '42501' },
        )
      } finally {
        await reader.end()
      }
    },
  )

  await check(
    'reset subject function reveals only a unique unexpired provider identity',
    async () => {
      const user = await fixtureIdentity()
      const token = `synthetic-reset-${crypto.randomUUID()}`
      const environment = {
        AUTH_DIRECTORY_DATABASE_URL: directoryUrl.toString(),
      }
      await provider.query(
        'INSERT INTO neon_auth.verification VALUES ($1,$2,$3,$4)',
        [
          crypto.randomUUID(),
          `reset-password:${token}`,
          user.id,
          new Date(Date.now() + 60_000),
        ],
      )
      assert.equal(await readPasswordResetSubject(environment, token), user.id)
      assert.equal(
        await readPasswordResetSubject(environment, 'synthetic-unknown'),
        null,
      )
      assert.equal(
        await readPasswordResetSubject(environment, `${token}' OR true --`),
        null,
      )
      await provider.query(
        'UPDATE neon_auth.verification SET "expiresAt"=$1 WHERE identifier=$2',
        [new Date(Date.now() - 1_000), `reset-password:${token}`],
      )
      assert.equal(await readPasswordResetSubject(environment, token), null)
      await provider.query(
        'UPDATE neon_auth.verification SET "expiresAt"=$1 WHERE identifier=$2',
        [new Date(Date.now() + 60_000), `reset-password:${token}`],
      )
      await provider.query(
        'INSERT INTO neon_auth.verification VALUES ($1,$2,$3,$4)',
        [
          crypto.randomUUID(),
          `reset-password:${token}`,
          user.id,
          new Date(Date.now() + 60_000),
        ],
      )
      await assert.rejects(
        readPasswordResetSubject(environment, token),
        RegistrationApprovalError,
      )
    },
  )

  await check(
    'manager looks up trusted identity and atomically grants only employee with audit',
    async () => {
      const user = await fixtureIdentity()
      const found = await findRegistrationCandidate(
        db,
        directory,
        manager,
        user.email,
      )
      assert.equal(found.id, user.id)
      const input = await approvalInput(user)
      assert.deepEqual(
        await approveRegistration(db, directory, manager, input),
        { approved: true, replayed: false },
      )
      const [access] = await db
        .select()
        .from(schema.appUserAccess)
        .where(eq(schema.appUserAccess.authUserId, user.id))
      assert.equal(access?.role, 'employee')
      const [audit] = await db
        .select()
        .from(schema.authAuditEvents)
        .where(eq(schema.authAuditEvents.requestId, input.operationReference))
      assert.equal(audit?.actorAuthUserId, manager.id)
      assert.equal(audit.targetId, String(access.id))
      assert.deepEqual(audit.metadata, {
        reasonCode: 'registration_approved',
        reason: input.reason,
        revision: input.revision,
        operationReference: input.operationReference,
        before: null,
        after: { role: 'employee', isActive: true },
        sessionNotBefore: access.roleUpdatedAt.toISOString(),
      })
      assert.ok(
        access.roleUpdatedAt.getTime() > (manager.sessionCreatedAt ?? 0),
      )
    },
  )

  await check(
    'identical replay creates neither a second access nor a second audit event',
    async () => {
      const user = await fixtureIdentity()
      const input = await approvalInput(user)
      const results = await Promise.all([
        approveRegistration(db, directory, manager, input),
        approveRegistration(db, directory, manager, input),
      ])
      assert.deepEqual(results.map((result) => result.replayed).sort(), [
        false,
        true,
      ])
      assert.deepEqual(
        await approveRegistration(db, directory, manager, {
          ...input,
          operationReference: input.operationReference.toUpperCase(),
        }),
        { approved: true, replayed: true },
      )
      assert.equal(
        (
          await db
            .select()
            .from(schema.authAuditEvents)
            .where(
              eq(schema.authAuditEvents.requestId, input.operationReference),
            )
        ).length,
        1,
      )
      assert.equal(
        (
          await db
            .select()
            .from(schema.appUserAccess)
            .where(eq(schema.appUserAccess.authUserId, user.id))
        ).length,
        1,
      )
    },
  )

  await check(
    'concurrent distinct approvals cannot duplicate or escalate a grant',
    async () => {
      const user = await fixtureIdentity()
      const results = await Promise.allSettled([
        approveRegistration(db, directory, manager, await approvalInput(user)),
        approveRegistration(db, directory, owner, await approvalInput(user)),
      ])
      assert.equal(
        results.filter((result) => result.status === 'fulfilled').length,
        1,
      )
      assert.equal(
        results.filter((result) => result.status === 'rejected').length,
        1,
      )
      assert.equal(
        (
          await db
            .select()
            .from(schema.appUserAccess)
            .where(eq(schema.appUserAccess.authUserId, user.id))
        ).length,
        1,
      )
    },
  )

  await check(
    'consumed reference cannot approve a different target or a changed reason',
    async () => {
      const first = await fixtureIdentity()
      const second = await fixtureIdentity()
      const input = await approvalInput(first)
      await approveRegistration(db, directory, manager, input)
      await assert.rejects(
        approveRegistration(db, directory, manager, {
          ...input,
          authUserId: second.id,
        }),
        RegistrationApprovalError,
      )
      await assert.rejects(
        approveRegistration(db, directory, manager, {
          ...input,
          reason: 'Outro motivo válido',
        }),
        RegistrationApprovalError,
      )
      await noAccess(second)
    },
  )

  await check(
    'reference consumed by a different auth action cannot authorize a grant',
    async () => {
      const user = await fixtureIdentity()
      const input = await approvalInput(user)
      await db.insert(schema.authAuditEvents).values({
        action: 'login',
        outcome: 'failure',
        requestId: input.operationReference,
      })
      await assert.rejects(
        approveRegistration(db, directory, manager, input),
        RegistrationApprovalError,
      )
      await noAccess(user)
    },
  )

  await check(
    'changed access cannot be confirmed by replaying its old grant receipt',
    async () => {
      const user = await fixtureIdentity()
      const input = await approvalInput(user)
      await approveRegistration(db, directory, manager, input)
      await db
        .update(schema.appUserAccess)
        .set({ roleUpdatedAt: new Date(Date.now() + 1_000) })
        .where(eq(schema.appUserAccess.authUserId, user.id))
      await assert.rejects(
        approveRegistration(db, directory, manager, input),
        RegistrationApprovalError,
      )
    },
  )

  await check(
    'provider identity changes after lookup invalidate approval',
    async () => {
      const user = await fixtureIdentity()
      const input = await approvalInput(user)
      await provider.query('UPDATE neon_auth."user" SET email=$1 WHERE id=$2', [
        'changed@example.test',
        user.id,
      ])
      await assert.rejects(
        approveRegistration(db, directory, manager, input),
        RegistrationApprovalError,
      )
      await noAccess(user)
    },
  )

  for (const changes of [
    { emailVerified: false },
    { banned: true },
    { name: '' },
  ]) {
    await check(
      `invalid provider registration is rejected (${Object.keys(changes)[0]})`,
      async () => {
        const user = await fixtureIdentity(changes)
        await assert.rejects(
          approveRegistration(
            db,
            directory,
            manager,
            await approvalInput(user),
          ),
          RegistrationApprovalError,
        )
        await noAccess(user)
      },
    )
  }

  await check(
    'provider failure cannot leave an access row or success audit',
    async () => {
      const user = await fixtureIdentity()
      const input = await approvalInput(user)
      const unavailable = {
        ...directory,
        findById: async () => {
          throw new RegistrationApprovalError()
        },
      }
      await assert.rejects(
        approveRegistration(db, unavailable, manager, input),
        RegistrationApprovalError,
      )
      await noAccess(user)
      assert.equal(
        (
          await db
            .select()
            .from(schema.authAuditEvents)
            .where(
              eq(schema.authAuditEvents.requestId, input.operationReference),
            )
        ).length,
        0,
      )
    },
  )

  await check('late audit failure rolls back the employee grant', async () => {
    await pool.query(
      "CREATE FUNCTION fail_approval_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.metadata->>'reason'='late-audit-failure' THEN RAISE EXCEPTION 'synthetic-audit-failure'; END IF; RETURN NEW; END $$",
    )
    await pool.query(
      'CREATE TRIGGER fail_approval_audit BEFORE INSERT ON auth_audit_events FOR EACH ROW EXECUTE FUNCTION fail_approval_audit()',
    )
    const user = await fixtureIdentity()
    const input = {
      ...(await approvalInput(user)),
      reason: 'late-audit-failure',
    }
    await assert.rejects(approveRegistration(db, directory, manager, input))
    await noAccess(user)
    assert.equal(
      (
        await db
          .select()
          .from(schema.authAuditEvents)
          .where(eq(schema.authAuditEvents.requestId, input.operationReference))
      ).length,
      0,
    )
  })

  await check(
    'revoked or downgraded approver cannot use a previously resolved principal',
    async () => {
      const user = await fixtureIdentity()
      const input = await approvalInput(user)
      await db
        .update(schema.appUserAccess)
        .set({ isActive: false })
        .where(eq(schema.appUserAccess.authUserId, manager.id))
      await assert.rejects(approveRegistration(db, directory, manager, input))
      await db
        .update(schema.appUserAccess)
        .set({ isActive: true, role: 'employee' })
        .where(eq(schema.appUserAccess.authUserId, manager.id))
      await assert.rejects(approveRegistration(db, directory, manager, input))
      await noAccess(user)
      await db
        .update(schema.appUserAccess)
        .set({ role: 'manager' })
        .where(eq(schema.appUserAccess.authUserId, manager.id))
    },
  )

  await check(
    'provider-blocked approver cannot use cached session identity',
    async () => {
      const user = await fixtureIdentity()
      await provider.query(
        'UPDATE neon_auth."user" SET banned=true WHERE id=$1',
        [manager.id],
      )
      await assert.rejects(
        approveRegistration(db, directory, manager, await approvalInput(user)),
        RegistrationApprovalError,
      )
      await noAccess(user)
      await provider.query(
        'UPDATE neon_auth."user" SET banned=false WHERE id=$1',
        [manager.id],
      )
    },
  )

  await check(
    'old session cannot approve after actor role update',
    async () => {
      const user = await fixtureIdentity()
      await db
        .update(schema.appUserAccess)
        .set({ roleUpdatedAt: new Date() })
        .where(eq(schema.appUserAccess.authUserId, manager.id))
      await assert.rejects(
        approveRegistration(db, directory, manager, await approvalInput(user)),
        RegistrationApprovalError,
      )
      await noAccess(user)
      await db
        .update(schema.appUserAccess)
        .set({ roleUpdatedAt: actorUpdatedAt })
        .where(eq(schema.appUserAccess.authUserId, manager.id))
    },
  )

  await check(
    'existing inactive access is never reactivated and existing owner is never changed',
    async () => {
      const user = await fixtureIdentity()
      await db
        .insert(schema.appUserAccess)
        .values({ authUserId: user.id, role: 'employee', isActive: false })
      await assert.rejects(
        approveRegistration(db, directory, manager, await approvalInput(user)),
        RegistrationApprovalError,
      )
      const [existing] = await db
        .select()
        .from(schema.appUserAccess)
        .where(eq(schema.appUserAccess.authUserId, user.id))
      assert.equal(existing?.isActive, false)
      await assert.rejects(
        approveRegistration(db, directory, manager, {
          ...(await approvalInput(user)),
          authUserId: owner.id,
        }),
        RegistrationApprovalError,
      )
      const [currentOwner] = await db
        .select()
        .from(schema.appUserAccess)
        .where(eq(schema.appUserAccess.authUserId, owner.id))
      assert.equal(currentOwner?.role, 'owner')
      assert.equal(currentOwner.isActive, true)
    },
  )

  await check(
    'self approval and unexpected role input are rejected',
    async () => {
      const user = await fixtureIdentity()
      const input = await approvalInput(user)
      await assert.rejects(
        approveRegistration(db, directory, manager, {
          ...input,
          authUserId: manager.id,
        }),
      )
      await assert.rejects(
        approveRegistration(db, directory, manager, {
          ...input,
          ...{ role: 'owner' },
        }),
      )
      await noAccess(user)
    },
  )
  console.log(
    `PASS registration approval: ${passed.length} PostgreSQL 17 cases; separate directory database; no shared environment used`,
  )
} finally {
  rmSync(candidate.folder, { recursive: true, force: true })
  await provider.end()
  await pool.end()
  await admin.end()
}
