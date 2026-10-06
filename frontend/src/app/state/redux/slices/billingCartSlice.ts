import { createSlice, type PayloadAction, nanoid } from '@reduxjs/toolkit'

import type { DiscountType, PaymentMode } from '@/app/constants'
import type { LineKind } from '@/app/service/billing/billingApi'

export interface CartLineDiscount {
  type: DiscountType
  value: number
}

export interface CartLineComponent {
  serviceId: string
  name: string
  listPrice: number
  staffId?: string
  staffName?: string
}

export interface CartLine {
  id: string
  catalogId: string
  kind: LineKind
  name: string
  unitPrice: number
  qty: number
  staffId?: string
  staffName?: string
  discount: CartLineDiscount
  /** Combo component staff assignments (kind === 'combo'). */
  components?: CartLineComponent[]
}

export interface SectionDiscount {
  type: DiscountType
  value: number
}

export interface BillingCartState {
  customerId: string | null
  customerName: string
  walkIn: boolean
  walkInPhone: string
  appointmentId: string | null
  lines: CartLine[]
  serviceDiscount: SectionDiscount
  productDiscount: SectionDiscount
  loyaltyRedeemPoints: number
  pointsValueRatio: number
  tip: number
  tipStaffId: string | null
  paymentMode: PaymentMode | null
  cashReceived: number
  notes: string
}

const zeroDiscount = (): SectionDiscount => ({ type: 'amount', value: 0 })

const initialState: BillingCartState = {
  customerId: null,
  customerName: 'Walk-in',
  walkIn: true,
  walkInPhone: '',
  appointmentId: null,
  lines: [],
  serviceDiscount: zeroDiscount(),
  productDiscount: zeroDiscount(),
  loyaltyRedeemPoints: 0,
  pointsValueRatio: 1,
  tip: 0,
  tipStaffId: null,
  paymentMode: null,
  cashReceived: 0,
  notes: '',
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function applyDiscount(
  base: number,
  discount: CartLineDiscount | SectionDiscount,
): number {
  const value = Math.max(0, Number(discount.value) || 0)
  if (discount.type === 'percent') {
    return round2(Math.min(base, (base * value) / 100))
  }
  return round2(Math.min(base, value))
}

const billingCartSlice = createSlice({
  name: 'billingCart',
  initialState,
  reducers: {
    resetCart: () => initialState,
    setWalkIn: (state) => {
      state.walkIn = true
      state.customerId = null
      state.customerName = 'Walk-in'
      state.walkInPhone = ''
      state.appointmentId = null
      state.loyaltyRedeemPoints = 0
      state.tip = 0
    },
    setCustomer: (state, action: PayloadAction<{ id: string; name: string }>) => {
      state.walkIn = false
      state.customerId = action.payload.id
      state.customerName = action.payload.name
      state.walkInPhone = ''
      state.appointmentId = null
    },
    beginCustomerSearch: (state) => {
      state.walkIn = false
      state.customerId = null
      state.customerName = ''
      state.walkInPhone = ''
      state.appointmentId = null
      state.loyaltyRedeemPoints = 0
    },
    setAppointmentId: (state, action: PayloadAction<string | null>) => {
      state.appointmentId = action.payload
    },
    setWalkInDetails: (
      state,
      action: PayloadAction<{ name?: string; phone?: string }>,
    ) => {
      if (action.payload.name !== undefined) {
        state.customerName = action.payload.name
      }
      if (action.payload.phone !== undefined) {
        state.walkInPhone = action.payload.phone
      }
    },
    loadFromAppointment: (
      state,
      action: PayloadAction<{
        appointmentId: string
        customerId: string | null
        customerName: string
        walkIn: boolean
        walkInPhone?: string
        notes?: string
        lines: Array<
          Omit<CartLine, 'id' | 'discount'> & { id?: string; discount?: CartLineDiscount }
        >
      }>,
    ) => {
      const payload = action.payload
      state.appointmentId = payload.appointmentId
      state.customerId = payload.customerId
      state.customerName = payload.customerName
      state.walkIn = payload.walkIn
      state.walkInPhone = payload.walkInPhone ?? ''
      state.notes = payload.notes ?? ''
      state.lines = payload.lines.map((line) => ({
        ...line,
        id: line.id ?? nanoid(),
        discount: line.discount ?? { type: 'amount', value: 0 },
      }))
      state.serviceDiscount = zeroDiscount()
      state.productDiscount = zeroDiscount()
      state.loyaltyRedeemPoints = 0
      state.tip = 0
      state.tipStaffId = null
      state.paymentMode = null
      state.cashReceived = 0
    },
    addLine: (
      state,
      action: PayloadAction<
        Omit<CartLine, 'id' | 'discount'> & { id?: string; discount?: CartLineDiscount }
      >,
    ) => {
      state.lines.push({
        ...action.payload,
        id: action.payload.id ?? nanoid(),
        discount: action.payload.discount ?? { type: 'amount', value: 0 },
      })
    },
    updateLine: (
      state,
      action: PayloadAction<{ id: string; patch: Partial<CartLine> }>,
    ) => {
      const line = state.lines.find((item) => item.id === action.payload.id)
      if (line) Object.assign(line, action.payload.patch)
    },
    removeLine: (state, action: PayloadAction<string>) => {
      state.lines = state.lines.filter((item) => item.id !== action.payload)
    },
    setServiceDiscount: (state, action: PayloadAction<Partial<SectionDiscount>>) => {
      state.serviceDiscount = { ...state.serviceDiscount, ...action.payload }
    },
    setProductDiscount: (state, action: PayloadAction<Partial<SectionDiscount>>) => {
      state.productDiscount = { ...state.productDiscount, ...action.payload }
    },
    setLoyaltyRedeemPoints: (state, action: PayloadAction<number>) => {
      state.loyaltyRedeemPoints = Math.max(0, Math.floor(action.payload))
    },
    setPointsValueRatio: (state, action: PayloadAction<number>) => {
      state.pointsValueRatio = Math.max(0, action.payload)
    },
    setTip: (state, action: PayloadAction<number>) => {
      const n = Number(action.payload)
      state.tip = Math.max(0, round2(Number.isFinite(n) ? n : 0))
    },
    setTipStaffId: (state, action: PayloadAction<string | null>) => {
      state.tipStaffId = action.payload
    },
    setPaymentMode: (state, action: PayloadAction<PaymentMode>) => {
      state.paymentMode = action.payload
      if (action.payload !== 'cash') state.cashReceived = 0
    },
    setCashReceived: (state, action: PayloadAction<number>) => {
      state.cashReceived = Math.max(0, round2(Number(action.payload) || 0))
    },
    setNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload
    },
    loadCart: (_state, action: PayloadAction<BillingCartState>) => action.payload,
  },
})

export const {
  resetCart,
  setWalkIn,
  setCustomer,
  beginCustomerSearch,
  setAppointmentId,
  setWalkInDetails,
  loadFromAppointment,
  addLine,
  updateLine,
  removeLine,
  setServiceDiscount,
  setProductDiscount,
  setLoyaltyRedeemPoints,
  setPointsValueRatio,
  setTip,
  setTipStaffId,
  setPaymentMode,
  setCashReceived,
  setNotes,
  loadCart,
} = billingCartSlice.actions

export default billingCartSlice.reducer

export interface DisplayTotalsInput {
  gstEnabled: boolean
  pricesIncludeGst: boolean
  servicesCgst: number
  servicesSgst: number
  productsCgst: number
  productsSgst: number
  rounding: 'none' | 'nearest' | 'up' | 'down'
  maxRedeemPercent: number
}

function sectionTax(
  net: number,
  cgst: number,
  sgst: number,
  inclusive: boolean,
  enabled: boolean,
) {
  if (!enabled || net <= 0) {
    return { taxable: net, cgst: 0, sgst: 0, taxTotal: 0, gross: net }
  }
  const rate = (cgst + sgst) / 100
  if (inclusive && rate > 0) {
    const taxable = round2(net / (1 + rate))
    const taxTotal = round2(net - taxable)
    const cgstAmt = round2((taxTotal * cgst) / (cgst + sgst || 1))
    const sgstAmt = round2(taxTotal - cgstAmt)
    return { taxable, cgst: cgstAmt, sgst: sgstAmt, taxTotal, gross: net }
  }
  const cgstAmt = round2((net * cgst) / 100)
  const sgstAmt = round2((net * sgst) / 100)
  const taxTotal = round2(cgstAmt + sgstAmt)
  return {
    taxable: net,
    cgst: cgstAmt,
    sgst: sgstAmt,
    taxTotal,
    gross: round2(net + taxTotal),
  }
}

function applyRounding(amount: number, rule: DisplayTotalsInput['rounding']) {
  if (rule === 'none') return { rounded: amount, roundOff: 0 }
  if (rule === 'up') {
    const rounded = Math.ceil(amount)
    return { rounded, roundOff: round2(rounded - amount) }
  }
  if (rule === 'down') {
    const rounded = Math.floor(amount)
    return { rounded, roundOff: round2(rounded - amount) }
  }
  const rounded = Math.round(amount)
  return { rounded, roundOff: round2(rounded - amount) }
}

/** Per-line gross / discount / net for bill item rows and summary breakdown. */
export function lineDisplayAmounts(line: CartLine) {
  const gross = round2(line.unitPrice * line.qty)
  const disc = applyDiscount(gross, line.discount)
  return { gross, disc, net: round2(gross - disc) }
}

/**
 * Preview tip split matching backend: equal shares across distinct staff
 * (services then products, first-seen). Remainder cents go to the first staff.
 */
export function previewTipAllocations(
  tip: number,
  lines: CartLine[],
): Array<{ staffId: string; staffName: string; amount: number }> {
  if (tip <= 0) return []
  const seen = new Set<string>()
  const staff: Array<{ staffId: string; staffName: string }> = []
  const ordered = [
    ...lines.filter((l) => l.kind === 'service' || l.kind === 'combo'),
    ...lines.filter((l) => l.kind === 'product'),
  ]
  for (const line of ordered) {
    if (line.kind === 'combo') {
      for (const comp of line.components ?? []) {
        if (!comp.staffId || seen.has(comp.staffId)) continue
        seen.add(comp.staffId)
        staff.push({
          staffId: comp.staffId,
          staffName: comp.staffName?.trim() || comp.staffId,
        })
      }
      continue
    }
    if (!line.staffId || seen.has(line.staffId)) continue
    seen.add(line.staffId)
    staff.push({
      staffId: line.staffId,
      staffName: line.staffName?.trim() || line.staffId,
    })
  }
  if (staff.length === 0) return []
  const n = staff.length
  const baseCents = Math.floor(Math.round(tip * 100) / n)
  const base = baseCents / 100
  const allocations = staff.map((s) => ({ ...s, amount: base }))
  const remainder = round2(tip - round2(base * n))
  if (allocations[0]) {
    allocations[0].amount = round2(allocations[0].amount + remainder)
  }
  return allocations
}

/** Display-only estimate matching server order. */
export function selectCartTotals(cart: BillingCartState, tax?: DisplayTotalsInput) {
  const serviceLines = cart.lines.filter((l) => l.kind === 'service' || l.kind === 'combo')
  const productLines = cart.lines.filter((l) => l.kind === 'product')

  const lineNet = (line: CartLine) => lineDisplayAmounts(line)

  let serviceGross = 0
  let serviceLineDisc = 0
  let serviceLineNet = 0
  for (const line of serviceLines) {
    const n = lineNet(line)
    serviceGross = round2(serviceGross + n.gross)
    serviceLineDisc = round2(serviceLineDisc + n.disc)
    serviceLineNet = round2(serviceLineNet + n.net)
  }

  let productGross = 0
  let productLineDisc = 0
  let productLineNet = 0
  for (const line of productLines) {
    const n = lineNet(line)
    productGross = round2(productGross + n.gross)
    productLineDisc = round2(productLineDisc + n.disc)
    productLineNet = round2(productLineNet + n.net)
  }

  const serviceSectionDisc = applyDiscount(serviceLineNet, cart.serviceDiscount)
  const productSectionDisc = applyDiscount(productLineNet, cart.productDiscount)
  const serviceNet = round2(serviceLineNet - serviceSectionDisc)
  const productNet = round2(productLineNet - productSectionDisc)
  const netAfterDiscounts = round2(serviceNet + productNet)

  const gstEnabled = tax?.gstEnabled ?? false
  const inclusive = tax?.pricesIncludeGst ?? false
  const sTax = sectionTax(
    serviceNet,
    tax?.servicesCgst ?? 0,
    tax?.servicesSgst ?? 0,
    inclusive,
    gstEnabled,
  )
  const pTax = sectionTax(
    productNet,
    tax?.productsCgst ?? 0,
    tax?.productsSgst ?? 0,
    inclusive,
    gstEnabled,
  )
  const cgst = round2(sTax.cgst + pTax.cgst)
  const sgst = round2(sTax.sgst + pTax.sgst)
  const taxTotal = round2(sTax.taxTotal + pTax.taxTotal)
  const afterTax = gstEnabled
    ? inclusive
      ? round2(sTax.gross + pTax.gross)
      : round2(netAfterDiscounts + taxTotal)
    : netAfterDiscounts

  const maxRedeemValue = round2((netAfterDiscounts * (tax?.maxRedeemPercent ?? 0)) / 100)
  const ratio = Math.max(cart.pointsValueRatio, 0.01)
  const maxRedeemPointsByBill = Math.floor(maxRedeemValue / ratio)
  const loyaltyRedeemPoints = Math.min(
    Math.max(0, Math.floor(cart.loyaltyRedeemPoints)),
    maxRedeemPointsByBill,
  )
  const loyaltyRedeemValue = round2(loyaltyRedeemPoints * ratio)
  const afterLoyalty = round2(Math.max(0, afterTax - loyaltyRedeemValue))
  const { rounded, roundOff } = applyRounding(afterLoyalty, tax?.rounding ?? 'none')
  const tip = cart.tip
  const payable = round2(rounded + tip)
  const change =
    cart.paymentMode === 'cash' ? round2(Math.max(0, cart.cashReceived - payable)) : 0

  return {
    serviceGross,
    serviceDiscount: round2(serviceLineDisc + serviceSectionDisc),
    serviceNet,
    productGross,
    productDiscount: round2(productLineDisc + productSectionDisc),
    productNet,
    subtotal: netAfterDiscounts,
    cgst,
    sgst,
    taxTotal,
    maxRedeemValue,
    maxRedeemPointsByBill,
    loyaltyRedeemValue,
    roundOff,
    tip,
    payable,
    change,
    gstEnabled,
  }
}
