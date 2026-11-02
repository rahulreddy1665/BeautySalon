import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export type RoundingRule = 'none' | 'nearest' | 'up' | 'down'
export type InvoiceTemplateId = 'creamGold' | 'blush' | 'compact' | 'thermal' | 'classic'

export type InvoiceAccentPreset =
  'gold' | 'blush' | 'teal' | 'charcoal' | 'sage' | 'plum' | 'custom'

export type Weekday =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface BusinessSettings {
  salonName: string
  logoBase64?: string | null
  logoMimeType?: string | null
  address?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
  email?: string
  gstin?: string
  invoiceFooterNote?: string
  openingTime?: string
  closingTime?: string
  workingDays?: Weekday[]
  allowNegativeStock?: boolean
}

export interface TaxRatePair {
  cgstPercent: number
  sgstPercent: number
}

export interface TaxSettings {
  gstEnabled: boolean
  pricesIncludeGst: boolean
  services: TaxRatePair
  products: TaxRatePair
}

export interface InvoiceSettings {
  prefix: string
  includeYear: boolean
  numberPadding: number
  rounding: RoundingRule
  templateId: InvoiceTemplateId
  accentPreset?: InvoiceAccentPreset
  accentColor?: string
  showStaffNames?: boolean
  showLogo?: boolean
  termsText?: string
  thankYouText?: string
  whatsappMessage?: string
  shareLinkDays?: number
}

export interface AppointmentSettings {
  startHour: number
  endHour: number
  slotMinutes: number
  minNoticeHours?: number
  bookingWindowDays?: number
}

export interface LoyaltySettings {
  enabled: boolean
  earnPointsPer100Inr: number
  redeemValuePerPoint: number
  minRedeemPoints: number
  maxRedeemPercent: number
  pointsExpiryDays: number
}

export interface SalonSettings {
  business: BusinessSettings
  tax: TaxSettings
  invoice: InvoiceSettings
  appointments: AppointmentSettings
  loyalty: LoyaltySettings
  invoicePreview?: { nextNumber: number; preview: string }
  updatedAt?: string
}

export function logoDataUrl(business?: BusinessSettings | null): string | null {
  if (!business?.logoBase64 || !business.logoMimeType) return null
  return `data:${business.logoMimeType};base64,${business.logoBase64}`
}

export const settingsApi = {
  get: async (): Promise<SalonSettings> => {
    const { data } = await apiClient.get<ApiSuccessResponse<SalonSettings>>('/settings', {
      timeout: 60_000,
    })
    return data.data
  },

  patchBusiness: async (
    payload: Partial<BusinessSettings>,
  ): Promise<BusinessSettings> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<BusinessSettings>>(
      '/settings/business',
      payload,
    )
    return data.data
  },

  uploadLogo: async (
    file: File,
  ): Promise<{
    logoBase64: string
    logoMimeType: string
  }> => {
    const form = new FormData()
    form.append('logo', file)
    const { data } = await apiClient.post<
      ApiSuccessResponse<{ logoBase64: string; logoMimeType: string }>
    >('/settings/business/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },

  removeLogo: async (): Promise<void> => {
    await apiClient.delete('/settings/business/logo')
  },

  patchTax: async (payload: Partial<TaxSettings>): Promise<TaxSettings> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<TaxSettings>>(
      '/settings/tax',
      payload,
    )
    return data.data
  },

  patchInvoice: async (payload: Partial<InvoiceSettings> & { nextNumber?: number }) => {
    const { data } = await apiClient.patch<
      ApiSuccessResponse<InvoiceSettings & { preview?: string; nextNumber?: number }>
    >('/settings/invoice', payload)
    return data.data
  },

  patchAppointments: async (
    payload: Partial<AppointmentSettings>,
  ): Promise<AppointmentSettings> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<AppointmentSettings>>(
      '/settings/appointments',
      payload,
    )
    return data.data
  },

  patchLoyalty: async (payload: Partial<LoyaltySettings>): Promise<LoyaltySettings> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<LoyaltySettings>>(
      '/settings/loyalty',
      payload,
    )
    return data.data
  },
}
