import { createMiddleware } from '@tanstack/react-start'
import { setResponseHeaders } from '@tanstack/react-start/server'
import {
  rejectExcessiveRequestBody,
  requestSecurityHeaders,
  secureResponse,
} from './request-security'

export const securityHeadersMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const headers = requestSecurityHeaders(request)
    // Also cover framework-generated errors and redirects.
    setResponseHeaders(new Headers(headers))
    const result = await next()
    return { ...result, response: secureResponse(result.response, headers) }
  },
)

export const requestBodyLimitMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const rejected = await rejectExcessiveRequestBody(request)
    return rejected ?? next()
  },
)
