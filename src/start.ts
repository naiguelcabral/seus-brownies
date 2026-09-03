import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

/**
 * Explicit CSRF protection for mutating requests. Route/Server Function
 * authorization remains separate and server-side.
 */
export const startInstance = createStart(() => ({
  requestMiddleware: [createCsrfMiddleware()],
}))
