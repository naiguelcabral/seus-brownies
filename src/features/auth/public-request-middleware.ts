import { createMiddleware } from '@tanstack/react-start'

export const publicAuthRequestBudget = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  const { getRequest } = await import('@tanstack/react-start/server')
  const { publicAuthRequestAllowed } =
    await import('./public-request-budget.server')
  if (!(await publicAuthRequestAllowed(getRequest(), process.env))) {
    throw new Response(null, { status: 429, headers: { 'Retry-After': '60' } })
  }
  return next()
})
