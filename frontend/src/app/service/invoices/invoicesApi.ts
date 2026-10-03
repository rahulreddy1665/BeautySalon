import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export type PaymentMode = 'upi' | 'cash' | 'card'

export interface InvoiceLineDiscount {
  type: 'percent' | 'amount'
  value: number
}

export interface CreateInvoiceServiceLine {
  serviceId: string
  staffId: string
  qty: number
  discount?: InvoiceLineDiscount
}

export interface CreateInvoiceProductLine {
  productId: string
  staffId: string
  qty: number
  discount?: InvoiceLineDiscount
}

export interface CreateInvoiceInput {
  customerId?: string | null
  walkIn?: boolean
  walkInName?: string
  walkInPhone?: string
  appointmentId?: string | null
  serviceItems?: CreateInvoiceServiceLine[]
  productItems?: CreateInvoiceProductLine[]
  serviceDiscount?: InvoiceLineDiscount
  productDiscount?: InvoiceLineDiscount
  paymentMode: PaymentMode
  tip?: number
  loyaltyRedeemPoints?: number
}

export interface InvoiceTaxSnapshot {
  gstEnabled: boolean
  pricesIncludeGst: boolean
  servicesCgstPercent: number
  servicesSgstPercent: number
  productsCgstPercent: number
  productsSgstPercent: number
  servicesTaxable: number
  productsTaxable: number
  servicesCgst: number
  servicesSgst: number
  productsCgst: number
  productsSgst: number
  cgstTotal: number
  sgstTotal: number
  taxTotal: number
}

export interface InvoiceRecord {
  _id: string
  invoiceNumber: string
  customer?: { _id: string; name?: string; lastName?: string; phone?: number } | null
  walkIn: boolean
  walkInName?: string
  walkInPhone?: string
  source: 'walk-in' | 'appointment'
  appointment?: string | null
  serviceItems: Array<{
    service: string
    name: string
    price: number
    qty: number
    staff: string | { _id: string; name?: string }
    discount: InvoiceLineDiscount
    lineTotal: number
  }>
  productItems: Array<{
    product: string
    name: string
    price: number
    qty: number
    staff: string | { _id: string; name?: string }
    discount: InvoiceLineDiscount
    lineTotal: number
  }>
  serviceSubtotal: number
  productSubtotal: number
  serviceDiscountTotal: number
  productDiscountTotal: number
  tax?: InvoiceTaxSnapshot
  loyaltyRedeemPoints?: number
  loyaltyRedeemValue?: number
  loyaltyEarnedPoints?: number
  roundOff?: number
  roundingRule?: string
  tip?: number
  amountPayable?: number
  grandTotal: number
  templateId?: 'creamGold' | 'blush' | 'compact' | 'thermal' | 'classic'
  templateSnapshot?: {
    templateId: 'creamGold' | 'blush' | 'compact' | 'thermal' | 'classic'
    accentPreset: string
    accentColor: string
    showStaffNames: boolean
    showLogo: boolean
    termsText: string
    thankYouText: string
  }
  businessSnapshot?: {
    salonName?: string
    gstin?: string
    address?: string
    phone?: string
    email?: string
    invoiceFooterNote?: string
    logoBase64?: string | null
    logoMimeType?: string | null
  }
  paymentMode: PaymentMode
  status: string
  createdAt: string
}

export interface PaginatedInvoices {
  items: InvoiceRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const invoicesApi = {
  list: async (params: Record<string, unknown> = {}): Promise<PaginatedInvoices> => {
    const { data } = await apiClient.get<ApiSuccessResponse<PaginatedInvoices>>(
      '/invoice',
      { params },
    )
    return data.data
  },

  getById: async (id: string): Promise<InvoiceRecord> => {
    const { data } = await apiClient.get<ApiSuccessResponse<InvoiceRecord>>(
      `/invoice/${id}`,
    )
    return data.data
  },

  create: async (payload: CreateInvoiceInput): Promise<InvoiceRecord> => {
    const { data } = await apiClient.post<ApiSuccessResponse<InvoiceRecord>>(
      '/invoice',
      payload,
    )
    return data.data
  },

  staffSales: async (from?: string, to?: string) => {
    const { data } = await apiClient.get<
      ApiSuccessResponse<
        Array<{
          staffId: string
          staffName: string
          serviceSales: number
          productSales: number
          totalSales: number
        }>
      >
    >('/invoice/staff-sales', { params: { from, to } })
    return data.data
  },

  createShareLink: async (
    id: string,
    opts: { renew?: boolean } = {},
  ): Promise<{
    reused: boolean
    url: string | null
    expiresAt: string
    hasActiveLink: boolean
  }> => {
    const { data } = await apiClient.post<
      ApiSuccessResponse<{
        reused: boolean
        url: string | null
        expiresAt: string
        hasActiveLink: boolean
      }>
    >(`/invoice/${id}/share-link`, opts)
    return data.data
  },

  revokeShareLink: async (id: string): Promise<{ revoked: boolean }> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ revoked: boolean }>>(
      `/invoice/${id}/revoke-share-link`,
    )
    return data.data
  },
}

export interface PublicInvoicePayload {
  invoiceNumber: string
  createdAt: string
  customerName: string
  customerPhone?: string
  serviceItems: Array<{
    name: string
    qty: number
    price: number
    lineTotal: number
    staffName?: string
  }>
  productItems: Array<{
    name: string
    qty: number
    price: number
    lineTotal: number
    staffName?: string
  }>
  serviceSubtotal: number
  productSubtotal: number
  serviceDiscountTotal: number
  productDiscountTotal: number
  tax: {
    gstEnabled: boolean
    servicesTaxable: number
    productsTaxable: number
    cgstTotal: number
    sgstTotal: number
    taxTotal: number
  }
  loyaltyRedeemValue: number
  roundOff: number
  tip: number
  amountPayable: number
  grandTotal: number
  paymentMode: PaymentMode
  templateId?: InvoiceRecord['templateId']
  templateSnapshot?: InvoiceRecord['templateSnapshot']
  businessSnapshot?: InvoiceRecord['businessSnapshot']
}

export const publicInvoiceApi = {
  getByToken: async (token: string): Promise<PublicInvoicePayload> => {
    const { data } = await apiClient.get<ApiSuccessResponse<PublicInvoicePayload>>(
      `/public/invoice/${token}`,
    )
    return data.data
  },
}
