import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

import type { BillingCartState } from '@/app/state/redux/slices/billingCartSlice'

export interface BillingDraft {
  id: string
  savedAt: string
  label: string
  cart: BillingCartState
}

export interface BillingDraftsState {
  drafts: BillingDraft[]
}

const initialState: BillingDraftsState = {
  drafts: [],
}

function draftLabel(cart: BillingCartState): string {
  const name = cart.customerName?.trim() || 'Walk-in'
  const count = cart.lines.length
  return count > 0 ? `${name} · ${count}` : name
}

function cloneCart(cart: BillingCartState): BillingCartState {
  return structuredClone(cart)
}

const billingDraftsSlice = createSlice({
  name: 'billingDrafts',
  initialState,
  reducers: {
    saveDraft: (state, action: PayloadAction<BillingCartState>) => {
      const cart = cloneCart(action.payload)
      state.drafts.unshift({
        id: nanoid(),
        savedAt: new Date().toISOString(),
        label: draftLabel(cart),
        cart,
      })
    },
    deleteDraft: (state, action: PayloadAction<string>) => {
      state.drafts = state.drafts.filter((d) => d.id !== action.payload)
    },
    clearDrafts: (state) => {
      state.drafts = []
    },
  },
})

export const { saveDraft, deleteDraft, clearDrafts } = billingDraftsSlice.actions
export default billingDraftsSlice.reducer
