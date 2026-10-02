/**
 * MOCK DATA — clearly marked.
 *
 * Backend gaps (see docs/API_NOTES.md):
 * - No billing/POS, inventory, loyalty, or report endpoints
 * - Bookings store `invoice` as string (not amount) and `service` as string
 * - No product sales or expense records
 *
 * Replace this module when report APIs exist. Do not scatter mocks in screens.
 */

export interface RevenuePoint {
  date: string
  revenue: number
  expenses?: number
}

export interface StaffSaleRow {
  staffId: string
  staffName: string
  services: number
  products: number
  total: number
  bookings: number
}

export interface ProfitBreakdownRow {
  category: string
  amount: number
  type: 'revenue' | 'expense'
}

export interface DashboardMock {
  todaysCollection: number
  collectionDelta: number
  topStaff: { name: string; sales: number }[]
  lowStockCount: number
  revenueTrend: RevenuePoint[]
}

export interface SalesReportMock {
  totalRevenue: number
  revenueDelta: number
  serviceRevenue: number
  productRevenue: number
  staffSales: StaffSaleRow[]
  revenueTrend: RevenuePoint[]
}

export interface ProfitReportMock {
  revenue: number
  expenses: number
  netProfit: number
  profitDelta: number
  breakdown: ProfitBreakdownRow[]
}

export const MOCK_DASHBOARD: DashboardMock = {
  todaysCollection: 42850,
  collectionDelta: 12.4,
  topStaff: [
    { name: 'Priya Nair', sales: 15400 },
    { name: 'Ananya Rao', sales: 12100 },
    { name: 'Meera Iyer', sales: 9800 },
  ],
  lowStockCount: 3,
  revenueTrend: [
    { date: 'Mon', revenue: 32000 },
    { date: 'Tue', revenue: 28500 },
    { date: 'Wed', revenue: 41000 },
    { date: 'Thu', revenue: 36500 },
    { date: 'Fri', revenue: 45200 },
    { date: 'Sat', revenue: 51800 },
    { date: 'Sun', revenue: 42850 },
  ],
}

export const MOCK_SALES_REPORT: SalesReportMock = {
  totalRevenue: 278400,
  revenueDelta: 8.2,
  serviceRevenue: 214600,
  productRevenue: 63800,
  staffSales: [
    {
      staffId: '1',
      staffName: 'Priya Nair',
      services: 62000,
      products: 8400,
      total: 70400,
      bookings: 48,
    },
    {
      staffId: '2',
      staffName: 'Ananya Rao',
      services: 51000,
      products: 12200,
      total: 63200,
      bookings: 41,
    },
    {
      staffId: '3',
      staffName: 'Meera Iyer',
      services: 44500,
      products: 9100,
      total: 53600,
      bookings: 36,
    },
    {
      staffId: '4',
      staffName: 'Kavya Menon',
      services: 38200,
      products: 15600,
      total: 53800,
      bookings: 29,
    },
    {
      staffId: '5',
      staffName: 'Walk-in desk',
      services: 18900,
      products: 18500,
      total: 37400,
      bookings: 22,
    },
  ],
  revenueTrend: [
    { date: 'Week 1', revenue: 62000 },
    { date: 'Week 2', revenue: 71000 },
    { date: 'Week 3', revenue: 68400 },
    { date: 'Week 4', revenue: 77000 },
  ],
}

export const MOCK_PROFIT_REPORT: ProfitReportMock = {
  revenue: 278400,
  expenses: 164200,
  netProfit: 114200,
  profitDelta: 5.6,
  breakdown: [
    { category: 'Service sales', amount: 214600, type: 'revenue' },
    { category: 'Product sales', amount: 63800, type: 'revenue' },
    { category: 'Staff salaries', amount: 98000, type: 'expense' },
    { category: 'Product cost', amount: 28600, type: 'expense' },
    { category: 'Rent & utilities', amount: 25000, type: 'expense' },
    { category: 'Consumables', amount: 12600, type: 'expense' },
  ],
}

export const MOCK_GAPS = [
  'GET /api/reports/dashboard — missing',
  'GET /api/reports/sales — missing',
  'GET /api/reports/profit — missing',
  'GET /api/reports/staff-sales — missing',
  'GET /api/reports/inventory-valuation — missing',
  'CSV export endpoints — missing (client-side download used)',
  'GET /api/inventory (low-stock) — missing',
  'Booking.amount / line items — invoice is a string, not money',
  'Product sales vs service sales split — missing',
] as const
