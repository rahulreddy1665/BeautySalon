/**
 * Client-side invoice PDF via html2pdf.js (DOM → canvas → PDF).
 * Loaded on demand so the main bundle stays under the PWA precache limit.
 * PDF is never stored on the server.
 */

export type InvoicePdfResult =
  | { ok: true; blob: Blob; fileName: string }
  | { ok: false; reason: 'unavailable' | 'failed'; fileName: string }

type JsPdfFormat = 'a4' | 'a5' | [number, number]

function pageFormat(templateId: string | null): {
  format: JsPdfFormat
  margin: number | [number, number, number, number]
} {
  if (templateId === 'thermal') {
    return { format: [80, 297], margin: [4, 4, 4, 4] }
  }
  if (templateId === 'compact') {
    return { format: 'a5', margin: [8, 8, 8, 8] }
  }
  return { format: 'a4', margin: [10, 10, 10, 10] }
}

/** Drop the off-screen capture frame that otherwise steals the cursor after a tab switch. */
export function releaseCaptureLock(): void {
  document.querySelectorAll('iframe.html2canvas-container').forEach((node) => {
    node.remove()
  })
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  if (document.body.style.pointerEvents === 'none') {
    document.body.style.pointerEvents = ''
  }
}

function prepareClone(source: HTMLElement): {
  host: HTMLElement
  clone: HTMLElement
} {
  const clone = source.cloneNode(true) as HTMLElement
  clone.style.transform = 'none'
  clone.style.scale = '1'
  clone.style.width =
    source.getAttribute('data-template') === 'thermal'
      ? '320px'
      : source.getAttribute('data-template') === 'compact'
        ? '560px'
        : '794px'
  clone.style.maxWidth = 'none'
  clone.style.boxShadow = 'none'
  clone.classList.remove('shadow-sm')

  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;opacity:1;'
  host.appendChild(clone)
  document.body.appendChild(host)
  return { host, clone }
}

/**
 * Generate a PDF Blob from the on-screen invoice element.
 */
export async function generateInvoicePdf(
  element: HTMLElement,
  fileName: string,
): Promise<InvoicePdfResult> {
  const templateId = element.getAttribute('data-template')
  const { format, margin } = pageFormat(templateId)
  const { host, clone } = prepareClone(element)
  const onHide = () => {
    if (document.visibilityState === 'hidden') releaseCaptureLock()
  }
  document.addEventListener('visibilitychange', onHide)

  try {
    const background =
      getComputedStyle(clone).backgroundColor ||
      clone.style.backgroundColor ||
      'rgb(255, 255, 255)'

    const mod = await import('html2pdf.js')
    const html2pdf = mod.default

    // Package typings omit pagebreak and overload html2pdf(); cast the worker.
    const worker = html2pdf() as unknown as {
      set: (opts: Record<string, unknown>) => {
        from: (el: HTMLElement) => {
          outputPdf: (type: string) => Promise<Blob>
        }
      }
    }

    const blob = await worker
      .set({
        margin,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: background,
          logging: false,
        },
        jsPDF: {
          unit: 'mm',
          format,
          orientation: 'portrait',
        },
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: ['.inv-row', '.inv-section', '.inv-header', '.inv-footer'],
        },
      })
      .from(clone)
      .outputPdf('blob')

    if (!(blob instanceof Blob) || blob.size === 0) {
      return { ok: false, reason: 'failed', fileName }
    }
    return { ok: true, blob, fileName }
  } catch {
    return { ok: false, reason: 'failed', fileName }
  } finally {
    document.removeEventListener('visibilitychange', onHide)
    host.remove()
    releaseCaptureLock()
  }
}

/** Trigger browser print for the current page (Save as PDF). */
export function printInvoice(): void {
  window.print()
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
