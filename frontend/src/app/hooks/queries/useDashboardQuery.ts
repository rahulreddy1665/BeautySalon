import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { fetchOwnerDashboard } from '@/app/service/dashboard/dashboardApi'

export function useOwnerDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.owner(),
    queryFn: () => fetchOwnerDashboard(),
  })
}
