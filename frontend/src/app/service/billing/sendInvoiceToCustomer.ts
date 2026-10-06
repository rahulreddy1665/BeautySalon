/**
 * Free WhatsApp share path (client). Paid Cloud API will swap the body of
 * the backend `sendInvoiceToCustomer` — keep this as the UI entry so the
 * channel can change without touching InvoiceScreen.
 */

import { BILLING, SETTINGS } from '@/app/constants'
import { invoicesApi } from '@/app/service/invoices/invoicesApi'
import { downloadBlob, generateInvoicePdf } from '@/app/utils/invoicePdf'
import { fillWhatsAppMessage, normalizeWhatsAppPhone } from '@/app/utils/phone'

const CACHE_PREFIX = 'invoice-share-url:'

function cacheUrl(invoiceId: string, url: string) {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${invoiceId}`, url)
  } catch {
    /* ignore quota */
  }
}

/** Keep the token path, but always prefix the frontend the staff is using. */
function withFrontendOrigin(url: string): string {
  try {
    const parsed = new URL(url)
    return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return url
  }
}

function readCachedUrl(invoiceId: string): string | null {
  try {
    const cached = sessionStorage.getItem(`${CACHE_PREFIX}${invoiceId}`)
    return cached ? withFrontendOrigin(cached) : null
  } catch {
    return null
  }
}

export function clearCachedShareUrl(invoiceId: string) {
  try {
    sessionStorage.removeItem(`${CACHE_PREFIX}${invoiceId}`)
  } catch {
    /* ignore */
  }
}

async function ensureShareUrl(invoiceId: string): Promise<string> {
  const cached = readCachedUrl(invoiceId)
  const result = await invoicesApi.createShareLink(invoiceId)
  if (result.url) {
    const url = withFrontendOrigin(result.url)
    cacheUrl(invoiceId, url)
    return url
  }
  if (result.reused && cached) return cached
  // Active link exists but plaintext was lost — renew once.
  const renewed = await invoicesApi.createShareLink(invoiceId, { renew: true })
  if (!renewed.url) {
    throw new Error(BILLING.invoice.shareFailed)
  }
  const url = withFrontendOrigin(renewed.url)
  cacheUrl(invoiceId, url)
  return url
}

export type SendInvoiceInput = {
  invoiceId: string
  invoiceNumber: string
  customerName: string
  phoneRaw: string
  salonName: string
  amountLabel: string
  whatsappTemplate?: string
  sheetElement: HTMLElement | null
}

export type SendInvoiceOutcome =
  | { mode: 'native-share' }
  | { mode: 'wa-me'; instruction: string }
  | { mode: 'error'; message: string }

export async function sendInvoiceToCustomer(
  input: SendInvoiceInput,
): Promise<SendInvoiceOutcome> {
  const phone = normalizeWhatsAppPhone(input.phoneRaw)
  if (!phone) {
    return { mode: 'error', message: BILLING.invoice.invalidPhone }
  }

  let publicUrl: string
  try {
    publicUrl = await ensureShareUrl(input.invoiceId)
  } catch {
    return { mode: 'error', message: BILLING.invoice.shareFailed }
  }

  const message = fillWhatsAppMessage(
    input.whatsappTemplate || SETTINGS.invoice.whatsappDefault,
    {
      customer: input.customerName,
      salon: input.salonName,
      amount: input.amountLabel,
      link: publicUrl,
    },
  )

  const fileName = `${input.invoiceNumber}.pdf`
  let pdfFile: File | null = null
  if (input.sheetElement) {
    const pdf = await generateInvoicePdf(input.sheetElement, fileName)
    if (pdf.ok) {
      pdfFile = new File([pdf.blob], fileName, { type: 'application/pdf' })
    }
  }

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean
  }

  if (
    pdfFile &&
    typeof nav.share === 'function' &&
    typeof nav.canShare === 'function' &&
    nav.canShare({ files: [pdfFile] })
  ) {
    try {
      await nav.share({
        files: [pdfFile],
        title: input.invoiceNumber,
        text: message,
      })
      return { mode: 'native-share' }
    } catch {
      /* user cancelled or share failed — fall through */
    }
  }

  if (pdfFile) {
    downloadBlob(pdfFile, fileName)
  }

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  window.open(waUrl, '_blank', 'noopener,noreferrer')
  return {
    mode: 'wa-me',
    instruction: BILLING.invoice.whatsappDownloaded,
  }
}
