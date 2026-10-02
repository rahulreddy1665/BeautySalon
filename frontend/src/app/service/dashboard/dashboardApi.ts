/**
 * Owner dashboard data adapter — appointments, invoices, staff, customers from API.
 */

import { format, isToday, parseISO, subDays } from 'date-fns'

import { appointmentsApi } from '@/app/service/appointments/appointmentsApi'
import { customersApi, type Customer } from '@/app/service/customers/customersApi'
import { invoicesApi } from '@/app/service/invoices/invoicesApi'
import { productsApi } from '@/app/service/products/productsApi'
import { staffApi, type StaffMember } from '@/app/service/staff/staffApi'

export interface DashboardRevenuePoint {
  date: string
  revenue: number
}

export interface DashboardTopStaff {
  staffId: string
  name: string
  sales: number
  salesMocked: boolean
}

export interface OwnerDashboard {
  todaysBookings: number
  newCustomers: number
  staffCount: number
  productCount: number
  todaysCollection: number
  collectionDelta: number
  revenueTrend: DashboardRevenuePoint[]
  topStaff: DashboardTopStaff[]
  sources: {
    bookings: 'api'
    customers: 'api'
    staff: 'api'
    products: 'api'
    collection: 'api'
    revenueTrend: 'api' | 'mock'
    staffSales: 'api' | 'mock'
  }
  usingMock: boolean
}

function customerIsNewToday(customer: Customer): boolean {
  if (!customer.createdAt) return false
  try {
    return isToday(parseISO(customer.createdAt))
  } catch {
    return false
  }
}

function mockTrendFallback(): DashboardRevenuePoint[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const day = subDays(today, 6 - index)
    const seed = day.getDate() * 17 + day.getMonth() * 3
    return {
      date: format(day, 'EEE'),
      revenue: 28000 + (seed % 20) * 1200,
    }
  })
}

function mockTopStaff(staff: StaffMember[]): DashboardTopStaff[] {
  return staff
    .filter((u) => u.isActive !== false)
    .slice(0, 3)
    .map((member, index) => ({
      staffId: member._id,
      name: member.name,
      sales: 16000 - index * 2200 + (member.name.length % 7) * 300,
      salesMocked: true as const,
    }))
}

export async function fetchOwnerDashboard(): Promise<OwnerDashboard> {
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const yesterdayKey = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const weekFrom = format(subDays(new Date(), 6), 'yyyy-MM-dd')

  const [
    appointmentsPage,
    customers,
    staffPage,
    productsPage,
    todayInvoices,
    yesterdayInvoices,
    weekInvoices,
    staffSales,
  ] = await Promise.all([
    appointmentsApi.list({ date: todayKey, page: 1, limit: 200 }),
    customersApi.getAll(),
    staffApi.list({ page: 1, limit: 100 }),
    productsApi.list({ page: 1, limit: 1 }),
    invoicesApi.list({ from: todayKey, to: todayKey, page: 1, limit: 200 }),
    invoicesApi.list({
      from: yesterdayKey,
      to: yesterdayKey,
      page: 1,
      limit: 200,
    }),
    invoicesApi.list({ from: weekFrom, to: todayKey, page: 1, limit: 500 }),
    invoicesApi.staffSales(todayKey, todayKey).catch(() => null),
  ])

  const todaysCollection = todayInvoices.items.reduce(
    (sum, inv) => sum + (inv.grandTotal ?? 0),
    0,
  )
  const ydayCollection = yesterdayInvoices.items.reduce(
    (sum, inv) => sum + (inv.grandTotal ?? 0),
    0,
  )
  const collectionDelta =
    ydayCollection > 0
      ? ((todaysCollection - ydayCollection) / ydayCollection) * 100
      : todaysCollection > 0
        ? 100
        : 0

  const byDay = new Map<string, number>()
  for (let i = 6; i >= 0; i -= 1) {
    byDay.set(format(subDays(new Date(), i), 'yyyy-MM-dd'), 0)
  }
  for (const inv of weekInvoices.items) {
    const key = inv.createdAt?.slice(0, 10)
    if (key && byDay.has(key)) {
      byDay.set(key, (byDay.get(key) ?? 0) + (inv.grandTotal ?? 0))
    }
  }
  const hasWeekRevenue = [...byDay.values()].some((v) => v > 0)
  const revenueTrend: DashboardRevenuePoint[] = hasWeekRevenue
    ? [...byDay.entries()].map(([date, revenue]) => ({
        date: format(parseISO(date), 'EEE'),
        revenue,
      }))
    : mockTrendFallback()

  const staff = staffPage.items
  const topStaff: DashboardTopStaff[] =
    staffSales && staffSales.length > 0
      ? staffSales
          .slice()
          .sort((a, b) => b.totalSales - a.totalSales)
          .slice(0, 3)
          .map((row) => ({
            staffId: row.staffId,
            name: row.staffName,
            sales: row.totalSales,
            salesMocked: false,
          }))
      : mockTopStaff(staff)

  const usingMock = !hasWeekRevenue || !staffSales || staffSales.length === 0

  return {
    todaysBookings: appointmentsPage.total,
    newCustomers: customers.filter(customerIsNewToday).length,
    staffCount: staff.filter((u) => u.isActive !== false).length,
    productCount: productsPage.total,
    todaysCollection,
    collectionDelta: Math.round(collectionDelta * 10) / 10,
    revenueTrend,
    topStaff,
    sources: {
      bookings: 'api',
      customers: 'api',
      staff: 'api',
      products: 'api',
      collection: 'api',
      revenueTrend: hasWeekRevenue ? 'api' : 'mock',
      staffSales: staffSales && staffSales.length > 0 ? 'api' : 'mock',
    },
    usingMock,
  }
}
