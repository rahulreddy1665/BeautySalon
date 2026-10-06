import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface SalonProduct {
  _id: string
  name: string
  price: number
  type?: 'retail' | 'consumable'
  trackStock?: boolean
  stockQty?: number
  unit?: string
  createdAt?: string
  updatedAt?: string
}

export interface ProductInput {
  name: string
  price?: number
  type?: 'retail' | 'consumable'
  unit?: string
  trackStock?: boolean
  openingStock?: number
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
  type?: 'retail' | 'consumable' | 'all'
  retailOnly?: boolean
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

  update: async (id: string, payload: Partial<ProductInput>): Promise<SalonProduct> => {
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
    const { data } = await apiClient.post<ApiSuccessResponse<ProductImportResult>>(
      '/product/import',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    )
    return data.data
  },

  addStock: async (
    id: string,
    payload: { quantity: number; note?: string },
  ): Promise<SalonProduct> => {
    const { data } = await apiClient.post<
      ApiSuccessResponse<{ product: SalonProduct }>
    >(`/product/${id}/stock/add`, payload)
    return data.data.product
  },

  useStock: async (
    id: string,
    payload: { quantity: number; reason: string; staffId?: string },
  ): Promise<SalonProduct> => {
    const { data } = await apiClient.post<
      ApiSuccessResponse<{ product: SalonProduct }>
    >(`/product/${id}/stock/use`, payload)
    return data.data.product
  },

  adjustStock: async (
    id: string,
    payload: { countedQty: number; reason: string },
  ): Promise<SalonProduct> => {
    const { data } = await apiClient.post<
      ApiSuccessResponse<{ product: SalonProduct }>
    >(`/product/${id}/stock/adjust`, payload)
    return data.data.product
  },

  ledger: async (
    id: string,
    params: { page?: number; limit?: number } = {},
  ) => {
    const { data } = await apiClient.get<
      ApiSuccessResponse<{
        items: Array<{
          _id: string
          type: string
          quantity: number
          balanceAfter: number
          reason?: string
          note?: string
          createdAt: string
          createdBy?: { name?: string; email?: string } | null
          reference?: { _id: string; invoiceNumber?: string } | null
        }>
        total: number
        page: number
        limit: number
        totalPages: number
      }>
    >(`/product/${id}/stock/ledger`, { params })
    return data.data
  },
}