import { format } from 'date-fns'

import { BILLING } from '@/app/constants'
import {
  lineDisplayAmounts,
  type BillingCartState,
} from '@/app/state/redux/slices/billingCartSlice'
import { formatINR } from '@/app/utils'

export function openEstimatePrintWindow(cart: BillingCartState, payable: number) {
  const when = format(new Date(), 'EEE, dd MMM yyyy, h:mm a')
  const rows = cart.lines
    .map((line) => {
      const { net, disc } = lineDisplayAmounts(line)
      const discNote =
        disc > 0 ? ` (−${formatINR(disc)})` : ''
      return `<tr>
        <td>${escapeHtml(line.name)}${discNote}</td>
        <td>${escapeHtml(line.staffName || '—')}</td>
        <td style="text-align:right">${line.qty}</td>
        <td style="text-align:right">${formatINR(line.unitPrice)}</td>
        <td style="text-align:right">${formatINR(net)}</td>
      </tr>`
    })
    .join('')

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${BILLING.new.estimateTitle}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: black; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .muted { color: gray; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid lightgray; padding: 8px 4px; text-align: left; }
    .total { margin-top: 16px; font-size: 18px; font-weight: 600; }
  </style>
</head>
<body>
  <h1>${BILLING.new.estimateTitle}</h1>
  <p class="muted">${BILLING.new.estimateDisclaimer} · ${BILLING.new.estimateNoNumber}</p>
  <p class="muted">${escapeHtml(cart.customerName || BILLING.new.walkIn)} · ${escapeHtml(when)}</p>
  <table>
    <thead>
      <tr>
        <th>${BILLING.new.item}</th>
        <th>${BILLING.new.stylist}</th>
        <th style="text-align:right">${BILLING.new.qty}</th>
        <th style="text-align:right">${BILLING.new.price}</th>
        <th style="text-align:right">${BILLING.new.net}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">${BILLING.new.payable}: ${formatINR(payable)}</p>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'noopener,noreferrer,width=720,height=800')
  if (!win) return
  win.document.write(html)
  win.document.close()
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
