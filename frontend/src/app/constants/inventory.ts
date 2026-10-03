export const INVENTORY = {
  list: {
    description: 'Retail product catalog.',
    add: 'Add product',
    import: 'Import',
    emptyTitle: 'No products yet',
    emptyHint: 'Add products sold at the counter.',
    searchPlaceholder: 'Search products',
  },
  detail: {
    description: 'Product details.',
    edit: 'Edit product',
  },
  form: {
    createTitle: 'Add product',
    editTitle: 'Edit product',
    name: 'Name',
    price: 'Price',
  },
  toasts: {
    created: 'Product added',
    updated: 'Product updated',
    deleted: 'Product removed',
  },
} as const
