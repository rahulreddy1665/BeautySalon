import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface SalonProduct {
  _id: string
  name: string
  price: number
  createdAt?: string
  updatedAt?: string
}

export interface ProductInput {
  name: string
  price: number
}

export interface PaginatedProducts {
  items: SalonProduct[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ProductListParams {
  search?: string
  page?: number
  limit?: number
}

export interface ProductImportRowResult {
  row: number
  status: 'created' | 'updated' | 'skipped' | 'error'
  reason?: string
  name?: string
}

export interface ProductImportResult {
  results: ProductImportRowResult[]
  summary: {
    created: number
    updated: number
    skipped: number
    error: number
    total: number
  }
}

export const productsApi = {
  list: async (params: ProductListParams = {}): Promise<PaginatedProducts> => {
    const { data } = await apiClient.get<ApiSuccessResponse<PaginatedProducts>>(
      '/product',
      { params },
    )
    return data.data
  },

  getAll: async (): Promise<SalonProduct[]> => {
    const page = await productsApi.list({ page: 1, limit: 100 })
    return page.items
  },

  getById: async (id: string): Promise<SalonProduct> => {
    const { data } = await apiClient.get<ApiSuccessResponse<SalonProduct>>(
      `/product/${id}`,
    )
    return data.data
  },

  create: async (payload: ProductInput): Promise<SalonProduct> => {
    const { data } = await apiClient.post<ApiSuccessResponse<SalonProduct>>(
      '/product',
      payload,
    )
    return data.data
  },

  update: async (
    id: string,
    payload: Partial<ProductInput>,
  ): Promise<SalonProduct> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<SalonProduct>>(
      `/product/${id}`,
      payload,
    )
    return data.data
  },

  remove: async (id: string): Promise<SalonProduct> => {
    const { data } = await apiClient.delete<ApiSuccessResponse<SalonProduct>>(
      `/product/${id}`,
    )
    return data.data
  },

  importFile: async (file: File): Promise<ProductImportResult> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post<
      ApiSuccessResponse<ProductImportResult>
    >('/product/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },
}
