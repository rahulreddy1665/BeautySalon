import type { InvoiceTemplateId } from '@/app/service/settings/settingsApi'
import { cn } from '@/app/utils'

const SAMPLE = {
  salon: 'Glow Studio',
  invoiceNo: 'INV-2026-00042',
  customer: 'Ananya Rao',
  lines: [
    { name: 'Haircut', amount: '₹499' },
    { name: 'Shampoo 250ml', amount: '₹450' },
  ],
  tax: 'CGST ₹85.41 · SGST ₹85.41',
  total: '₹1,119.82',
}

interface Props {
  templateId: InvoiceTemplateId
}

/** Live print-style preview with sample data (settings chooser). */
export function InvoiceTemplatePreview({ templateId }: Props) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card p-3 text-foreground',
        templateId === 'thermal' && 'max-w-[280px] font-mono text-[11px]',
        templateId === 'compact' && 'max-w-md text-xs',
        templateId === 'classic' && 'text-sm',
      )}
    >
      <p
        className={cn(
          'font-semibold',
          templateId === 'thermal' && 'text-center uppercase tracking-wide',
        )}
      >
        {SAMPLE.salon}
      </p>
      <p className="text-muted-foreground tabular-nums">{SAMPLE.invoiceNo}</p>
      <p className="mt-2">Bill to: {SAMPLE.customer}</p>
      <div className="my-2 border-t border-border" />
      {SAMPLE.lines.map((line) => (
        <div key={line.name} className="flex justify-between gap-2 tabular-nums">
          <span>{line.name}</span>
          <span>{line.amount}</span>
        </div>
      ))}
      <div className="my-2 border-t border-border" />
      <p className="text-muted-foreground">{SAMPLE.tax}</p>
      <p className="mt-1 flex justify-between font-semibold tabular-nums">
        <span>Total</span>
        <span>{SAMPLE.total}</span>
      </p>
      <p className="mt-2 text-[10px] text-muted-foreground">
        {templateId === 'classic' && 'Classic A4 · full detail'}
        {templateId === 'compact' && 'Compact A5 · half page'}
        {templateId === 'thermal' && 'Thermal 58/80 mm · narrow receipt'}
      </p>
    </div>
  )
}
