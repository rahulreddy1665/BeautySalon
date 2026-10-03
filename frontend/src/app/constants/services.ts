export const SERVICES = {
  list: {
    description: 'Service menu with duration and price.',
    add: 'Add service',
    import: 'Import',
    emptyTitle: 'No services yet',
    emptyHint: 'Add services or import from a spreadsheet.',
    searchPlaceholder: 'Search services',
  },
  form: {
    createTitle: 'Add service',
    editTitle: 'Edit service',
    name: 'Name',
    category: 'Category',
    price: 'Price',
    duration: 'Duration (minutes)',
  },
  toasts: {
    created: 'Service added',
    updated: 'Service updated',
    deleted: 'Service removed',
    imported: 'Import finished',
  },
} as const
