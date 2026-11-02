/**
 * Query-key factory.
 * Keeps keys consistent and makes invalidation predictable.
 *
 * Pattern: queryKeys.feature.list(filters) / .detail(id)
 */
export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
  publicBranding: {
    all: ['publicBranding'] as const,
    detail: () => [...queryKeys.publicBranding.all, 'detail'] as const,
  },
  services: {
    all: ['services'] as const,
    lists: () => [...queryKeys.services.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.services.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.services.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.services.details(), id] as const,
  },
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.customers.lists(), filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.customers.all, 'detail', id] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.bookings.lists(), filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.bookings.all, 'detail', id] as const,
  },
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.users.lists(), filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },
  roles: {
    all: ['roles'] as const,
    lists: () => [...queryKeys.roles.all, 'list'] as const,
    list: () => [...queryKeys.roles.lists()] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    owner: () => [...queryKeys.dashboard.all, 'owner'] as const,
  },
  billing: {
    all: ['billing'] as const,
    lists: () => [...queryKeys.billing.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.billing.lists(), filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.billing.all, 'detail', id] as const,
    products: () => [...queryKeys.billing.all, 'products'] as const,
    popular: (limit?: number) =>
      [...queryKeys.billing.all, 'popular', limit ?? 12] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    lists: () => [...queryKeys.inventory.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.inventory.lists(), filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.inventory.all, 'detail', id] as const,
    history: (id: string) => [...queryKeys.inventory.all, 'history', id] as const,
  },
  loyalty: {
    all: ['loyalty'] as const,
    rules: () => [...queryKeys.loyalty.all, 'rules'] as const,
    balances: () => [...queryKeys.loyalty.all, 'balances'] as const,
    ledger: (customerId?: string) =>
      [...queryKeys.loyalty.all, 'ledger', customerId ?? 'all'] as const,
    balance: (customerId: string) =>
      [...queryKeys.loyalty.all, 'balance', customerId] as const,
  },
  staff: {
    all: ['staff'] as const,
    lists: () => [...queryKeys.staff.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.staff.lists(), filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.staff.all, 'detail', id] as const,
  },
  appointments: {
    all: ['appointments'] as const,
    lists: () => [...queryKeys.appointments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.appointments.lists(), filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.appointments.all, 'detail', id] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.invoices.lists(), filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.invoices.all, 'detail', id] as const,
    staffSales: (filters?: Record<string, unknown>) =>
      [...queryKeys.invoices.all, 'staff-sales', filters ?? {}] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
  designations: {
    all: ['designations'] as const,
    list: () => [...queryKeys.designations.all, 'list'] as const,
  },
  reports: {
    all: ['reports'] as const,
    overview: () => [...queryKeys.reports.all, 'overview'] as const,
    sales: (filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all, 'sales', filters ?? {}] as const,
    staff: (filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all, 'staff', filters ?? {}] as const,
    staffLines: (staffId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all, 'staff-lines', staffId, filters ?? {}] as const,
    customers: (filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all, 'customers', filters ?? {}] as const,
    appointments: (filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all, 'appointments', filters ?? {}] as const,
    services: (filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all, 'services', filters ?? {}] as const,
    products: (filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all, 'products', filters ?? {}] as const,
  },
} as const
