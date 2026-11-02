/**
 * Owner dashboard — single backend aggregate.
 * Money blocks are omitted when the user lacks canViewRevenue.
 */

import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export type DashboardRange = 'today' | 'week' | 'month'

export interface DashboardStat {
  value: number
  /** Null when prior period had no baseline (avoid fake 0% / 100%). */
  deltaPercent: number | null
  subtitle?: string
  walkIns?: number
  tips?: number
}

export interface DashboardAppointmentRow {
  id: string
  startTime: string
  status: string
  customerName: string
  services: string[]
  staffNames: string[]
  isUpcoming: boolean
}

export interface DashboardMonthlyPoint {
  month: string
  monthIndex: number
  revenue: number
  services: number
  products: number
}

export interface DashboardTopPerformer {
  staffId: string
  name: string
  sales: number
}

export interface DashboardRecentCustomer {
  id: string
  name: string
  lastService: string
  lastVisit: string
  visitCount: number
  points: number | null
}

export interface OwnerDashboard {
  range: DashboardRange
  loyaltyEnabled: boolean
  canViewRevenue: boolean
  stats: {
    activeClients: DashboardStat
    appointments: DashboardStat & { walkIns: number }
    collectionToday?: { value: number; tips: number }
    revenue?: DashboardStat
  }
  todaysAppointments: DashboardAppointmentRow[]
  todaysProgress: {
    completed: number
    total: number
    percent: number
    paymentSplit?: { cash: number; upi: number; card: number }
  }
  recentCustomers: DashboardRecentCustomer[]
  monthlyRevenue?: DashboardMonthlyPoint[]
  topPerformers?: DashboardTopPerformer[]
}

export const dashboardApi = {
  get: async (range: DashboardRange = 'today'): Promise<OwnerDashboard> => {
    const { data } = await apiClient.get<ApiSuccessResponse<OwnerDashboard>>(
      '/dashboard',
      { params: { range } },
    )
    return data.data
  },
}

/** @deprecated Use dashboardApi.get */
export async function fetchOwnerDashboard(
  range: DashboardRange = 'today',
): Promise<OwnerDashboard> {
  return dashboardApi.get(range)
}
