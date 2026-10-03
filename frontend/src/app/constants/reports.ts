export const REPORTS = {
  hub: {
    description: 'Sales, staff, inventory, and profit reports.',
    sales: 'Sales',
    staff: 'Staff sales',
    inventory: 'Inventory valuation',
    profit: 'Profit',
  },
  sales: {
    description: 'Revenue by period from invoices.',
    emptyTitle: 'No sales in this period',
    emptyHint: 'Collect payments to see sales here.',
    totalRevenue: 'Total revenue',
    serviceRevenue: 'Service revenue',
    productRevenue: 'Product revenue',
  },
  staff: {
    description: 'Staff-wise sales from invoice lines.',
    emptyTitle: 'No staff sales in this period',
    emptyHint: 'Sales appear after checkout with staff assigned.',
  },
  inventory: {
    description: 'Product catalog valuation (qty/cost when available).',
    emptyTitle: 'Inventory valuation unavailable',
    emptyHint: 'Quantity and cost fields are not tracked yet.',
  },
  profit: {
    description: 'Revenue vs expenses.',
    emptyTitle: 'Profit report unavailable',
    emptyHint: 'Expense tracking is not available yet.',
  },
  unavailable: 'This report is not available yet.',
} as const
