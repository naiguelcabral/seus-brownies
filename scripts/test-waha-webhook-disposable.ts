import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import pg from 'pg'
import { receiveWahaWebhook } from '../src/features/whatsapp/waha-persistence.server'

assert.equal(process.argv[2], '--ack-disposable-postgres17')
const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 5444,
  user: 'waha_fixture',
  password: 'synthetic-waha-test',
  database: 'cacau_waha_fixture',
})
const origin = 'https://cacau-v1-piloto.naiguelcabral.workers.dev'
const secret = 'synthetic-test-key-32-characters-long'
try {
  const identity = (
    await pool.query(
      "select current_database() db, current_user actor, current_setting('server_version_num')::int version",
    )
  ).rows[0]
  assert.equal(identity.db, 'cacau_waha_fixture')
  assert.equal(identity.actor, 'waha_fixture')
  assert.ok(identity.version >= 170000 && identity.version < 180000)
  assert.equal(
    Number(
      (
        await pool.query(
          "select count(*) from pg_tables where schemaname='public'",
        )
      ).rows[0].count,
    ),
    0,
  )
  const ddl = execFileSync(
    './node_modules/.bin/drizzle-kit',
    ['export', '--schema=./src/db/schema.ts', '--dialect=postgresql'],
    { encoding: 'utf8', env: { PATH: process.env.PATH } },
  )
  await pool.query(ddl)
  await pool.query(
    "insert into app_user_access(auth_user_id,role,is_active) values ('fixture-owner','owner',true),('fixture-manager','manager',true)",
  )
  process.env.DATABASE_URL =
    'postgresql://waha_fixture:synthetic-waha-test@127.0.0.1:5444/cacau_waha_fixture'
  process.env.WAHA_PILOT_ENABLED = '1'
  process.env.PASSWORD_RESET_REDIRECT_ORIGIN = origin
  process.env.WAHA_WEBHOOK_HMAC_KEY = secret
  process.env.WAHA_PILOT_SESSION = 'fixture'
  process.env.WAHA_PILOT_PARTICIPANTS = JSON.stringify([
    { phone: '+15550101234', authUserId: 'fixture-owner', active: true },
    { phone: '+15550105678', authUserId: 'fixture-manager', active: true },
  ])
  function request(text: string) {
    const raw = JSON.stringify({
      event: 'message',
      session: 'fixture',
      payload: {
        id: 'fixture-message-1',
        from: '15550101234@c.us',
        fromMe: false,
        hasMedia: false,
        body: text,
      },
    })
    return new Request(`${origin}/api/whatsapp/waha`, {
      method: 'POST',
      body: raw,
      headers: {
        'x-webhook-hmac-algorithm': 'sha512',
        'x-webhook-hmac': createHmac('sha512', secret)
          .update(raw)
          .digest('hex'),
      },
    })
  }
  const responses = await Promise.all(
    Array.from({ length: 6 }, () =>
      receiveWahaWebhook(request('consulta'), async () => true),
    ),
  )
  assert.ok(responses.every((r) => r.status === 202))
  const states = await Promise.all(responses.map((r) => r.json()))
  assert.equal(states.filter((s) => s.state === 'received').length, 1)
  assert.equal(states.filter((s) => s.state === 'duplicate').length, 5)
  assert.equal(
    (await receiveWahaWebhook(request('outra consulta'), async () => true))
      .status,
    409,
  )
  const rows = (
    await pool.query('select status, payload from message_processing_records')
  ).rows
  assert.equal(rows.length, 1)
  assert.equal(rows[0].status, 'received')
  assert.equal(rows[0].payload.actor, 'fixture-owner')
  await pool.query(
    "update app_user_access set is_active=false where auth_user_id='fixture-owner'",
  )
  assert.equal(
    (await receiveWahaWebhook(request('consulta'), async () => true)).status,
    403,
  )
  assert.equal(
    Number(
      (await pool.query('select count(*) from message_processing_records'))
        .rows[0].count,
    ),
    1,
  )
  console.log(
    'PASS: authenticated user, concurrent idempotency, conflict, and disabled account in disposable PostgreSQL 17',
  )
} finally {
  await pool.end()
}
