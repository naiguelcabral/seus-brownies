/**
 * Application-owned authorization vocabulary. Identity providers authenticate a
 * person; only Cacau decides which operational action that person may perform.
 */
export const appRoles = [
  'owner',
  'employee',
  // Legacy roles remain recognized until all existing links are migrated.
  'admin',
  'manager',
  'production',
  'sales',
  'viewer',
] as const

export type AppRole = (typeof appRoles)[number]

export const permissions = [
  'catalog:read',
  'catalog:write',
  'purchases:read',
  'purchases:write',
  'inventory:read',
  'sales:read',
  'sales:write',
  'expenses:read',
  'expenses:write',
  'production:read',
  'production:write',
  'reports:financial:read',
  'dashboard:read',
  'fifo:lifecycle:write',
  'fifo:audit:read',
  'financial:compensation:write',
  'financial:period:close',
  'financial:period:correct',
  'scenarios:read',
  'scenarios:write',
  'access:manage',
] as const

export type Permission = (typeof permissions)[number]

const allPermissions = new Set<Permission>(permissions)
const legacyAdminPermissions = new Set<Permission>(
  permissions.filter(
    (permission) =>
      permission !== 'financial:period:correct' &&
      permission !== 'scenarios:write',
  ),
)

/**
 * Only decisions already unambiguous in the G1 matrix belong here. Pending
 * scopes (own data, projections without cost and FIFO lifecycle delegation)
 * deliberately grant nothing until a human decision is recorded.
 */
const rolePermissions: Readonly<Record<AppRole, ReadonlySet<Permission>>> = {
  owner: allPermissions,
  // A staff member can select catalog items and register purchases and sales,
  // but receives no operational reading, dashboard, report or access control.
  employee: new Set(['catalog:read', 'purchases:write', 'sales:write']),
  // Compatibility for links created before the Owner role migration.
  admin: legacyAdminPermissions,
  manager: new Set([
    'catalog:read',
    'catalog:write',
    'purchases:read',
    'purchases:write',
    'inventory:read',
    'sales:read',
    'sales:write',
    'expenses:read',
    'expenses:write',
    'production:read',
    'production:write',
    'reports:financial:read',
    'dashboard:read',
    'financial:compensation:write',
    'scenarios:read',
  ]),
  production: new Set([
    'catalog:read',
    'inventory:read',
    'production:read',
    'production:write',
  ]),
  sales: new Set(['catalog:read', 'sales:write']),
  viewer: new Set(['catalog:read']),
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && appRoles.includes(value as AppRole)
}

export function hasPermission(role: AppRole, permission: Permission) {
  return rolePermissions[role].has(permission)
}

export function assertPermission(role: AppRole, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(role, permission)
  }
}

export class AuthorizationError extends Error {
  readonly statusCode = 403

  constructor(
    readonly role: AppRole,
    readonly permission: Permission,
  ) {
    super('Você não tem permissão para executar esta operação.')
    this.name = 'AuthorizationError'
  }
}
