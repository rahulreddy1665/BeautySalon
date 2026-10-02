import { z } from 'zod'

/** Indian mobile: optional +91 / 0, then 10 digits starting 6–9. */
const indianPhoneRegex = /^(?:\+?91[\s-]?|0)?([6-9]\d{9})$/

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  lastName: z.string().trim().max(80).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .refine((value) => indianPhoneRegex.test(value.replace(/\s/g, '')), {
      message: 'Enter a valid 10-digit Indian mobile number',
    }),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  address1: z.string().trim().max(200).optional().or(z.literal('')),
  pincode: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || /^\d{6}$/.test(value), {
      message: 'PIN code must be 6 digits',
    }),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

export function phoneToNumber(phone: string): number {
  const match = phone.replace(/\s/g, '').match(indianPhoneRegex)
  return Number(match?.[1] ?? phone.replace(/\D/g, ''))
}

export function formValuesToPayload(values: CustomerFormValues) {
  return {
    name: values.name,
    lastName: values.lastName || undefined,
    email: values.email || undefined,
    phone: phoneToNumber(values.phone),
    address: values.address || undefined,
    address1: values.address1 || undefined,
    pincode: values.pincode ? Number(values.pincode) : undefined,
  }
}
