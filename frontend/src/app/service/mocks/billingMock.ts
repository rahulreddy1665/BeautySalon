import { listCatalogSync } from '@/app/service/mocks/inventoryMock'

/**
 * MOCK billing adapter — no `/api/billing` on the backend yet.
 *
 * REAL inputs used by the UI (fetched elsewhere):
 * - customers (`/api/customer`)
 * - services (`/api/service`) — names only; prices come from MOCK_SERVICE_PRICES
 * - staff (`/api/user`)
 *
 * Gaps:
 * - POST/GET /api/bills (or /billing)
 * - Products catalog / inventory SKUs
 * - Service.price on backend
 * - GST settings, payment ledger, loyalty redeem API
 *
 * Persists submitted bills in localStorage so list + invoice survive refresh
 * until a real API replaces this module.
 */

export type BillStatus = 'paid' | 'partial' | 'unpaid'
export type PaymentMode = 'cash' | 'upi' | 'card' | 'mixed'
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
  lines: BillLineInput[]
  discountAmount: number
  gstPercent: number
  loyaltyRedeemPoints: number
  loyaltyRedeemValue: number
  payment: PaymentSplit
  notes?: string
}

export interface BillRecord extends CreateBillPayload {
  id: string
  invoiceNo: string
  createdAt: string
  status: BillStatus
  subtotal: number
  gstAmount: number
  total: number
  paidTotal: number
  paymentMode: PaymentMode
}

export const BILLING_API_GAPS = [
  'GET/POST /api/bills — missing',
  'GET /api/bills/:id — missing',
  'Product catalog / inventory for bill lines — missing',
  'Service.price field — missing (using mock price map)',
  'Loyalty redeem API — missing',
  'GST / payment settings API — missing',
] as const

const STORAGE_KEY = 'beauty-salon.billing.mocks'

/** Default prices when `/service` has no price field. */
export const MOCK_SERVICE_PRICES: Record<string, number> = {
  default: 499,
}

/** @deprecated Prefer listCatalogSync from inventoryMock — kept for seed bills. */
export const MOCK_PRODUCTS: CatalogItem[] = [
  { id: 'prod-shampoo', name: 'Shampoo 250ml', kind: 'product', price: 450 },
  { id: 'prod-serum', name: 'Hair serum', kind: 'product', price: 699 },
  { id: 'prod-mask', name: 'Hair mask', kind: 'product', price: 550 },
  { id: 'prod-nail', name: 'Nail polish', kind: 'product', price: 299 },
]

function readStore(): BillRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedBills()
    return JSON.parse(raw) as BillRecord[]
  } catch {
    return seedBills()
  }
}

function writeStore(bills: BillRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills))
}

function seedBills(): BillRecord[] {
  const now = new Date()
  const seeded: BillRecord[] = [
    {
      id: 'bill-seed-1',
      invoiceNo: 'INV-1001',
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
      customerId: null,
      customerName: 'Walk-in',
      walkIn: true,
      lines: [
        {
          catalogId: 'svc',
          kind: 'service',
          name: 'Haircut',
          unitPrice: 499,
          qty: 1,
          staffName: 'Priya Nair',
        },
      ],
      discountAmount: 0,
      gstPercent: 18,
      loyaltyRedeemPoints: 0,
      loyaltyRedeemValue: 0,
      payment: { cash: 589, upi: 0, card: 0 },
      subtotal: 499,
      gstAmount: 90,
      total: 589,
      paidTotal: 589,
      status: 'paid',
      paymentMode: 'cash',
    },
  ]
  writeStore(seeded)
  return seeded
}

function paymentModeFromSplit(payment: PaymentSplit): PaymentMode {
  const parts = [payment.cash > 0, payment.upi > 0, payment.card > 0].filter(Boolean)
  if (parts.length > 1) return 'mixed'
  if (payment.upi > 0) return 'upi'
  if (payment.card > 0) return 'card'
  return 'cash'
}

function computeTotals(payload: CreateBillPayload) {
  const subtotal = payload.lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
  const afterDiscount = Math.max(0, subtotal - payload.discountAmount)
  const afterLoyalty = Math.max(0, afterDiscount - payload.loyaltyRedeemValue)
  const gstAmount = Math.round((afterLoyalty * payload.gstPercent) / 100)
  const total = afterLoyalty + gstAmount
  const paidTotal = payload.payment.cash + payload.payment.upi + payload.payment.card
  let status: BillStatus = 'unpaid'
  if (paidTotal >= total && total > 0) status = 'paid'
  else if (paidTotal > 0) status = 'partial'
  return { subtotal, gstAmount, total, paidTotal, status }
}

export function serviceUnitPrice(serviceId: string, apiPrice?: number): number {
  if (typeof apiPrice === 'number' && apiPrice > 0) return apiPrice
  return MOCK_SERVICE_PRICES[serviceId] ?? MOCK_SERVICE_PRICES.default ?? 499
}

export const billingMockApi = {
  list: async (): Promise<BillRecord[]> => {
    await delay(120)
    return readStore().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  },

  getById: async (id: string): Promise<BillRecord> => {
    await delay(80)
    const bill = readStore().find((item) => item.id === id)
    if (!bill) throw new Error('Invoice not found')
    return bill
  },

  create: async (payload: CreateBillPayload): Promise<BillRecord> => {
    await delay(200)
    const bills = readStore()
    const totals = computeTotals(payload)
    const invoiceNo = `INV-${1000 + bills.length + 1}`
    const record: BillRecord = {
      ...payload,
      ...totals,
      id: `bill-${Date.now()}`,
      invoiceNo,
      createdAt: new Date().toISOString(),
      paymentMode: paymentModeFromSplit(payload.payment),
    }
    writeStore([record, ...bills])
    return record
  },

  products: async (): Promise<CatalogItem[]> => {
    await delay(40)
    // Single SKU source: inventory mock (falls back to static list if empty)
    const catalog = listCatalogSync()
    return catalog.length > 0 ? catalog : MOCK_PRODUCTS
  },
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
