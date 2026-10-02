import { format, parseISO } from 'date-fns'
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Separator } from '@/app/components/ui/separator'
import { useBillQuery } from '@/app/hooks/queries/useBillingQuery'
import { cn, formatINR } from '@/app/utils'

function staffLabel(staff: string | { _id: string; name?: string }): string {
  return typeof staff === 'string' ? staff : staff.name || 'Staff'
}

export function InvoiceScreen() {
  const { id } = useParams<{ id: string }>()
  const invoiceQuery = useBillQuery(id)

  if (invoiceQuery.isLoading) return <LoadingSkeleton rows={6} />
  if (invoiceQuery.isError || !invoiceQuery.data) {
    return (
      <ErrorState
        error={invoiceQuery.error}
        title="Invoice not found"
        onRetry={() => void invoiceQuery.refetch()}
      />
    )
  }

  const inv = invoiceQuery.data
  const biz = inv.businessSnapshot
  const salonName = biz?.salonName || 'BeautySalon'
  const template = inv.templateId || 'classic'
  const customerName = inv.walkIn
    ? inv.walkInName || 'Walk-in'
    : [inv.customer?.name, inv.customer?.lastName].filter(Boolean).join(' ') ||
      'Customer'
  const lines = [
    ...inv.serviceItems.map((line) => ({
      name: line.name,
      qty: line.qty,
      unitPrice: line.price,
      lineTotal: line.lineTotal,
      staffName: staffLabel(line.staff),
    })),
    ...inv.productItems.map((line) => ({
      name: line.name,
      qty: line.qty,
      unitPrice: line.price,
      lineTotal: line.lineTotal,
      staffName: staffLabel(line.staff),
    })),
  ]
  const logoUrl =
    biz?.logoBase64 && biz.logoMimeType
      ? `data:${biz.logoMimeType};base64,${biz.logoBase64}`
      : null
  const payable = inv.amountPayable ?? inv.grandTotal
  const tax = inv.tax

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild size="sm" variant="outline" className="h-8">
          <Link to="/billing">
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            Bills
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8"
          onClick={() => window.print()}
        >
          <Printer className="size-4" strokeWidth={1.75} />
          Print
        </Button>
      </div>

      <PageHeader
        description={`${inv.invoiceNumber} · ${format(parseISO(inv.createdAt), 'dd MMM yyyy, HH:mm')}`}
        className="print:hidden"
      />

      <article
        className={cn(
          'invoice-sheet mx-auto border border-border bg-card p-4 text-sm text-foreground print:border-0',
          template === 'classic' && 'max-w-3xl print:max-w-none',
          template === 'compact' && 'max-w-xl text-xs',
          template === 'thermal' &&
            'max-w-[320px] font-mono text-[11px] leading-snug',
        )}
        data-template={template}
      >
        <header
          className={cn(
            'flex items-start justify-between gap-3',
            template === 'thermal' && 'flex-col items-center text-center',
          )}
        >
          <div className="flex min-w-0 items-start gap-2">
            {logoUrl && template !== 'thermal' ? (
              <img src={logoUrl} alt="" className="size-10 object-contain" />
            ) : null}
            {logoUrl && template === 'thermal' ? (
              <img src={logoUrl} alt="" className="mb-1 size-8 object-contain" />
            ) : null}
            <div>
              <h2 className="text-base font-semibold">{salonName}</h2>
              {biz?.address ? (
                <p className="text-[11px] text-muted-foreground">{biz.address}</p>
              ) : null}
              {biz?.phone || biz?.email ? (
                <p className="text-[11px] text-muted-foreground">
                  {[biz.phone, biz.email].filter(Boolean).join(' · ')}
                </p>
              ) : null}
              {tax?.gstEnabled && biz?.gstin ? (
                <p className="text-[11px] tabular-nums">GSTIN: {biz.gstin}</p>
              ) : null}
            </div>
          </div>
          <Badge
            variant="outline"
            className="rounded-md capitalize print:border-foreground"
          >
            {inv.status}
          </Badge>
        </header>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-[11px] text-muted-foreground">Bill to</p>
            <p className="font-medium">{customerName}</p>
            <p className="text-[11px] capitalize text-muted-foreground">
              {inv.source}
            </p>
          </div>
          <div className={template === 'thermal' ? 'text-left' : 'sm:text-right'}>
            <p className="tabular-nums font-medium">{inv.invoiceNumber}</p>
            <p className="text-[11px] text-muted-foreground">
              {format(parseISO(inv.createdAt), 'dd MMM yyyy, HH:mm')}
            </p>
            <p className="text-[11px] uppercase">{inv.paymentMode}</p>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="space-y-2">
          {lines.map((line, index) => (
            <div
              key={`${line.name}-${index}`}
              className="flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{line.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {line.qty} × {formatINR(line.unitPrice)} · {line.staffName}
                </p>
              </div>
              <p className="shrink-0 font-medium tabular-nums">
                {formatINR(line.lineTotal)}
              </p>
            </div>
          ))}
        </div>

        <Separator className="my-3" />

        <div className="space-y-1 tabular-nums">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Services</span>
            <span>{formatINR(inv.serviceSubtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Products</span>
            <span>{formatINR(inv.productSubtotal)}</span>
          </div>
          {(inv.serviceDiscountTotal > 0 || inv.productDiscountTotal > 0) && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service discount</span>
                <span>− {formatINR(inv.serviceDiscountTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product discount</span>
                <span>− {formatINR(inv.productDiscountTotal)}</span>
              </div>
            </>
          )}
          {tax?.gstEnabled ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  CGST
                  {tax.pricesIncludeGst ? ' (incl.)' : ''}
                </span>
                <span>{formatINR(tax.cgstTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  SGST
                  {tax.pricesIncludeGst ? ' (incl.)' : ''}
                </span>
                <span>{formatINR(tax.sgstTotal)}</span>
              </div>
            </>
          ) : null}
          {(inv.loyaltyRedeemValue ?? 0) > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Loyalty ({inv.loyaltyRedeemPoints} pts)
              </span>
              <span>− {formatINR(inv.loyaltyRedeemValue ?? 0)}</span>
            </div>
          ) : null}
          {inv.roundOff ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Round off</span>
              <span>
                {inv.roundOff > 0 ? '+' : ''}
                {formatINR(inv.roundOff)}
              </span>
            </div>
          ) : null}
          {(inv.tip ?? 0) > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tip</span>
              <span>{formatINR(inv.tip ?? 0)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-semibold">
            <span>Amount payable</span>
            <span>{formatINR(payable)}</span>
          </div>
        </div>

        {biz?.invoiceFooterNote ? (
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            {biz.invoiceFooterNote}
          </p>
        ) : null}
      </article>

      <style>{`
        @media print {
          @page {
            size: ${template === 'thermal' ? '80mm auto' : template === 'compact' ? 'A5' : 'A4'};
            margin: ${template === 'thermal' ? '4mm' : '12mm'};
          }
          body { background: white !important; color: black !important; }
          .invoice-sheet { box-shadow: none !important; }
        }
      `}</style>
    </div>
  )
}
