import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { reportsApi } from '@/app/service/reports/reportsApi'

export function useReportsOverviewQuery() {
  return useQuery({
    queryKey: queryKeys.reports.overview(),
    queryFn: () => reportsApi.overview(),
  })
}

export function useSalesReportQuery(params: {
  from: string
  to: string
  page?: number
  limit?: number
  q?: string
  chartSeries?: string
  sort?: string
  order?: string
}) {
  return useQuery({
    queryKey: queryKeys.reports.sales(params),
    queryFn: () => reportsApi.sales(params),
    enabled: Boolean(params.from && params.to),
  })
}

export function useStaffReportQuery(params: {
  from: string
  to: string
  page?: number
  limit?: number
  sort?: string
  order?: string
}) {
  return useQuery({
    queryKey: queryKeys.reports.staff(params),
    queryFn: () => reportsApi.staff(params),
    enabled: Boolean(params.from && params.to),
  })
}

export function useStaffLinesQuery(
  staffId: string | undefined,
  params: { from: string; to: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.reports.staffLines(staffId ?? '', params),
    queryFn: () => reportsApi.staffLines(staffId!, params),
    enabled: Boolean(enabled && staffId && params.from && params.to),
  })
}

export function useCustomersReportQuery(params: {
  from: string
  to: string
  tab?: string
  inactiveDays?: number
  page?: number
  limit?: number
  sort?: string
  order?: string
}) {
  return useQuery({
    queryKey: queryKeys.reports.customers(params),
    queryFn: () => reportsApi.customers(params),
    enabled: Boolean(params.from && params.to),
  })
}

export function useAppointmentsReportQuery(params: {
  from: string
  to: string
  status?: string
  staffId?: string
  page?: number
  limit?: number
  sort?: string
  order?: string
}) {
  return useQuery({
    queryKey: queryKeys.reports.appointments(params),
    queryFn: () => reportsApi.appointments(params),
    enabled: Boolean(params.from && params.to),
  })
}

export function useServicesReportQuery(params: {
  from: string
  to: string
  category?: string
  notSold?: boolean
  page?: number
  limit?: number
  sort?: string
  order?: string
}) {
  return useQuery({
    queryKey: queryKeys.reports.services(params),
    queryFn: () => reportsApi.services(params),
    enabled: Boolean(params.from && params.to),
  })
}

export function useProductsReportQuery(params: {
  from: string
  to: string
  page?: number
  limit?: number
  sort?: string
  order?: string
}) {
  return useQuery({
    queryKey: queryKeys.reports.products(params),
    queryFn: () => reportsApi.products(params),
    enabled: Boolean(params.from && params.to),
  })
}
