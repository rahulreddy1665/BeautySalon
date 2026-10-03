import { InvoiceDocument } from '@/app/components/invoice/InvoiceDocument'
import type { InvoiceViewModel } from '@/app/components/invoice/invoiceViewModel'
import { SETTINGS } from '@/app/constants'
import {
  buildPalette,
  resolveTemplateId,
  type InvoiceAccentPreset,
  type InvoiceTemplateId,
} from '@/app/theme/invoice-themes'
import { formatINR } from '@/app/utils'
import { cn } from '@/app/utils'

function sampleVm(
  templateId: InvoiceTemplateId,
  accentPreset: InvoiceAccentPreset,
  accentColor: string,
): InvoiceViewModel {
  const resolved = resolveTemplateId(templateId)
  return {
    templateId: resolved,
    palette: buildPalette(resolved, accentPreset, accentColor),
    showStaffNames: true,
    showLogo: false,
    termsText: SETTINGS.invoice.termsDefault,
    thankYouText: SETTINGS.invoice.thankYouDefault,
    salonName: 'Glow Studio',
    logoUrl: null,
    address: '12 MG Road, Bengaluru',
    phone: '+91 98765 43210',
    email: 'hello@glow.studio',
    gstin: '29ABCDE1234F1Z5',
    invoiceNumber: 'INV-2026-00042',
    dateLabel: '03 Oct 2026',
    customerName: 'Ananya Rao',
    customerPhone: '9876543210',
    serviceLines: [
      {
        name: 'Haircut',
        qty: 1,
        rate: 499,
        amount: 499,
        staffName: 'Riya',
        kind: 'service',
      },
    ],
    productLines: [
      {
        name: 'Shampoo 250ml',
        qty: 1,
        rate: 450,
        amount: 450,
        staffName: 'Front desk',
        kind: 'product',
      },
    ],
    serviceSubtotal: 499,
    productSubtotal: 450,
    serviceDiscount: 0,
    productDiscount: 0,
    taxable: 949,
    cgst: 85.41,
    sgst: 85.41,
    gstEnabled: true,
    loyaltyRedeem: 0,
    roundOff: 0.18,
    tip: 20,
    total: 1139.82,
    paymentMode: 'upi',
    formatMoney: formatINR,
  }
}

interface Props {
  templateId: InvoiceTemplateId
  accentPreset: InvoiceAccentPreset
  accentColor: string
  selected?: boolean
  onSelect?: () => void
  label: string
}

/** Selectable live preview card for settings. */
export function InvoiceTemplatePreview({
  templateId,
  accentPreset,
  accentColor,
  selected,
  onSelect,
  label,
}: Props) {
  const vm = sampleVm(templateId, accentPreset, accentColor)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col overflow-hidden rounded-md border text-left transition-colors',
        selected
          ? 'border-primary ring-2 ring-primary'
          : 'border-border hover:border-primary/40',
      )}
    >
      <div className="border-b border-border bg-muted/40 px-2 py-1.5 text-xs font-medium">
        {label}
      </div>
      <div className="max-h-56 overflow-hidden bg-muted/20 p-2">
        <div className="origin-top scale-[0.42]">
          <InvoiceDocument vm={vm} />
        </div>
      </div>
    </button>
  )
}
