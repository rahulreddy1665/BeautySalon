import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface Customer {
  _id: string
  name: string
  lastName?: string
  email?: string
  phone: number
  address?: string
  address1?: string
  pincode?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CustomerInput {
  name: string
  lastName?: string
  email?: string
  phone: number
  address?: string
  address1?: string
  pincode?: number
}

export const customersApi = {
  getAll: async (): Promise<Customer[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<Customer[]>>('/customer')
    return data.data ?? []
  },

  getById: async (id: string): Promise<Customer> => {
    const { data } = await apiClient.get<ApiSuccessResponse<Customer>>(`/customer/${id}`)
    return data.data
  },

  create: async (payload: CustomerInput): Promise<Customer> => {
    const { data } = await apiClient.post<ApiSuccessResponse<Customer>>(
      '/customer',
      payload,
    )
    return data.data
  },

  update: async (id: string, payload: Partial<CustomerInput>): Promise<Customer> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<Customer>>(
      `/customer/${id}`,
      payload,
    )
    return data.data
  },

  remove: async (id: string): Promise<Customer> => {
    const { data } = await apiClient.delete<ApiSuccessResponse<Customer>>(
      `/customer/${id}`,
    )
    return data.data
  },
}
