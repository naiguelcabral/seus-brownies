import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start'

const securityHeadersMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const { setResponseHeaders } = await import('@tanstack/react-start/server')
    const { requestSecurityHeaders, secureResponse } =
      await import('./lib/request-security')
    const headers = requestSecurityHeaders(request)
    setResponseHeaders(new Headers(headers))
    const result = await next()
    return { ...result, response: secureResponse(result.response, headers) }
  },
)

const requestBodyLimitMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const { rejectExcessiveRequestBody } =
      await import('./lib/request-security')
    const rejected = await rejectExcessiveRequestBody(request)
    return rejected ?? next()
  },
)

/** Explicit CSRF protection, bounded input and response headers for server requests. */
export const startInstance = createStart(() => ({
  requestMiddleware: [
    securityHeadersMiddleware,
    createCsrfMiddleware({
      filter: ({ request }) =>
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method),
    }),
    requestBodyLimitMiddleware,
  ],
}))
