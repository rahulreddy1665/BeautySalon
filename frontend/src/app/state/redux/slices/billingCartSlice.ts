import { createSlice, type PayloadAction, nanoid } from '@reduxjs/toolkit'

import type { LineKind, PaymentSplit } from '@/app/service/billing/billingApi'

export interface CartLine {
  id: string
  catalogId: string
  kind: LineKind
  name: string
  unitPrice: number
  qty: number
  staffId?: string
  staffName?: string
}

export interface BillingCartState {
  customerId: string | null
  customerName: string
  walkIn: boolean
  walkInPhone: string
  /** When set, collect payment via /api/invoice and complete the appointment */
  appointmentId: string | null
  lines: CartLine[]
  discountAmount: number
  gstPercent: number
  loyaltyRedeemPoints: number
  /** Display-only; server uses settings.loyalty.redeemValuePerPoint */
  pointsValueRatio: number
  tip: number
  payment: PaymentSplit
  notes: string
}

const initialState: BillingCartState = {
  customerId: null,
  customerName: 'Walk-in',
  walkIn: true,
  walkInPhone: '',
  appointmentId: null,
  lines: [],
  discountAmount: 0,
  gstPercent: 18,
  loyaltyRedeemPoints: 0,
  pointsValueRatio: 1,
  tip: 0,
  payment: { cash: 0, upi: 0, card: 0 },
  notes: '',
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
    setCustomer: (
      state,
      action: PayloadAction<{ id: string; name: string }>,
    ) => {
      state.walkIn = false
      state.customerId = action.payload.id
      state.customerName = action.payload.name
      state.walkInPhone = ''
      state.appointmentId = null
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
        lines: Array<Omit<CartLine, 'id'> & { id?: string }>
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
      }))
      state.discountAmount = 0
      state.loyaltyRedeemPoints = 0
      state.tip = 0
      state.payment = { cash: 0, upi: 0, card: 0 }
    },
    addLine: (
      state,
      action: PayloadAction<Omit<CartLine, 'id'> & { id?: string }>,
    ) => {
      state.lines.push({
        ...action.payload,
        id: action.payload.id ?? nanoid(),
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
    setDiscountAmount: (state, action: PayloadAction<number>) => {
      state.discountAmount = Math.max(0, action.payload)
    },
    setGstPercent: (state, action: PayloadAction<number>) => {
      state.gstPercent = Math.min(28, Math.max(0, action.payload))
    },
    setLoyaltyRedeemPoints: (state, action: PayloadAction<number>) => {
      state.loyaltyRedeemPoints = Math.max(0, Math.floor(action.payload))
    },
    setPointsValueRatio: (state, action: PayloadAction<number>) => {
      state.pointsValueRatio = Math.max(0, action.payload)
    },
    setTip: (state, action: PayloadAction<number>) => {
      const n = Number(action.payload)
      state.tip = Math.max(
        0,
        Math.round((Number.isFinite(n) ? n : 0) * 100) / 100,
      )
    },
    setPayment: (state, action: PayloadAction<Partial<PaymentSplit>>) => {
      state.payment = { ...state.payment, ...action.payload }
    },
    setNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload
    },
    payFullWith: (
      state,
      action: PayloadAction<{ mode: keyof PaymentSplit; total: number }>,
    ) => {
      state.payment = { cash: 0, upi: 0, card: 0 }
      state.payment[action.payload.mode] = action.payload.total
    },
  },
})

export const {
  resetCart,
  setWalkIn,
  setCustomer,
  setAppointmentId,
  setWalkInDetails,
  loadFromAppointment,
  addLine,
  updateLine,
  removeLine,
  setDiscountAmount,
  setGstPercent,
  setLoyaltyRedeemPoints,
  setPointsValueRatio,
  setTip,
  setPayment,
  setNotes,
  payFullWith,
} = billingCartSlice.actions

export default billingCartSlice.reducer

export function selectCartTotals(cart: BillingCartState) {
  const subtotal = cart.lines.reduce(
    (sum, line) => sum + line.unitPrice * line.qty,
    0,
  )
  const loyaltyRedeemValue = cart.loyaltyRedeemPoints * cart.pointsValueRatio
  const afterDiscount = Math.max(0, subtotal - cart.discountAmount)
  const afterLoyalty = Math.max(0, afterDiscount - loyaltyRedeemValue)
  const tip = cart.tip
  // Display estimate only — tax/rounding applied server-side
  const total = afterLoyalty + tip
  const paid =
    cart.payment.cash + cart.payment.upi + cart.payment.card
  return {
    subtotal,
    loyaltyRedeemValue,
    tip,
    total,
    paid,
    balance: Math.max(0, total - paid),
  }
}
