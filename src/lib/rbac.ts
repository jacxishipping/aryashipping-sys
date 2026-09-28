export type AppRole =
  | 'admin'
  | 'manager'
  | 'finance'
  | 'operations'
  | 'customer_service'
  | 'user';

export type Permission =
  | 'dashboard:view'
  | 'analytics:view'
  | 'users:manage'
  | 'customers:view'
  | 'customers:manage'
  | 'shipments:view'
  | 'shipments:read_all'
  | 'shipments:manage'
  | 'containers:view'
  | 'containers:read_all'
  | 'containers:manage'
  | 'finance:view'
  | 'finance:manage'
  | 'invoices:view'
  | 'invoices:manage'
  | 'documents:view'
  | 'documents:manage'
  | 'transits:manage'
  | 'dispatches:manage'
  | 'workflow:move'
  | 'workflow:override_closed'
  | 'expenses:post'
  | 'tracking:view';

const ROLE_PERMISSIONS: Record<AppRole, Set<Permission>> = {
  admin: new Set<Permission>([
    'dashboard:view',
    'analytics:view',
    'users:manage',
    'customers:view',
    'customers:manage',
    'shipments:view',
    'shipments:read_all',
    'shipments:manage',
    'containers:view',
    'containers:read_all',
    'containers:manage',
    'finance:view',
    'finance:manage',
    'invoices:view',
    'invoices:manage',
    'documents:view',
    'documents:manage',
    'transits:manage',
    'dispatches:manage',
    'workflow:move',
    'workflow:override_closed',
    'expenses:post',
    'tracking:view',
  ]),
  manager: new Set<Permission>([
    'dashboard:view',
    'analytics:view',
    'customers:view',
    'customers:manage',
    'shipments:view',
    'shipments:read_all',
    'shipments:manage',
    'containers:view',
    'containers:read_all',
    'containers:manage',
    'finance:view',
    'invoices:view',
    'invoices:manage',
    'documents:view',
    'documents:manage',
    'transits:manage',
    'dispatches:manage',
    'workflow:move',
    'expenses:post',
    'tracking:view',
  ]),
  finance: new Set<Permission>([
    'dashboard:view',
    'analytics:view',
    'customers:view',
    'shipments:view',
    'shipments:read_all',
    'containers:view',
    'containers:read_all',
    'finance:view',
    'finance:manage',
    'invoices:view',
    'invoices:manage',
    'expenses:post',
    'tracking:view',
  ]),
  operations: new Set<Permission>([
    'dashboard:view',
    'customers:view',
    'shipments:view',
    'shipments:read_all',
    'shipments:manage',
    'containers:view',
    'containers:read_all',
    'containers:manage',
    'documents:view',
    'documents:manage',
    'invoices:view',
    'transits:manage',
    'dispatches:manage',
    'workflow:move',
    'tracking:view',
  ]),
  customer_service: new Set<Permission>([
    'dashboard:view',
    'customers:view',
    'customers:manage',
    'shipments:view',
    'shipments:read_all',
    'shipments:manage',
    'invoices:view',
    'tracking:view',
  ]),
  user: new Set<Permission>([
    'dashboard:view',
    'shipments:view',
    'invoices:view',
    'tracking:view',
    'documents:view',
  ]),
};

export function normalizeRole(role?: string | null): AppRole {
  const normalizedRole = role?.trim().toLowerCase();
  if (!normalizedRole) return 'user';
  if (normalizedRole in ROLE_PERMISSIONS) return normalizedRole as AppRole;
  return 'user';
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  const normalized = normalizeRole(role);
  return ROLE_PERMISSIONS[normalized].has(permission);
}

export function hasAnyPermission(
  role: string | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function isInternalUser(role: string | null | undefined): boolean {
  return normalizeRole(role) !== 'user';
}

export function canMoveWorkflow(role: string | null | undefined): boolean {
  return hasPermission(role, 'workflow:move');
}

export function canPostExpenses(role: string | null | undefined): boolean {
  return hasPermission(role, 'expenses:post');
}

export function canOverrideClosedStages(role: string | null | undefined): boolean {
  return hasPermission(role, 'workflow:override_closed');
}
