import { useQuery } from '@tanstack/react-query'

import { COMMON } from '@/app/constants'
import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { brandingApi } from '@/app/service/public/brandingApi'

const FALLBACK = {
  salonName: COMMON.appName,
  logoUrl: null as string | null,
}

/** Unauthenticated salon name + logo for the login screen. */
export function usePublicBrandingQuery() {
  return useQuery({
    queryKey: queryKeys.publicBranding.detail(),
    queryFn: () => brandingApi.get(),
    staleTime: 5 * 60_000,
    retry: 1,
    placeholderData: FALLBACK,
  })
}

export function usePublicBranding() {
  const query = usePublicBrandingQuery()
  const data = query.data ?? FALLBACK
  return {
    salonName: data.salonName?.trim() || FALLBACK.salonName,
    logoUrl: data.logoUrl,
    isError: query.isError,
    isLoading: query.isLoading,
  }
}
