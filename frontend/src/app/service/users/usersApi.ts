import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface StaffUser {
  _id: string
  name: string
  email: string
  role?: string | { _id: string; name?: string }
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateStaffInput {
  name: string
  email: string
  password: string
  role: string
}

export interface UpdateStaffInput {
  name?: string
  email?: string
  isActive?: boolean
  /** Backend DTO is incomplete; sent when UI allows role change. */
  role?: string
  password?: string
}

export const usersApi = {
  getAll: async (): Promise<StaffUser[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<StaffUser[]>>('/user')
    return data.data ?? []
  },

  getById: async (id: string): Promise<StaffUser> => {
    const { data } = await apiClient.get<ApiSuccessResponse<StaffUser>>(`/user/${id}`)
    return data.data
  },

  create: async (payload: CreateStaffInput): Promise<StaffUser> => {
    const { data } = await apiClient.post<ApiSuccessResponse<StaffUser>>('/user', payload)
    return data.data
  },

  update: async (id: string, payload: UpdateStaffInput): Promise<StaffUser> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<StaffUser>>(
      `/user/${id}`,
      payload,
    )
    return data.data
  },

  /** Soft-deactivate (backend sets isActive: false). */
  deactivate: async (id: string): Promise<StaffUser> => {
    const { data } = await apiClient.delete<ApiSuccessResponse<StaffUser>>(`/user/${id}`)
    return data.data
  },
}

export function staffRoleLabel(user: StaffUser): string {
  if (!user.role) return '—'
  if (typeof user.role === 'string') return user.role
  return user.role.name ?? user.role._id
}

export function staffRoleId(user: StaffUser): string {
  if (!user.role) return ''
  if (typeof user.role === 'string') return user.role
  return user.role._id
}
