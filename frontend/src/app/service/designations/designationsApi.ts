import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface Designation {
  _id: string
  name: string
  isActive: boolean
  permissions: string[]
  maxDiscountPercent: number
  canViewRevenue: boolean
  canExport: boolean
  isSystemAdmin?: boolean
  staffCount?: number
}

export type DesignationInput = Partial<
  Omit<Designation, '_id' | 'isSystemAdmin'>
> & { name?: string }

export const designationsApi = {
  list: async (): Promise<Designation[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<Designation[]>>(
      '/designation',
    )
    return data.data
  },

  create: async (payload: DesignationInput): Promise<Designation> => {
    const { data } = await apiClient.post<ApiSuccessResponse<Designation>>(
      '/designation',
      payload,
    )
    return data.data
  },

  update: async (
    id: string,
    payload: DesignationInput,
  ): Promise<Designation> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<Designation>>(
      `/designation/${id}`,
      payload,
    )
    return data.data
  },

  remove: async (id: string): Promise<Designation> => {
    const { data } = await apiClient.delete<ApiSuccessResponse<Designation>>(
      `/designation/${id}`,
    )
    return data.data
  },
}
