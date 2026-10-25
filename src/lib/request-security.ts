import { maxRequestBodyBytes } from './input-limits'

export function requestSecurityHeaders(request: Request) {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    // Observe compatibility with hydration and Turnstile before enforcement.
    'Content-Security-Policy-Report-Only': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self' https://challenges.cloudflare.com",
      'frame-src https://challenges.cloudflare.com',
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; '),
  }
  if (new URL(request.url).protocol === 'https:') {
    headers['Strict-Transport-Security'] = 'max-age=31536000'
  }
  return headers
}

export function secureResponse(
  response: Response,
  headers: Record<string, string>,
) {
  const merged = new Headers(response.headers)
  for (const [name, value] of Object.entries(headers)) merged.set(name, value)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  })
}

/** Bound bytes before TanStack deserializes input, even without Content-Length. */
export async function rejectExcessiveRequestBody(
  request: Request,
): Promise<Response | null> {
  if (!request.body) return null
  const tooLarge = () =>
    Response.json({ error: 'payload_too_large' }, { status: 413 })
  const declared = request.headers.get('content-length')
  if (
    declared &&
    /^\d+$/.test(declared) &&
    Number(declared) > maxRequestBodyBytes
  ) {
    void request.body.cancel().catch(() => undefined)
    return tooLarge()
  }
  const reader = request.clone().body?.getReader()
  if (!reader) return null
  let size = 0
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) return null
      size += chunk.value.byteLength
      if (size > maxRequestBodyBytes) {
        // Cancel both tee branches; awaiting only one would deadlock on its peer.
        void reader.cancel().catch(() => undefined)
        void request.body.cancel().catch(() => undefined)
        return tooLarge()
      }
    }
  } catch {
    void reader.cancel().catch(() => undefined)
    void request.body.cancel().catch(() => undefined)
    return Response.json({ error: 'invalid_request_body' }, { status: 400 })
  } finally {
    reader.releaseLock()
  }
}
