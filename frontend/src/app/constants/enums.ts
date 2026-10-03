/** Shared enums / option lists — no user-facing labels here (see feature string files). */

export const PAYMENT_MODES = ['cash', 'upi', 'card'] as const
export type PaymentMode = (typeof PAYMENT_MODES)[number]

export const APPOINTMENT_STATUSES = [
  'booked',
  'completed',
  'cancelled',
  'no_show',
] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const GENDERS = ['Male', 'Female', 'Other'] as const
export type Gender = (typeof GENDERS)[number]

export const DISCOUNT_TYPES = ['percent', 'amount'] as const
export type DiscountType = (typeof DISCOUNT_TYPES)[number]

export const LINE_KINDS = ['service', 'product'] as const
export type LineKind = (typeof LINE_KINDS)[number]

export const ROUNDING_RULES = ['none', 'nearest', 'up', 'down'] as const
export type RoundingRule = (typeof ROUNDING_RULES)[number]

export const INVOICE_TEMPLATES = [
  'creamGold',
  'blush',
  'compact',
  'thermal',
] as const
export type InvoiceTemplateId = (typeof INVOICE_TEMPLATES)[number]

export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const
export type Weekday = (typeof WEEKDAYS)[number]

export const TIP_CHIP_AMOUNTS = [50, 100, 200] as const
