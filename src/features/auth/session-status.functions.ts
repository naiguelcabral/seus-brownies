import { createServerFn } from '@tanstack/react-start'

/** Exposes only session presence for route guards; role checks stay server-side. */
export const getSessionStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [{ createConfiguredNeonAuthServer }, { resolveCurrentPrincipal }] =
      await Promise.all([
        import('./configured-neon-auth.server'),
        import('./principal-resolver.server'),
      ])
    const auth = createConfiguredNeonAuthServer(process.env)
    const session = auth ? await auth.getSession() : null
    const principal = await resolveCurrentPrincipal()

    return {
      authenticated: principal?.emailVerified === true,
      sessionPresent: Boolean(session?.data?.user),
      emailVerified: session?.data?.user.emailVerified === true,
    }
  },
)
