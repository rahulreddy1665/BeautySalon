import { z } from 'zod'

export const loyaltyRulesSchema = z.object({
  enabled: z.boolean(),
  earnPointsPer100Inr: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(1000, 'Too high'),
  redeemValuePerPoint: z
    .number()
    .min(0, 'Cannot be negative')
    .max(100, 'Too high'),
  minRedeemPoints: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(100_000, 'Too high'),
  maxRedeemPercent: z
    .number()
    .min(0, 'Cannot be negative')
    .max(100, 'Max 100%'),
  pointsExpiryDays: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Use 0 for never')
    .max(3650, 'Too high'),
})

export type LoyaltyRulesFormValues = z.infer<typeof loyaltyRulesSchema>

export const loyaltyAdjustSchema = z.object({
  customerId: z.string().min(1, 'Pick a customer'),
  type: z.enum(['earn', 'redeem', 'adjust']),
  points: z
    .number()
    .int('Must be a whole number')
    .positive('Must be greater than 0')
    .max(1_000_000, 'Too many points'),
  reason: z.string().trim().min(2, 'Reason is required').max(200),
})

export type LoyaltyAdjustFormValues = z.infer<typeof loyaltyAdjustSchema>
