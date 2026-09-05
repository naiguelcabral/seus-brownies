import { createServerFn } from '@tanstack/react-start'

/** Exposes only session presence for route guards; role checks stay server-side. */
export const getSessionStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { resolveCurrentPrincipal } = await import(
      './principal-resolver.server'
    )
    return { authenticated: Boolean(await resolveCurrentPrincipal()) }
  },
)
