import { hasPermission } from './authorization'
import type { AppRole, Permission } from './authorization'

const routePermissions: Readonly<Partial<Record<string, Permission>>> = {
  '/': 'dashboard:read',
  '/categorias': 'catalog:read',
  '/produtos': 'catalog:read',
  '/locais': 'catalog:write',
  '/compras': 'purchases:write',
  '/estoque': 'inventory:read',
  '/producao': 'production:read',
  '/vendas': 'sales:write',
  '/despesas': 'expenses:read',
  '/relatorios': 'reports:financial:read',
  '/parametros': 'access:manage',
  '/plano-de-acao': 'access:manage',
  '/fifo-migration-audit': 'fifo:audit:read',
}

export function requiredPermissionForRoute(pathname: string) {
  return routePermissions[pathname]
}

export function homeRouteForRole(role: AppRole) {
  if (hasPermission(role, 'dashboard:read')) return '/' as const
  if (hasPermission(role, 'purchases:write')) return '/compras' as const
  if (hasPermission(role, 'sales:write')) return '/vendas' as const
  return '/produtos' as const
}
