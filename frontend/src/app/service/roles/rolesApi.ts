import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface Role {
  _id: string
  name: string
  permissions?: unknown[]
}

export const rolesApi = {
  getAll: async (): Promise<Role[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<Role[]>>('/role')
    return data.data ?? []
  },
}
