import { z } from 'zod'

/** Indian mobile: optional +91 / 0, then 10 digits starting 6–9. */
const indianPhoneRegex = /^(?:\+?91[\s-]?|0)?([6-9]\d{9})$/

export const customerFormSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .refine((value) => indianPhoneRegex.test(value.replace(/\s/g, '')), {
      message: 'Enter a valid 10-digit Indian mobile number',
    }),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

export function phoneToNumber(phone: string): number {
  const match = phone.replace(/\s/g, '').match(indianPhoneRegex)
  return Number(match?.[1] ?? phone.replace(/\D/g, ''))
}

export function formValuesToPayload(values: CustomerFormValues) {
  return {
    name: values.name?.trim() ?? '',
    // Legacy records split first/last; the form edits the full name, so clear the old part.
    lastName: '',
    email: values.email || undefined,
    phone: phoneToNumber(values.phone),
  }
}
