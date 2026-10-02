import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export type StaffGender = 'Male' | 'Female' | 'Other'

export interface StaffMember {
  _id: string
  name: string
  age: number
  gender: StaffGender
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface StaffInput {
  name: string
  age: number
  gender: StaffGender
  isActive?: boolean
}

export interface PaginatedStaff {
  items: StaffMember[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface StaffListParams {
  search?: string
  isActive?: string
  page?: number
  limit?: number
}

export const staffApi = {
  list: async (params: StaffListParams = {}): Promise<PaginatedStaff> => {
    const { data } = await apiClient.get<ApiSuccessResponse<PaginatedStaff>>(
      '/staff',
      { params },
    )
    return data.data
  },

  getActive: async (): Promise<StaffMember[]> => {
    const page = await staffApi.list({ isActive: 'true', page: 1, limit: 100 })
    return page.items
  },

  getById: async (id: string): Promise<StaffMember> => {
    const { data } = await apiClient.get<ApiSuccessResponse<StaffMember>>(
      `/staff/${id}`,
    )
    return data.data
  },

  create: async (payload: StaffInput): Promise<StaffMember> => {
    const { data } = await apiClient.post<ApiSuccessResponse<StaffMember>>(
      '/staff',
      payload,
    )
    return data.data
  },

  update: async (
    id: string,
    payload: Partial<StaffInput>,
  ): Promise<StaffMember> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<StaffMember>>(
      `/staff/${id}`,
      payload,
    )
    return data.data
  },

  remove: async (id: string): Promise<StaffMember> => {
    const { data } = await apiClient.delete<ApiSuccessResponse<StaffMember>>(
      `/staff/${id}`,
    )
    return data.data
  },
}
