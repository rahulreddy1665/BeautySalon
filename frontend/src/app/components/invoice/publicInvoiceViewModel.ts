import { format, parseISO } from 'date-fns'

import type { InvoiceViewModel } from '@/app/components/invoice/invoiceViewModel'
import { COMMON, SETTINGS } from '@/app/constants'
import type { PublicInvoicePayload } from '@/app/service/invoices/invoicesApi'
import {
  buildPalette,
  resolveTemplateId,
  type InvoiceAccentPreset,
} from '@/app/theme/invoice-themes'
import { formatINR } from '@/app/utils'

export function buildPublicInvoiceViewModel(inv: PublicInvoicePayload): InvoiceViewModel {
  const snap = inv.templateSnapshot
  const templateId = resolveTemplateId(snap?.templateId ?? inv.templateId)
  const accentPreset = (snap?.accentPreset ?? 'gold') as InvoiceAccentPreset
  const palette = buildPalette(templateId, accentPreset, snap?.accentColor)
  const biz = inv.businessSnapshot
  const logoUrl =
    snap?.showLogo !== false && biz?.logoBase64 && biz.logoMimeType
      ? `data:${biz.logoMimeType};base64,${biz.logoBase64}`
      : null

  const dateLabel = inv.createdAt ? format(parseISO(inv.createdAt), 'dd MMM yyyy') : ''

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
    customerName: inv.customerName,
    customerPhone: inv.customerPhone,
    serviceLines: inv.serviceItems.map((line) => ({
      name: line.name,
      qty: line.qty,
      rate: line.price,
      amount: line.lineTotal,
      staffName: line.staffName,
      kind: 'service' as const,
    })),
    productLines: inv.productItems.map((line) => ({
      name: line.name,
      qty: line.qty,
      rate: line.price,
      amount: line.lineTotal,
      staffName: line.staffName,
      kind: 'product' as const,
    })),
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
