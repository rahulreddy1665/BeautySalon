/**
 * MOCK loyalty adapter — no `/api/loyalty` on the backend yet.
 *
 * Gaps:
 * - GET/PATCH /api/loyalty/settings (earn/redeem rules)
 * - GET /api/loyalty/balances (per-customer points)
 * - GET /api/loyalty/ledger?customerId=
 * - POST /api/loyalty/adjust (manual earn/redeem + reason)
 * - Auto earn on bill pay / redeem at POS
 *
 * Persists rules, balances, and ledger in localStorage.
 * Customer names come from real `/api/customer` when the UI joins them.
 */

export type LoyaltyMovementType = 'earn' | 'redeem' | 'adjust'

export interface LoyaltyRules {
  /** Points earned per ₹100 of bill (after discount, before GST). */
  earnPointsPer100Inr: number
  /** ₹ value of 1 redeemed point. */
  redeemValuePerPoint: number
  /** Minimum points a customer can redeem in one visit. */
  minRedeemPoints: number
  /** 0 = never expire. */
  pointsExpiryDays: number
  updatedAt: string
}

export interface LoyaltyBalance {
  customerId: string
  points: number
  updatedAt: string
}

export interface LoyaltyMovement {
  id: string
  customerId: string
  type: LoyaltyMovementType
  points: number
  reason: string
  balanceAfter: number
  createdAt: string
}

export interface AdjustLoyaltyPayload {
  customerId: string
  type: LoyaltyMovementType
  points: number
  reason: string
}

export interface UpdateLoyaltyRulesPayload {
  earnPointsPer100Inr: number
  redeemValuePerPoint: number
  minRedeemPoints: number
  pointsExpiryDays: number
}

export const LOYALTY_API_GAPS = [
  'GET/PATCH /api/loyalty/settings — missing',
  'GET /api/loyalty/balances — missing',
  'GET /api/loyalty/ledger — missing',
  'POST /api/loyalty/adjust — missing',
  'Auto earn on paid bill / redeem at POS — missing',
] as const

const RULES_KEY = 'beauty-salon.loyalty.rules'
const BALANCES_KEY = 'beauty-salon.loyalty.balances'
const LEDGER_KEY = 'beauty-salon.loyalty.ledger'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function defaultRules(): LoyaltyRules {
  return {
    earnPointsPer100Inr: 10,
    redeemValuePerPoint: 1,
    minRedeemPoints: 50,
    pointsExpiryDays: 365,
    updatedAt: new Date().toISOString(),
  }
}

/** Deterministic seed points (same formula as former customerExtrasMock). */
export function seedPointsForCustomer(customerId: string): number {
  let hash = 0
  for (let i = 0; i < customerId.length; i += 1) {
    hash = (hash + customerId.charCodeAt(i) * (i + 1)) % 997
  }
  return 50 + (hash % 450)
}

function readRules(): LoyaltyRules {
  try {
    const raw = localStorage.getItem(RULES_KEY)
    if (!raw) {
      const rules = defaultRules()
      writeRules(rules)
      return rules
    }
    return JSON.parse(raw) as LoyaltyRules
  } catch {
    return defaultRules()
  }
}

function writeRules(rules: LoyaltyRules) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules))
}

function readBalances(): LoyaltyBalance[] {
  try {
    const raw = localStorage.getItem(BALANCES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as LoyaltyBalance[]
  } catch {
    return []
  }
}

function writeBalances(balances: LoyaltyBalance[]) {
  localStorage.setItem(BALANCES_KEY, JSON.stringify(balances))
}

function readLedger(): LoyaltyMovement[] {
  try {
    const raw = localStorage.getItem(LEDGER_KEY)
    if (!raw) return []
    return JSON.parse(raw) as LoyaltyMovement[]
  } catch {
    return []
  }
}

function writeLedger(movements: LoyaltyMovement[]) {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(movements))
}

function ensureBalance(customerId: string): LoyaltyBalance {
  const balances = readBalances()
  const existing = balances.find((b) => b.customerId === customerId)
  if (existing) return existing

  const seeded: LoyaltyBalance = {
    customerId,
    points: seedPointsForCustomer(customerId),
    updatedAt: new Date().toISOString(),
  }
  writeBalances([seeded, ...balances])

  const ledger = readLedger()
  if (!ledger.some((m) => m.customerId === customerId)) {
    writeLedger([
      {
        id: `loy-seed-${customerId}`,
        customerId,
        type: 'earn',
        points: seeded.points,
        reason: 'Opening balance (mock seed)',
        balanceAfter: seeded.points,
        createdAt: seeded.updatedAt,
      },
      ...ledger,
    ])
  }

  return seeded
}

/** Sync read for billing cart / customer detail. */
export function getLoyaltyPointsSync(customerId: string): number {
  return ensureBalance(customerId).points
}

export function getLoyaltyRulesSync(): LoyaltyRules {
  return readRules()
}

export const loyaltyMockApi = {
  getRules: async (): Promise<LoyaltyRules> => {
    await delay(60)
    return readRules()
  },

  updateRules: async (
    payload: UpdateLoyaltyRulesPayload,
  ): Promise<LoyaltyRules> => {
    await delay(140)
    if (payload.earnPointsPer100Inr < 0 || payload.redeemValuePerPoint < 0) {
      throw new Error('Rates cannot be negative')
    }
    if (payload.minRedeemPoints < 0 || payload.pointsExpiryDays < 0) {
      throw new Error('Values cannot be negative')
    }
    const rules: LoyaltyRules = {
      ...payload,
      updatedAt: new Date().toISOString(),
    }
    writeRules(rules)
    return rules
  },

  listBalances: async (customerIds: string[]): Promise<LoyaltyBalance[]> => {
    await delay(100)
    return customerIds.map((id) => ensureBalance(id))
  },

  getBalance: async (customerId: string): Promise<LoyaltyBalance> => {
    await delay(60)
    return ensureBalance(customerId)
  },

  listLedger: async (customerId?: string): Promise<LoyaltyMovement[]> => {
    await delay(80)
    // Touch balances so seeds exist when browsing members first
    const all = readLedger().sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
    if (!customerId) return all
    ensureBalance(customerId)
    return all.filter((m) => m.customerId === customerId)
  },

  adjust: async (payload: AdjustLoyaltyPayload): Promise<LoyaltyBalance> => {
    await delay(160)
    const points = Math.floor(payload.points)
    if (!Number.isFinite(points) || points <= 0) {
      throw new Error('Points must be a positive whole number')
    }
    if (!payload.reason.trim()) {
      throw new Error('Reason is required')
    }
    if (!payload.customerId) {
      throw new Error('Customer is required')
    }

    const current = ensureBalance(payload.customerId)
    let next = current.points

    if (payload.type === 'earn') {
      next = current.points + points
    } else if (payload.type === 'redeem') {
      if (points > current.points) {
        throw new Error('Not enough points to redeem')
      }
      const rules = readRules()
      if (points < rules.minRedeemPoints) {
        throw new Error(`Minimum redeem is ${rules.minRedeemPoints} points`)
      }
      next = current.points - points
    } else {
      next = points
    }

    const updated: LoyaltyBalance = {
      customerId: payload.customerId,
      points: next,
      updatedAt: new Date().toISOString(),
    }

    const balances = readBalances().filter((b) => b.customerId !== payload.customerId)
    writeBalances([updated, ...balances])

    const movementPoints =
      payload.type === 'adjust' ? Math.abs(next - current.points) : points

    writeLedger([
      {
        id: `loy-${Date.now()}`,
        customerId: payload.customerId,
        type: payload.type,
        points: movementPoints,
        reason: payload.reason.trim(),
        balanceAfter: next,
        createdAt: updated.updatedAt,
      },
      ...readLedger(),
    ])

    return updated
  },
}
