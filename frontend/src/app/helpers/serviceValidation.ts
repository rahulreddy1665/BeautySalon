import { z } from 'zod'

import { SERVICES } from '@/app/constants'

export const serviceFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  categoryId: z.string().trim().min(1, SERVICES.form.categoryPlaceholder),
  price: z
    .number()
    .min(0.01, 'Price must be greater than 0')
    .max(1_000_000, 'Price is too large'),
  durationMinutes: z
    .number()
    .int('Must be a whole number')
    .min(5, 'Minimum 5 minutes')
    .max(480, 'Maximum 8 hours')
    .refine((v) => v % 5 === 0, 'Use steps of 5 minutes'),
})

export type ServiceFormValues = z.infer<typeof serviceFormSchema>

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, SERVICES.categories.nameRequired)
    .max(80),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
