import pg from 'pg'
import { z } from 'zod'

import {
  directoryIdentity,
  RegistrationApprovalError,
} from './registration-approval'
import type { RegistrationDirectory } from './registration-approval'

async function queryDirectory(
  environment: Record<string, string | undefined>,
  text: string,
  value: string,
) {
  const connectionString = environment.AUTH_DIRECTORY_DATABASE_URL
  if (!connectionString) {
    throw new RegistrationApprovalError(
      'A verificação de cadastros está indisponível. Tente novamente mais tarde.',
    )
  }

  const client = new pg.Client({
    connectionString,
    application_name: 'cacau-auth-directory',
    connectionTimeoutMillis: 5_000,
    query_timeout: 5_000,
  })
  client.on('error', () => {
    /* Never expose provider/connection details. */
  })
  try {
    await client.connect()
    await client.query('BEGIN READ ONLY')
    await client.query("SET LOCAL statement_timeout = '5s'")
    const result = await client.query<Record<string, unknown>>(text, [value])
    await client.query('COMMIT')
    return result.rows
  } catch {
    throw new RegistrationApprovalError(
      'A verificação de cadastros está indisponível. Tente novamente mais tarde.',
    )
  } finally {
    await client.end().catch(() => undefined)
  }
}

/** A separate, column-limited read role on the actual Auth branch. */
export function createRegistrationDirectory(
  environment: Record<string, string | undefined>,
): RegistrationDirectory {
  async function read(kind: 'id' | 'email', value: string) {
    const rows = await queryDirectory(
      environment,
      `SELECT id, name, email, "emailVerified", coalesce(banned, false) AS banned, "updatedAt"
       FROM neon_auth."user"
       WHERE ${kind === 'id' ? 'id = $1' : 'lower(email) = lower($1)'}
       LIMIT 2`,
      value,
    )
    if (rows.length === 0) return null
    if (rows.length !== 1) throw new RegistrationApprovalError()
    const parsed = directoryIdentity.safeParse(rows[0])
    if (!parsed.success) throw new RegistrationApprovalError()
    return parsed.data
  }
  return {
    findByEmail: (email) => read('email', email),
    findById: (id) => read('id', id),
  }
}

/** The restricted provider function returns identity only, never token records. */
export async function readPasswordResetSubject(
  environment: Record<string, string | undefined>,
  token: string,
) {
  const rows = await queryDirectory(
    environment,
    'SELECT auth_user_id FROM cacau_security.password_reset_subject($1)',
    token,
  )
  if (rows.length === 0) return null
  if (rows.length !== 1) throw new RegistrationApprovalError()
  return z.object({ auth_user_id: z.string().uuid() }).parse(rows[0])
    .auth_user_id
}
