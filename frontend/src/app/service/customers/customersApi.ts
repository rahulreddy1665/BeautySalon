import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface Customer {
  _id: string
  name: string
  lastName?: string
  email?: string
  phone: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CustomerInput {
  name?: string
  /** Legacy split name; sent as '' to fold it into `name`. */
  lastName?: string
  email?: string
  phone: number
}

export interface CustomerImportRowResult {
  row: number
  status: 'created' | 'updated' | 'skipped' | 'error'
  reason?: string
  name?: string
  phone?: string
}

export interface CustomerImportResult {
  results: CustomerImportRowResult[]
  summary: {
    created: number
    updated: number
    skipped: number
    error: number
    total: number
  }
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

  importFile: async (file: File): Promise<CustomerImportResult> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post<ApiSuccessResponse<CustomerImportResult>>(
      '/customer/import',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
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
