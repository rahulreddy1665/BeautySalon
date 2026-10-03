/** Screen → action → backend permission key. Null = not applicable. */
export const PERMISSION_SCREENS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    keys: {
      view: 'dashboard:read',
      create: null,
      edit: null,
      delete: null,
    },
  },
  {
    id: 'customers',
    label: 'Customers',
    keys: {
      view: 'customer:read',
      create: 'customer:create',
      edit: 'customer:update',
      delete: 'customer:delete',
    },
  },
  {
    id: 'billing',
    label: 'Billing',
    keys: {
      view: 'invoice:read',
      create: 'invoice:create',
      edit: 'invoice:update',
      delete: 'invoice:delete',
    },
  },
  {
    id: 'appointments',
    label: 'Appointments',
    keys: {
      view: 'appointment:read',
      create: 'appointment:create',
      edit: 'appointment:update',
      delete: 'appointment:delete',
    },
  },
  {
    id: 'staff',
    label: 'Staff',
    keys: {
      view: 'staff:read',
      create: 'staff:create',
      edit: 'staff:update',
      delete: 'staff:delete',
    },
  },
  {
    id: 'services',
    label: 'Services',
    keys: {
      view: 'service:read',
      create: 'service:create',
      edit: 'service:update',
      delete: 'service:delete',
    },
  },
  {
    id: 'products',
    label: 'Products',
    keys: {
      view: 'product:read',
      create: 'product:create',
      edit: 'product:update',
      delete: 'product:delete',
    },
  },
  {
    id: 'loyalty',
    label: 'Loyalty',
    keys: {
      view: 'loyalty:read',
      create: null,
      edit: 'loyalty:update',
      delete: 'loyalty:adjust',
    },
  },
  {
    id: 'reports',
    label: 'Reports',
    keys: {
      view: 'report:read',
      create: 'report:export',
      edit: null,
      delete: null,
    },
  },
  {
    id: 'settings',
    label: 'Settings',
    keys: {
      view: 'settings:read',
      create: null,
      edit: 'settings:update',
      delete: null,
    },
  },
] as const

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

export const PERMISSION_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete']

export const NAV_PERMISSION: Record<string, string> = {
  '/': 'dashboard:read',
  '/appointments': 'appointment:read',
  '/customers': 'customer:read',
  '/billing': 'invoice:read',
  '/staff': 'staff:read',
  '/services': 'service:read',
  '/inventory': 'product:read',
  '/loyalty': 'loyalty:read',
  '/reports': 'report:read',
  '/settings': 'settings:read',
}

export function allMatrixPermissionKeys(): string[] {
  const keys = new Set<string>()
  for (const screen of PERMISSION_SCREENS) {
    for (const action of PERMISSION_ACTIONS) {
      const key = screen.keys[action]
      if (key) keys.add(key)
    }
  }
  return [...keys]
}
