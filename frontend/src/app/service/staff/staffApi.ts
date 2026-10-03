import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export type StaffGender = 'Male' | 'Female' | 'Other'
export type StaffLoginStatus =
  'login_enabled' | 'login_off' | 'must_change_password' | 'no_login'

export interface StaffMember {
  _id: string
  name: string
  age: number
  gender: StaffGender
  isActive: boolean
  designation?: { _id: string; name: string; isActive?: boolean } | string | null
  loginStatus?: StaffLoginStatus
  username?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface StaffInput {
  name: string
  age: number
  gender: StaffGender
  isActive?: boolean
  designationId?: string | null
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

export interface StaffLoginResult {
  staffId: string
  username: string
  temporaryPassword: string
  loginStatus: StaffLoginStatus
}

export const staffApi = {
  list: async (params: StaffListParams = {}): Promise<PaginatedStaff> => {
    const { data } = await apiClient.get<ApiSuccessResponse<PaginatedStaff>>('/staff', {
      params,
    })
    return data.data
  },

  getActive: async (): Promise<StaffMember[]> => {
    const page = await staffApi.list({ isActive: 'true', page: 1, limit: 100 })
    return page.items
  },

  getById: async (id: string): Promise<StaffMember> => {
    const { data } = await apiClient.get<ApiSuccessResponse<StaffMember>>(`/staff/${id}`)
    return data.data
  },

  create: async (payload: StaffInput): Promise<StaffMember> => {
    const { data } = await apiClient.post<ApiSuccessResponse<StaffMember>>(
      '/staff',
      payload,
    )
    return data.data
  },

  update: async (id: string, payload: Partial<StaffInput>): Promise<StaffMember> => {
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

  enableLogin: async (
    id: string,
    payload: { username: string; temporaryPassword?: string },
  ): Promise<StaffLoginResult> => {
    const { data } = await apiClient.post<ApiSuccessResponse<StaffLoginResult>>(
      `/staff/${id}/login`,
      payload,
    )
    return data.data
  },

  resetLoginPassword: async (
    id: string,
    temporaryPassword?: string,
  ): Promise<StaffLoginResult> => {
    const { data } = await apiClient.post<ApiSuccessResponse<StaffLoginResult>>(
      `/staff/${id}/login/reset`,
      { temporaryPassword },
    )
    return data.data
  },

  disableLogin: async (id: string): Promise<{ loginStatus: StaffLoginStatus }> => {
    const { data } = await apiClient.delete<
      ApiSuccessResponse<{ loginStatus: StaffLoginStatus }>
    >(`/staff/${id}/login`)
    return data.data
  },
}
