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

const gstinRegex =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export const businessSettingsSchema = z.object({
  salonName: z.string().trim().min(1, 'Salon name is required').max(120),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  state: z.string().trim().max(80).optional().or(z.literal('')),
  pincode: z
    .string()
    .trim()
    .regex(/^$|^[1-9][0-9]{5}$/, 'Enter a valid 6-digit pincode')
    .optional()
    .or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('Invalid email')
    .optional()
    .or(z.literal('')),
  gstin: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => !v || gstinRegex.test(v), 'Invalid GSTIN')
    .optional()
    .or(z.literal('')),
  invoiceFooterNote: z.string().trim().max(200).optional().or(z.literal('')),
})

export type BusinessSettingsFormValues = z.infer<typeof businessSettingsSchema>

const ratePair = z.object({
  cgstPercent: z.number().min(0).max(50),
  sgstPercent: z.number().min(0).max(50),
})

export const taxSettingsSchema = z.object({
  gstEnabled: z.boolean(),
  pricesIncludeGst: z.boolean(),
  services: ratePair,
  products: ratePair,
})

export type TaxSettingsFormValues = z.infer<typeof taxSettingsSchema>

export const invoiceSettingsSchema = z.object({
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{1,10}$/, 'Letters, numbers, hyphen · max 10'),
  includeYear: z.boolean(),
  numberPadding: z.number().int().min(1).max(10),
  rounding: z.enum(['none', 'nearest', 'up', 'down']),
  templateId: z.enum(['classic', 'compact', 'thermal']),
  nextNumber: z.number().int().min(1).optional(),
})

export type InvoiceSettingsFormValues = z.infer<typeof invoiceSettingsSchema>

export const appointmentSettingsSchema = z
  .object({
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
    slotMinutes: z.union([
      z.literal(5),
      z.literal(10),
      z.literal(15),
      z.literal(20),
      z.literal(30),
      z.literal(45),
      z.literal(60),
    ]),
  })
  .refine((v) => v.endHour > v.startHour, {
    message: 'End must be after start',
    path: ['endHour'],
  })

export type AppointmentSettingsFormValues = z.infer<
  typeof appointmentSettingsSchema
>
