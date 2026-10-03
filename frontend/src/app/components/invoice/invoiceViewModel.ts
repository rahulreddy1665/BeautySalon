import { BILLING, COMMON, SETTINGS } from '@/app/constants'
import type { InvoiceRecord } from '@/app/service/invoices/invoicesApi'
import {
  buildPalette,
  resolveTemplateId,
  type InvoiceAccentPreset,
  type InvoicePalette,
  type InvoiceTemplateId,
} from '@/app/theme/invoice-themes'
import { formatINR } from '@/app/utils'

export interface InvoiceLineView {
  name: string
  qty: number
  rate: number
  amount: number
  staffName?: string
  kind: 'service' | 'product'
}

export interface InvoiceViewModel {
  templateId: ReturnType<typeof resolveTemplateId>
  palette: InvoicePalette
  showStaffNames: boolean
  showLogo: boolean
  termsText: string
  thankYouText: string
  salonName: string
  logoUrl: string | null
  address?: string
  phone?: string
  email?: string
  gstin?: string
  invoiceNumber: string
  dateLabel: string
  customerName: string
  customerPhone?: string
  serviceLines: InvoiceLineView[]
  productLines: InvoiceLineView[]
  serviceSubtotal: number
  productSubtotal: number
  serviceDiscount: number
  productDiscount: number
  taxable: number
  cgst: number
  sgst: number
  gstEnabled: boolean
  loyaltyRedeem: number
  roundOff: number
  tip: number
  total: number
  paymentMode: string
  formatMoney: (n: number) => string
}

function staffLabel(staff: string | { _id: string; name?: string }): string {
  return typeof staff === 'string' ? staff : staff.name || ''
}

export function buildInvoiceViewModel(
  inv: InvoiceRecord,
  dateLabel: string,
): InvoiceViewModel {
  const snap = inv.templateSnapshot
  const templateId = resolveTemplateId(snap?.templateId ?? inv.templateId)
  const accentPreset = (snap?.accentPreset ?? 'gold') as InvoiceAccentPreset
  const accentColor = snap?.accentColor
  const palette = buildPalette(templateId, accentPreset, accentColor)
  const biz = inv.businessSnapshot
  const logoUrl =
    snap?.showLogo !== false && biz?.logoBase64 && biz.logoMimeType
      ? `data:${biz.logoMimeType};base64,${biz.logoBase64}`
      : null

  const serviceLines: InvoiceLineView[] = inv.serviceItems.map((line) => ({
    name: line.name,
    qty: line.qty,
    rate: line.price,
    amount: line.lineTotal,
    staffName: staffLabel(line.staff),
    kind: 'service',
  }))
  const productLines: InvoiceLineView[] = inv.productItems.map((line) => ({
    name: line.name,
    qty: line.qty,
    rate: line.price,
    amount: line.lineTotal,
    staffName: staffLabel(line.staff),
    kind: 'product',
  }))

  const customerName = inv.walkIn
    ? inv.walkInName || BILLING.new.walkIn
    : [inv.customer?.name, inv.customer?.lastName].filter(Boolean).join(' ') ||
      SETTINGS.invoice.customerFallback

  return {
    templateId,
    palette,
    showStaffNames: snap?.showStaffNames !== false,
    showLogo: snap?.showLogo !== false,
    termsText: snap?.termsText ?? '',
    thankYouText:
      snap?.thankYouText || biz?.invoiceFooterNote || SETTINGS.invoice.thankYouDefault,
    salonName: biz?.salonName || COMMON.appName,
    logoUrl,
    address: biz?.address,
    phone: biz?.phone,
    email: biz?.email,
    gstin: biz?.gstin,
    invoiceNumber: inv.invoiceNumber,
    dateLabel,
    customerName,
    customerPhone: inv.walkIn
      ? inv.walkInPhone
      : inv.customer?.phone != null
        ? String(inv.customer.phone)
        : undefined,
    serviceLines,
    productLines,
    serviceSubtotal: inv.serviceSubtotal,
    productSubtotal: inv.productSubtotal,
    serviceDiscount: inv.serviceDiscountTotal,
    productDiscount: inv.productDiscountTotal,
    taxable: (() => {
      const fromTax = (inv.tax?.servicesTaxable ?? 0) + (inv.tax?.productsTaxable ?? 0)
      if (fromTax > 0) return fromTax
      return (
        inv.serviceSubtotal +
        inv.productSubtotal -
        inv.serviceDiscountTotal -
        inv.productDiscountTotal
      )
    })(),
    cgst: inv.tax?.cgstTotal ?? 0,
    sgst: inv.tax?.sgstTotal ?? 0,
    gstEnabled: Boolean(inv.tax?.gstEnabled),
    loyaltyRedeem: inv.loyaltyRedeemValue ?? 0,
    roundOff: inv.roundOff ?? 0,
    tip: inv.tip ?? 0,
    total: inv.amountPayable ?? inv.grandTotal,
    paymentMode: inv.paymentMode,
    formatMoney: formatINR,
  }
}

export type { InvoiceTemplateId }
