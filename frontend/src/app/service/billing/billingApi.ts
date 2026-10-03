import { format } from 'date-fns'

import {
  invoicesApi,
  type InvoiceRecord,
  type PaymentMode,
} from '@/app/service/invoices/invoicesApi'
import { productsApi } from '@/app/service/products/productsApi'

export type { PaymentMode }
export type BillStatus = string
export type LineKind = 'service' | 'product'

export interface CatalogItem {
  id: string
  name: string
  kind: LineKind
  price: number
}

export interface BillLineInput {
  catalogId: string
  kind: LineKind
  name: string
  unitPrice: number
  qty: number
  staffId?: string
  staffName?: string
  discount?: { type: 'percent' | 'amount'; value: number }
}

export interface PaymentSplit {
  cash: number
  upi: number
  card: number
}

export interface CreateBillPayload {
  customerId: string | null
  customerName: string
  walkIn: boolean
  walkInPhone?: string
  appointmentId?: string | null
  lines: BillLineInput[]
  serviceDiscount?: { type: 'percent' | 'amount'; value: number }
  productDiscount?: { type: 'percent' | 'amount'; value: number }
  tip?: number
  loyaltyRedeemPoints?: number
  payment: PaymentSplit
  notes?: string
}

export interface BillRecord {
  id: string
  invoiceNo: string
  createdAt: string
  status: string
  customerId: string | null
  customerName: string
  walkIn: boolean
  paymentMode: PaymentMode
  total: number
  subtotal: number
  source?: string
}

function customerNameFromInvoice(inv: InvoiceRecord): string {
  if (inv.walkIn) return inv.walkInName || 'Walk-in'
  return (
    [inv.customer?.name, inv.customer?.lastName].filter(Boolean).join(' ') ||
    'Customer'
  )
}

function dominantMode(payment: PaymentSplit): PaymentMode {
  const entries: Array<[PaymentMode, number]> = [
    ['cash', payment.cash],
    ['upi', payment.upi],
    ['card', payment.card],
  ]
  entries.sort((a, b) => b[1] - a[1])
  return entries[0]?.[1] ? entries[0][0] : 'cash'
}

export function mapInvoiceToBill(inv: InvoiceRecord): BillRecord {
  return {
    id: inv._id,
    invoiceNo: inv.invoiceNumber,
    createdAt: inv.createdAt,
    status: inv.status,
    customerId: inv.customer?._id ?? null,
    customerName: customerNameFromInvoice(inv),
    walkIn: inv.walkIn,
    paymentMode: inv.paymentMode,
    total: inv.grandTotal,
    subtotal: inv.serviceSubtotal + inv.productSubtotal,
    source: inv.source,
  }
}

export const billingApi = {
  list: async (params: Record<string, unknown> = {}): Promise<BillRecord[]> => {
    const page = await invoicesApi.list({
      page: 1,
      limit: 100,
      ...params,
    })
    return page.items.map(mapInvoiceToBill)
  },

  getById: async (id: string): Promise<InvoiceRecord> => {
    return invoicesApi.getById(id)
  },

  create: async (payload: CreateBillPayload): Promise<BillRecord> => {
    const paymentMode = dominantMode(payload.payment)
    const invoice = await invoicesApi.create({
      appointmentId: payload.appointmentId,
      customerId: payload.walkIn ? null : payload.customerId,
      walkIn: payload.walkIn,
      walkInName: payload.walkIn ? payload.customerName : undefined,
      walkInPhone: payload.walkIn ? payload.walkInPhone : undefined,
      serviceItems: payload.lines
        .filter((line) => line.kind === 'service')
        .map((line) => ({
          serviceId: line.catalogId,
          staffId: line.staffId!,
          qty: line.qty,
          discount: line.discount ?? { type: 'amount' as const, value: 0 },
        })),
      productItems: payload.lines
        .filter((line) => line.kind === 'product')
        .map((line) => ({
          productId: line.catalogId,
          staffId: line.staffId!,
          qty: line.qty,
          discount: line.discount ?? { type: 'amount' as const, value: 0 },
        })),
      serviceDiscount: payload.serviceDiscount,
      productDiscount: payload.productDiscount,
      paymentMode,
      tip: payload.tip,
      loyaltyRedeemPoints: payload.loyaltyRedeemPoints,
    })
    return mapInvoiceToBill(invoice)
  },

  products: async (): Promise<CatalogItem[]> => {
    const items = await productsApi.getAll()
    return items.map((p) => ({
      id: p._id,
      name: p.name,
      kind: 'product' as const,
      price: p.price,
    }))
  },
}

export function serviceUnitPrice(_id: string, apiPrice?: number): number {
  return apiPrice ?? 0
}

export function formatBillDate(iso: string): string {
  try {
    return format(new Date(iso), 'dd MMM yyyy')
  } catch {
    return iso
  }
}
