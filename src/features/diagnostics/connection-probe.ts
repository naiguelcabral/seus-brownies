export type ProbeClient = {
  connect: () => Promise<unknown>
  query: (statement: string) => Promise<{ rows: Record<string, unknown>[] }>
  end: () => Promise<void>
}

export type ConnectionProbeResult = {
  ok: boolean
  status: 'connected' | 'disabled' | 'unavailable'
  checkedAt: string
}

/** No caller-supplied SQL, data reads, driver errors or connection details. */
export async function probeSqlConnection(
  enabled: boolean,
  createClient: () => ProbeClient,
): Promise<ConnectionProbeResult> {
  const checkedAt = new Date().toISOString()
  if (!enabled) return { ok: false, status: 'disabled', checkedAt }

  let client: ProbeClient | undefined
  let transactionStarted = false
  let connected = false
  try {
    client = createClient()
    await client.connect()
    await client.query('BEGIN READ ONLY')
    transactionStarted = true
    const result = await client.query(
      "SELECT 1 AS connection_ok, current_setting('transaction_read_only') AS read_only",
    )
    connected =
      result.rows.length === 1 &&
      result.rows[0]?.connection_ok === 1 &&
      result.rows[0].read_only === 'on'
  } catch {
    connected = false
  } finally {
    if (client) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK')
        } catch {
          connected = false
        }
      }
      try {
        await client.end()
      } catch {
        connected = false
      }
    }
  }
  return {
    ok: connected,
    status: connected ? 'connected' : 'unavailable',
    checkedAt,
  }
}
