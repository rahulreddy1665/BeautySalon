import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface Booking {
  _id: string
  user: string | { _id: string; name?: string }
  customer: string | { _id: string; name?: string; lastName?: string }
  date: string
  invoice: string
  service: string
  createdAt?: string
}

export const bookingsApi = {
  getAll: async (): Promise<Booking[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<Booking[]>>('/booking')
    return data.data ?? []
  },
}
