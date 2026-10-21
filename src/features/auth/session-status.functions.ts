import { createServerFn } from '@tanstack/react-start'

/** Exposes only session presence for route guards; role checks stay server-side. */
export const getSessionStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { createConfiguredSessionResolver } =
      await import('./principal-resolver.server')
    const { user, principal } = await createConfiguredSessionResolver(
      process.env,
    )()

    return {
      authenticated: principal?.emailVerified === true,
      sessionPresent: Boolean(user),
      emailVerified: user?.emailVerified === true,
      role: principal?.role ?? null,
    }
  },
)
