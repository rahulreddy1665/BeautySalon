import axios from 'axios'
import { Download, Printer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { InvoiceDocument } from '@/app/components/invoice/InvoiceDocument'
import { buildPublicInvoiceViewModel } from '@/app/components/invoice/publicInvoiceViewModel'
import { Button } from '@/app/components/ui/button'
import { BILLING, COMMON } from '@/app/constants'
import { publicInvoiceApi } from '@/app/service/invoices/invoicesApi'
import { downloadBlob, generateInvoicePdf, printInvoice } from '@/app/utils/invoicePdf'

export function PublicInvoiceScreen() {
  const { token } = useParams<{ token: string }>()
  const sheetRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const query = useQuery({
    queryKey: ['public-invoice', token],
    queryFn: () => publicInvoiceApi.getByToken(token!),
    enabled: Boolean(token),
    retry: 1,
    retryDelay: 1500,
  })

  const unavailable =
    axios.isAxiosError(query.error) &&
    (query.error.response?.status === 404 || query.error.response?.status === 410)

  useEffect(() => {
    document.title = query.data?.invoiceNumber
      ? `${query.data.invoiceNumber} · ${COMMON.appName}`
      : COMMON.appName
    let robots = document.querySelector('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }
    robots.setAttribute('content', 'noindex, nofollow')
    return () => {
      robots?.setAttribute('content', 'index, follow')
    }
  }, [query.data?.invoiceNumber])

  if (query.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {BILLING.invoice.loadingSlow}
      </div>
    )
  }
  if (query.isError && !unavailable) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm">{BILLING.invoice.loadFailed}</p>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          {COMMON.actions.retry}
        </Button>
      </div>
    )
  }
  if (unavailable || !query.data) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="text-sm">{BILLING.invoice.unavailable}</p>
      </div>
    )
  }

  const vm = buildPublicInvoiceViewModel(query.data)

  const onDownloadPdf = async () => {
    const el = sheetRef.current?.querySelector('.invoice-sheet') as HTMLElement | null
    if (!el) {
      printInvoice()
      return
    }
    setDownloading(true)
    try {
      const result = await generateInvoicePdf(el, `${query.data.invoiceNumber}.pdf`)
      if (result.ok) {
        downloadBlob(result.blob, result.fileName)
        return
      }
      toast.message(BILLING.invoice.pdfUnavailable)
      printInvoice()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-4xl bg-background px-3 py-4 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
        <Button type="button" size="sm" className="h-8" onClick={() => printInvoice()}>
          <Printer className="size-4" strokeWidth={1.75} />
          {BILLING.invoice.print}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={downloading}
          onClick={() => void onDownloadPdf()}
        >
          <Download className="size-4" strokeWidth={1.75} />
          {BILLING.invoice.downloadPdf}
        </Button>
      </div>

      <div className="overflow-x-auto" ref={sheetRef}>
        <InvoiceDocument
          vm={vm}
          className="min-w-0 max-w-full scale-[0.92] origin-top sm:scale-100 shadow-sm print:shadow-none print:scale-100"
        />
      </div>

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
