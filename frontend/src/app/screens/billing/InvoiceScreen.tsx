import { format, parseISO } from 'date-fns'
import { ArrowLeft, Download, MessageCircle, Printer, Link2Off } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { InvoiceDocument } from '@/app/components/invoice/InvoiceDocument'
import { buildInvoiceViewModel } from '@/app/components/invoice/invoiceViewModel'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { BILLING, COMMON, ROUTES } from '@/app/constants'
import { useBillQuery } from '@/app/hooks/queries/useBillingQuery'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import {
  clearCachedShareUrl,
  sendInvoiceToCustomer,
} from '@/app/service/billing/sendInvoiceToCustomer'
import { invoicesApi } from '@/app/service/invoices/invoicesApi'
import { formatINR } from '@/app/utils'
import {
  downloadBlob,
  generateInvoicePdf,
  printInvoice,
  releaseCaptureLock,
} from '@/app/utils/invoicePdf'

export function InvoiceScreen() {
  const { id } = useParams<{ id: string }>()
  const invoiceQuery = useBillQuery(id)
  const settingsQuery = useSalonSettingsQuery()
  const sheetRef = useRef<HTMLDivElement>(null)
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState === 'hidden') return
      releaseCaptureLock()
    }
    window.addEventListener('focus', onReturn)
    document.addEventListener('visibilitychange', onReturn)
    return () => {
      window.removeEventListener('focus', onReturn)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [])

  if (invoiceQuery.isLoading) return <LoadingSkeleton rows={6} />
  if (invoiceQuery.isError || !invoiceQuery.data) {
    return (
      <ErrorState
        error={invoiceQuery.error}
        title={COMMON.errors.loadFailed}
        onRetry={() => void invoiceQuery.refetch()}
      />
    )
  }

  const inv = invoiceQuery.data
  const dateLabel = format(parseISO(inv.createdAt), 'dd MMM yyyy')
  const vm = buildInvoiceViewModel(inv, dateLabel)
  const fileName = `${inv.invoiceNumber}.pdf`

  const sheetEl = () =>
    sheetRef.current?.querySelector('.invoice-sheet') as HTMLElement | null

  const onDownloadPdf = async () => {
    const el = sheetEl()
    if (!el) {
      printInvoice()
      return
    }
    const result = await generateInvoicePdf(el, fileName)
    if (result.ok) {
      downloadBlob(result.blob, result.fileName)
      return
    }
    toast.message(BILLING.invoice.pdfUnavailable)
    printInvoice()
  }

  const runShare = async (phoneRaw: string, popup: Window | null) => {
    setSharing(true)
    setPhoneOpen(false)
    try {
      const outcome = await sendInvoiceToCustomer({
        invoiceId: inv._id,
        invoiceNumber: inv.invoiceNumber,
        customerName: vm.customerName,
        phoneRaw,
        salonName: vm.salonName,
        amountLabel: formatINR(vm.total),
        whatsappTemplate: settingsQuery.data?.invoice?.whatsappMessage,
        popup,
      })
      if (outcome.mode === 'error') {
        popup?.close()
        toast.error(outcome.message)
        return
      }
      if (outcome.mode === 'wa-me') {
        toast.message(outcome.instruction)
      }
    } finally {
      setSharing(false)
    }
  }

  const onShareWhatsApp = () => {
    const phone = vm.customerPhone?.trim()
    if (!phone) {
      setPhoneDraft('')
      setPhoneOpen(true)
      return
    }
    const popup = window.open('', '_blank')
    void runShare(phone, popup)
  }

  const onRevokeLink = async () => {
    if (!id) return
    await invoicesApi.revokeShareLink(id)
    clearCachedShareUrl(id)
    toast.success(BILLING.invoice.linkRevoked)
  }

  const actions = (
    <>
      <Button
        type="button"
        size="sm"
        className="h-9 min-touch"
        onClick={() => printInvoice()}
      >
        <Printer className="size-4" strokeWidth={1.75} />
        {BILLING.invoice.print}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 min-touch"
        onClick={() => void onDownloadPdf()}
      >
        <Download className="size-4" strokeWidth={1.75} />
        {BILLING.invoice.downloadPdf}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 min-touch"
        disabled={sharing}
        onClick={onShareWhatsApp}
      >
        <MessageCircle className="size-4" strokeWidth={1.75} />
        {BILLING.invoice.shareWhatsApp}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-9 min-touch"
        onClick={() => void onRevokeLink()}
      >
        <Link2Off className="size-4" strokeWidth={1.75} />
        {BILLING.invoice.revokeLink}
      </Button>
      <Button asChild size="sm" variant="outline" className="h-9 min-touch">
        <Link to={ROUTES.billingNew}>{BILLING.invoice.newBill}</Link>
      </Button>
      <Button asChild size="sm" variant="outline" className="h-9 min-touch">
        <Link to={ROUTES.billing}>
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          {BILLING.invoice.backToBills}
        </Link>
      </Button>
    </>
  )

  return (
    <div className="min-w-0 space-y-3 pb-24 sm:pb-0">
      <div className="hidden flex-wrap items-center gap-2 print:hidden sm:flex">
        {actions}
      </div>

      <div ref={sheetRef} className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <InvoiceDocument
          vm={vm}
          className="mx-auto w-full min-w-0 max-w-full origin-top scale-[0.88] shadow-sm sm:scale-100 print:scale-100 print:shadow-none"
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-2 pb-safe print:hidden sm:hidden">
        <div className="flex gap-2 overflow-x-auto">{actions}</div>
      </div>

      <Dialog open={phoneOpen} onOpenChange={setPhoneOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{BILLING.invoice.walkInPhoneTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {BILLING.invoice.walkInPhoneHint}
          </p>
          <Input
            inputMode="tel"
            autoComplete="tel"
            placeholder={BILLING.invoice.walkInPhoneLabel}
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
          />
          <DialogFooter>
            <Button
              type="button"
              disabled={sharing || !phoneDraft.trim()}
              onClick={() => {
                const popup = window.open('', '_blank')
                void runShare(phoneDraft, popup)
              }}
            >
              {BILLING.invoice.walkInPhoneContinue}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          @page {
            size: ${vm.templateId === 'thermal' ? '80mm auto' : vm.templateId === 'compact' ? 'A5' : 'A4'};
            margin: ${vm.templateId === 'thermal' ? '4mm' : '10mm'};
          }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .invoice-sheet {
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
