import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
} from '@tanstack/react-router'

import { getSessionStatus } from '#/features/auth/session-status.functions'
import { hasPermission } from '#/features/auth/authorization'
import {
  homeRouteForRole,
  requiredPermissionForRoute,
} from '#/features/auth/ui-access'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (
      location.pathname === '/login' ||
      location.pathname === '/login/redefinir-senha'
    ) {
      return { appRole: null }
    }

    const session = await getSessionStatus()
    if (!session.authenticated || !session.role) {
      throw redirect({
        to: '/login',
        search: { token: undefined },
        throw: true,
      })
    }
    const permission = requiredPermissionForRoute(location.pathname)
    if (permission && !hasPermission(session.role, permission)) {
      throw redirect({
        to: homeRouteForRole(session.role),
        search: {},
        throw: true,
      })
    }
    return { appRole: session.role }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Cacau | Gestão dos Seus Brownies',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere]">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
