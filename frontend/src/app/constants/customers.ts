export const CUSTOMERS = {
  list: {
    description: 'Customer directory and history.',
    add: 'Add customer',
    emptyTitle: 'No customers yet',
    emptyHint: 'Add a customer or create one from billing.',
    searchPlaceholder: 'Search name or phone',
  },
  detail: {
    description: 'Profile, visits, and loyalty.',
    edit: 'Edit customer',
    loyaltyPoints: 'Loyalty points',
    lifetimeSpend: 'Lifetime spend',
    visits: 'Visits',
    emptyVisits: 'No visits yet',
  },
  form: {
    createTitle: 'Add customer',
    editTitle: 'Edit customer',
    name: 'First name',
    lastName: 'Last name',
    phone: 'Phone',
    gender: 'Gender',
  },
  toasts: {
    created: 'Customer added',
    updated: 'Customer updated',
    deleted: 'Customer removed',
  },
} as const
