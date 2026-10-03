import { z } from 'zod'

const money = z.number().min(0, 'Must be 0 or more').max(1_000_000, 'Amount is too large')

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  price: money,
})

export type ProductFormValues = z.infer<typeof productFormSchema>
