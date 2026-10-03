/**
 * Reports API — wraps GET /api/reports/*.
 * Money fields may be null when the user lacks canViewRevenue.
 */

import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface ReportRangeParams {
  from: string
  to: string
}

export interface ReportExportPayload {
  filename: string
  headers: string[]
  rows: Array<Array<string | number | boolean | null | undefined>>
}

export interface ReportTablePage<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface ReportsOverview {
  range: { from: string; to: string }
  revenue: number | null
  revenueChange: number | null
  averageBill: number | null
  averageBillChange: number | null
  newCustomers: number
  newCustomersChange: number | null
  noShowRate: number
  noShowRateChange: number | null
}

export interface SalesBillRow {
  id: string
  invoiceNumber: string
  date: string
  createdAt: string
  customerName: string
  walkIn: boolean
  itemsCount: number
  revenue: number | null
  tip: number | null
  amountPayable: number | null
  paymentMode: string
  status: string
  serviceAmount: number | null
  productAmount: number | null
}

export interface SalesReportData {
  range: { from: string; to: string }
  previousRange: { from: string; to: string }
  kpis: {
    revenue: number | null
    revenueChange: number | null
    billCount: number
    billCountChange: number | null
    averageBill: number | null
    averageBillChange: number | null
    tips: number | null
    tipsChange: number | null
  }
  chart: {
    granularity: 'day' | 'week' | 'month'
    chartSeries: 'total' | 'services' | 'products'
    series: Array<{
      key: string
      services: number | null
      products: number | null
      total: number | null
    }>
  }
  splits: {
    serviceAmount: number | null
    servicePct: number | null
    productAmount: number | null
    productPct: number | null
    paymentModes: Array<{
      mode: string
      amount: number | null
      pct: number | null
    }>
  }
  table: ReportTablePage<SalesBillRow>
}

export interface StaffReportRow {
  staffId: string
  staffName: string
  servicesDone: number
  serviceSales: number | null
  productSales: number | null
  totalSales: number | null
  averageTicket: number | null
  tipsReceived: null
  rank: number
  salesChange: number | null
}

export interface StaffReportData {
  range: { from: string; to: string }
  previousRange: { from: string; to: string }
  kpis: {
    totalSales: number | null
    totalSalesChange: number | null
    topPerformerName: string | null
    topPerformerSales: number | null
    servicesDone: number
    servicesDoneChange: number | null
    averageTicket: number | null
    averageTicketChange: number | null
  }
  chart: Array<{
    staffId: string
    staffName: string
    totalSales: number | null
  }>
  table: ReportTablePage<StaffReportRow>
}

export interface StaffLineItem {
  invoiceId: string
  invoiceNumber: string
  date: string
  type: 'service' | 'product'
  name: string
  qty: number
  listPrice: number | null
  lineTotal: number | null
  attributed: number | null
}

export interface CustomersReportData {
  range: { from: string; to: string }
  tab: 'top' | 'inactive'
  inactiveDays?: number
  loyaltyEnabled: boolean
  kpis: {
    newCustomers: number
    returningCustomers: number
    averageSpend: number | null
    averageVisits: number
    walkInBills: number
  }
  chart: Array<{
    key: string
    newCount: number
    returningCount: number
  }>
  table: ReportTablePage<{
    customerId: string
    name: string
    phone: string
    spend: number | null
    visits: number
    averageTicket?: number | null
    lastVisit: string
    loyaltyPoints?: number | null
    daysSinceVisit?: number
  }>
}

export interface AppointmentsReportData {
  range: { from: string; to: string }
  kpis: {
    total: number
    completed: number
    noShowRate: number
    cancellationRate: number
    bookingToBillRate: number
  }
  charts: {
    statusBreakdown: Array<{ status: string; count: number }>
    busyGrid: { days: number[]; hours: string[]; cells: number[][] }
    walkInVsAppointment: { walkInBills: number; appointmentBills: number }
  }
  table: ReportTablePage<{
    id: string
    date: string
    startTime: string
    endTime: string
    status: string
    customerName: string
    staffNames: string[]
    services: string[]
    hasInvoice: boolean
  }>
}

export interface ServicesReportData {
  range: { from: string; to: string }
  notSold: boolean
  kpis: {
    soldCount: number
    revenue: number | null
    distinctCount: number
    avgDiscountPct: number | null
  }
  chart: {
    byRevenue: Array<{
      serviceId: string
      name: string
      revenue: number | null
      timesSold: number
    }>
    byCount: Array<{
      serviceId: string
      name: string
      timesSold: number
      revenue: number | null
    }>
  }
  table: ReportTablePage<{
    serviceId: string
    name: string
    category: string
    timesSold: number
    revenue: number | null
    listPrice: number | null
    avgPriceCharged: number | null
    discountPctEffect: number | null
    revenueShare: number | null
    snapshotName: string
  }>
}

export interface ProductsReportData {
  range: { from: string; to: string }
  kpis: {
    soldCount: number
    revenue: number | null
    distinctCount: number
    avgDiscountPct: number | null
  }
  chart: {
    byRevenue: Array<{
      productId: string
      name: string
      revenue: number | null
      timesSold: number
    }>
    byCount: Array<{
      productId: string
      name: string
      timesSold: number
      revenue: number | null
    }>
  }
  productSalesPerStaff: Array<{
    staffId: string
    staffName: string
    revenue: number | null
    units: number
  }>
  table: ReportTablePage<{
    productId: string
    name: string
    timesSold: number
    revenue: number | null
    listPrice: number | null
    avgPriceCharged: number | null
    discountPctEffect: number | null
    revenueShare: number | null
    topSellerStaffId: string | null
    topSellerStaffName: string | null
    topSellerSales: number | null
  }>
}

type ReportQuery = Record<string, string | number | boolean | undefined>

async function getReport<T>(path: string, params?: ReportQuery): Promise<T> {
  const { data } = await apiClient.get<ApiSuccessResponse<T>>(path, {
    params,
  })
  return data.data
}

function asQuery(params: object): ReportQuery {
  return params as ReportQuery
}

export const reportsApi = {
  overview: () => getReport<ReportsOverview>('/reports/overview'),

  sales: (params: ReportRangeParams & ReportQuery) =>
    getReport<SalesReportData>('/reports/sales', asQuery(params)),

  salesExport: (params: ReportRangeParams & { q?: string }) =>
    getReport<ReportExportPayload>('/reports/sales/export', asQuery(params)),

  staff: (params: ReportRangeParams & ReportQuery) =>
    getReport<StaffReportData>('/reports/staff', asQuery(params)),

  staffExport: (params: ReportRangeParams) =>
    getReport<ReportExportPayload>('/reports/staff/export', asQuery(params)),

  staffLines: (staffId: string, params: ReportRangeParams) =>
    getReport<{
      range: { from: string; to: string }
      staffId: string
      items: StaffLineItem[]
    }>(`/reports/staff/${staffId}/lines`, asQuery(params)),

  customers: (params: ReportRangeParams & ReportQuery) =>
    getReport<CustomersReportData>('/reports/customers', asQuery(params)),

  customersExport: (
    params: ReportRangeParams & { tab?: string; inactiveDays?: number },
  ) => getReport<ReportExportPayload>('/reports/customers/export', asQuery(params)),

  appointments: (params: ReportRangeParams & ReportQuery) =>
    getReport<AppointmentsReportData>('/reports/appointments', asQuery(params)),

  appointmentsExport: (
    params: ReportRangeParams & { status?: string; staffId?: string },
  ) => getReport<ReportExportPayload>('/reports/appointments/export', asQuery(params)),

  services: (params: ReportRangeParams & ReportQuery) =>
    getReport<ServicesReportData>('/reports/services', asQuery(params)),

  servicesExport: (
    params: ReportRangeParams & { category?: string; notSold?: boolean },
  ) => getReport<ReportExportPayload>('/reports/services/export', asQuery(params)),

  products: (params: ReportRangeParams & ReportQuery) =>
    getReport<ProductsReportData>('/reports/products', asQuery(params)),

  productsExport: (params: ReportRangeParams) =>
    getReport<ReportExportPayload>('/reports/products/export', asQuery(params)),
}
