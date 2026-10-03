import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import type { DateRange } from '@/app/components/DateRangeFilter'
import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { invoicesApi } from '@/app/service/invoices/invoicesApi'

function rangeKeys(range: DateRange) {
  return {
    from: format(range.from, 'yyyy-MM-dd'),
    to: format(range.to, 'yyyy-MM-dd'),
  }
}

export function useSalesReportQuery(range: DateRange) {
  const { from, to } = rangeKeys(range)
  const query = useQuery({
    queryKey: [...queryKeys.billing.list(), 'sales-report', from, to] as const,
    queryFn: async () => {
      const page = await invoicesApi.list({ from, to, page: 1, limit: 500 })
      let serviceRevenue = 0
      let productRevenue = 0
      for (const inv of page.items) {
        serviceRevenue +=
          (inv.serviceSubtotal ?? 0) - (inv.serviceDiscountTotal ?? 0)
        productRevenue +=
          (inv.productSubtotal ?? 0) - (inv.productDiscountTotal ?? 0)
      }
      const totalRevenue = page.items.reduce(
        (sum, inv) => sum + (inv.grandTotal ?? 0),
        0,
      )
      const byDay = new Map<string, number>()
      for (const inv of page.items) {
        const key = inv.createdAt?.slice(0, 10) ?? ''
        if (!key) continue
        byDay.set(key, (byDay.get(key) ?? 0) + (inv.grandTotal ?? 0))
      }
      const revenueTrend = [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({ date: date.slice(5), revenue }))

      const staffSales = await invoicesApi.staffSales(from, to).catch(() => [])
      return {
        totalRevenue,
        serviceRevenue,
        productRevenue,
        revenueTrend,
        staffSales,
        invoiceCount: page.total,
      }
    },
  })

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    data: query.data ?? null,
  }
}

export function useProfitReportQuery(_range: DateRange) {
  return {
    isLoading: false,
    isError: false,
    error: null,
    refetch: async () => undefined,
    data: null as null,
    unavailable: true as const,
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
  const { from, to } = rangeKeys(range)
  const query = useQuery({
    queryKey: [...queryKeys.billing.list(), 'staff-sales-report', from, to],
    queryFn: async () => {
      const rows = await invoicesApi.staffSales(from, to)
      const mapped: StaffIncentiveRow[] = rows.map((row) => ({
        staffId: row.staffId,
        staffName: row.staffName,
        servicesSales: row.serviceSales,
        productSales: row.productSales,
        totalSales: row.totalSales,
        bookings: 0,
        incentiveRatePercent: 0,
        incentiveEarned: 0,
      }))
      const totals = mapped.reduce(
        (acc, row) => ({
          sales: acc.sales + row.totalSales,
          incentives: 0,
          bookings: 0,
        }),
        { sales: 0, incentives: 0, bookings: 0 },
      )
      return { rows: mapped, totals, staffCount: mapped.length }
    },
  })

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    data: query.data ?? { rows: [], totals: { sales: 0, incentives: 0, bookings: 0 }, staffCount: 0 },
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
  stockLevel: 'ok' | 'low' | 'out'
}

export function useInventoryValuationQuery() {
  return {
    isLoading: false,
    isError: false,
    error: null,
    refetch: async () => undefined,
    data: null as null,
    unavailable: true as const,
  }
}
