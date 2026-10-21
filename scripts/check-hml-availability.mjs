// Public GETs only. No session, credentials, environment loader or configurable target.
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const origin = 'https://cacau-v1-hml.naiguelcabral.workers.dev'
export async function checkHmlAvailability(fetchImpl = fetch) {
  const checks = []
  for (const path of ['/', '/login']) {
    try {
      const response = await fetchImpl(origin + path, {
        method: 'GET',
        redirect: 'manual',
        credentials: 'omit',
        headers: { accept: 'text/html' },
        signal: AbortSignal.timeout(10_000),
      })
      const location = new URL(response.headers.get('location') ?? '/', origin)
      const ok =
        path === '/'
          ? [301, 302, 303, 307, 308].includes(response.status) &&
            location.origin === origin &&
            location.pathname === '/login'
          : response.status === 200 &&
            /^text\/html(?:;|$)/i.test(
              response.headers.get('content-type') ?? '',
            )
      await response.body?.cancel()
      checks.push({ path, status: response.status, ok })
    } catch {
      // Never serialize a network exception, Location, body or response headers.
      checks.push({ path, status: null, ok: false })
    }
  }
  return {
    scope: 'hml-public-readonly',
    status: checks.every((check) => check.ok) ? 'AVAILABLE' : 'UNAVAILABLE',
    checks,
    authentication_validated: false,
    database_validated: false,
    alert_delivery_configured: false,
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length !== 2) {
    process.stderr.write('UNSUPPORTED_ARGUMENTS\n')
    process.exitCode = 1
  } else {
    const result = await checkHmlAvailability()
    process.stdout.write(JSON.stringify(result) + '\n')
    process.exitCode = result.status === 'AVAILABLE' ? 0 : 1
  }
}
