import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface ServiceCategory {
  _id: string
  name: string
  isActive: boolean
  activeServiceCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface CategoryInput {
  name: string
  isActive?: boolean
}

export const categoriesApi = {
  list: async (activeOnly = false): Promise<ServiceCategory[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<ServiceCategory[]>>(
      '/category',
      { params: activeOnly ? { activeOnly: true } : undefined },
    )
    return data.data ?? []
  },

  create: async (payload: CategoryInput): Promise<ServiceCategory> => {
    const { data } = await apiClient.post<ApiSuccessResponse<ServiceCategory>>(
      '/category',
      payload,
    )
    return data.data
  },

  update: async (
    id: string,
    payload: Partial<CategoryInput>,
  ): Promise<ServiceCategory> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<ServiceCategory>>(
      `/category/${id}`,
      payload,
    )
    return data.data
  },
}
