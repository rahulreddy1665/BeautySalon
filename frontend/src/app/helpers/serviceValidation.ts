import { z } from 'zod'

export const serviceFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  category: z.string().trim().min(1, 'Category is required').max(80),
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
