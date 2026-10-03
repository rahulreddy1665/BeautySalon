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
  designationId: z.string().optional().nullable(),
})

export type StaffFormValues = z.infer<typeof staffFormSchema>

export const staffLoginSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._]{4,20}$/, '4–20 chars: letters, numbers, dot, or underscore'),
  temporaryPassword: z.string().min(8, 'At least 8 characters'),
})

export type StaffLoginFormValues = z.infer<typeof staffLoginSchema>
