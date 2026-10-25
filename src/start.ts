import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import {
  securityHeadersMiddleware,
  requestBodyLimitMiddleware,
} from './lib/request-middleware.server'

/**
 * Explicit CSRF protection for mutating requests. Route/Server Function
 * authorization remains separate and server-side.
 */
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
