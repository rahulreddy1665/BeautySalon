import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export type PublicBranding = {
  salonName: string
  logoUrl: string | null
}

export const brandingApi = {
  get: async (): Promise<PublicBranding> => {
    const { data } = await apiClient.get<ApiSuccessResponse<PublicBranding>>(
      '/public/branding',
    )
    return data.data
  },
}
