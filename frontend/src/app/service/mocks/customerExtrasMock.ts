/**
 * MOCK — customer lifetime spend (no billing totals API yet).
 * Loyalty points now live in `loyaltyMock` — this module only covers spend.
 */
import { getLoyaltyPointsSync } from '@/app/service/mocks/loyaltyMock'

export interface CustomerExtrasMock {
  loyaltyPoints: number
  lifetimeSpend: number
}

function seedSpend(customerId: string): number {
  let hash = 0
  for (let i = 0; i < customerId.length; i += 1) {
    hash = (hash + customerId.charCodeAt(i) * (i + 1)) % 997
  }
  return 1500 + hash * 37
}

export function getCustomerExtrasMock(customerId: string): CustomerExtrasMock {
  return {
    loyaltyPoints: getLoyaltyPointsSync(customerId),
    lifetimeSpend: seedSpend(customerId),
  }
}

export const CUSTOMER_EXTRAS_GAPS = [
  'GET /api/loyalty/customer/:id — use loyaltyMock / future /api/loyalty',
  'GET /api/customer/:id/spend or billing totals — missing',
] as const
