import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import {
  dashboardApi,
  type DashboardRange,
} from '@/app/service/dashboard/dashboardApi'

export function useOwnerDashboardQuery(range: DashboardRange = 'today') {
  return useQuery({
    queryKey: [...queryKeys.dashboard.owner(), range],
    queryFn: () => dashboardApi.get(range),
  })
}
