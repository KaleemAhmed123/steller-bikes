// Simplified RBAC (role-based access control) for the MVP. v1 had 14 permissions
// and 11 roles; we keep two roles and the handful of permissions they need.
// Every admin action checks exactly one permission before it runs.

export type Role = 'owner' | 'manager';

export type Permission =
  | 'dashboard.read'
  | 'orders.read'
  | 'orders.update'
  | 'inventory.read'
  | 'inventory.adjust'
  | 'products.manage'
  | 'settings.manage';

const MANAGER_PERMISSIONS: Permission[] = [
  'dashboard.read',
  'orders.read',
  'orders.update',
  'inventory.read',
  'inventory.adjust',
  'products.manage', // managers run the catalogue day-to-day
];

// Owner can do everything a manager can, plus owner-only concerns (the shop's
// own identity in settings.manage).
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [...MANAGER_PERMISSIONS, 'settings.manage'],
  manager: MANAGER_PERMISSIONS,
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
