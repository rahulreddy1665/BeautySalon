import { useQuery } from '@tanstack/react-query'
import { parseISO } from 'date-fns'

import type { DateRange } from '@/app/components/DateRangeFilter'
import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { bookingsApi } from '@/app/service/bookings/bookingsApi'
import {
  getStockLevel,
  inventoryMockApi,
  type InventoryProduct,
} from '@/app/service/mocks/inventoryMock'
import {
  MOCK_PROFIT_REPORT,
  MOCK_SALES_REPORT,
} from '@/app/service/mocks/reportMocks'
import { getStaffSalesMock } from '@/app/service/mocks/staffSalesMock'
import { usersApi } from '@/app/service/users/usersApi'

function isDateInRange(value: string | undefined, range: DateRange): boolean {
  if (!value) return false
  const parsed = value.includes('T') ? parseISO(value) : new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed >= range.from && parsed <= range.to
}

export function useSalesReportQuery(range: DateRange) {
  const bookingsQuery = useQuery({
    queryKey: queryKeys.bookings.list({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    }),
    queryFn: () => bookingsApi.getAll(),
  })

  const bookingsInRange = (bookingsQuery.data ?? []).filter((b) =>
    isDateInRange(b.date, range),
  )

  return {
    isLoading: bookingsQuery.isLoading,
    isError: bookingsQuery.isError,
    error: bookingsQuery.error,
    refetch: bookingsQuery.refetch,
    data: {
      bookingsCount: bookingsInRange.length,
      /** MOCK: revenue/staff/product split — no billing API yet */
      mock: MOCK_SALES_REPORT,
      usingMock: true as const,
    },
  }
}

export function useProfitReportQuery(range: DateRange) {
  const bookingsQuery = useQuery({
    queryKey: [
      ...queryKeys.bookings.all,
      'profit',
      range.from.toISOString(),
      range.to.toISOString(),
    ],
    queryFn: () => bookingsApi.getAll(),
  })

  return {
    isLoading: bookingsQuery.isLoading,
    isError: bookingsQuery.isError,
    error: bookingsQuery.error,
    refetch: bookingsQuery.refetch,
    data: {
      bookingsCount: (bookingsQuery.data ?? []).filter((b) =>
        isDateInRange(b.date, range),
      ).length,
      /** MOCK: expenses / net profit — no finance API yet */
      mock: MOCK_PROFIT_REPORT,
      usingMock: true as const,
    },
  }
}

export interface StaffIncentiveRow {
  staffId: string
  staffName: string
  servicesSales: number
  productSales: number
  totalSales: number
  bookings: number
  incentiveRatePercent: number
  incentiveEarned: number
}

export function useStaffSalesReportQuery(range: DateRange) {
  const usersQuery = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: () => usersApi.getAll(),
  })

  const fromIso = range.from.toISOString()
  const toIso = range.to.toISOString()

  const rows: StaffIncentiveRow[] = (usersQuery.data ?? [])
    .filter((u) => u.isActive !== false)
    .map((user) => {
      const sales = getStaffSalesMock(user._id, fromIso, toIso)
      return {
        staffId: user._id,
        staffName: user.name,
        servicesSales: sales.servicesSales,
        productSales: sales.productSales,
        totalSales: sales.totalSales,
        bookings: sales.bookings,
        incentiveRatePercent: sales.incentiveRatePercent,
        incentiveEarned: sales.incentiveEarned,
      }
    })
    .sort((a, b) => b.totalSales - a.totalSales)

  const totals = rows.reduce(
    (acc, row) => ({
      sales: acc.sales + row.totalSales,
      incentives: acc.incentives + row.incentiveEarned,
      bookings: acc.bookings + row.bookings,
    }),
    { sales: 0, incentives: 0, bookings: 0 },
  )

  return {
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
    data: {
      rows,
      totals,
      staffCount: rows.length,
      /** Money amounts mocked; staff names from API */
      usingMock: true as const,
    },
  }
}

export interface InventoryValuationRow {
  id: string
  sku: string
  name: string
  category: string
  qtyOnHand: number
  costPrice: number
  unitPrice: number
  costValue: number
  retailValue: number
  stockLevel: ReturnType<typeof getStockLevel>
}

function toValuationRows(products: InventoryProduct[]): InventoryValuationRow[] {
  return products
    .filter((p) => p.isActive)
    .map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      qtyOnHand: p.qtyOnHand,
      costPrice: p.costPrice,
      unitPrice: p.unitPrice,
      costValue: p.qtyOnHand * p.costPrice,
      retailValue: p.qtyOnHand * p.unitPrice,
      stockLevel: getStockLevel(p),
    }))
    .sort((a, b) => b.costValue - a.costValue)
}

export function useInventoryValuationQuery() {
  const inventoryQuery = useQuery({
    queryKey: [...queryKeys.inventory.list(), 'valuation-mock'] as const,
    queryFn: () => inventoryMockApi.list(),
  })

  const rows = toValuationRows(inventoryQuery.data ?? [])
  const costValue = rows.reduce((sum, r) => sum + r.costValue, 0)
  const retailValue = rows.reduce((sum, r) => sum + r.retailValue, 0)
  const lowStockCount = rows.filter((r) => r.stockLevel !== 'ok').length

  return {
    isLoading: inventoryQuery.isLoading,
    isError: inventoryQuery.isError,
    error: inventoryQuery.error,
    refetch: inventoryQuery.refetch,
    data: {
      rows,
      skuCount: rows.length,
      costValue,
      retailValue,
      lowStockCount,
      /** Inventory store is mock until /api/inventory exists */
      usingMock: true as const,
    },
  }
}
