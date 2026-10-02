import { z } from 'zod'

export const staffFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  age: z
    .number()
    .int('Must be a whole number')
    .min(14, 'Minimum age is 14')
    .max(80, 'Maximum age is 80'),
  gender: z.enum(['Male', 'Female', 'Other']),
  isActive: z.boolean(),
})

export type StaffFormValues = z.infer<typeof staffFormSchema>
