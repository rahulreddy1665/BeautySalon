import { z } from 'zod'

import { INVENTORY } from '@/app/constants'

const money = z.number().min(0, 'Must be 0 or more').max(1_000_000, 'Amount is too large')

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    price: money,
    type: z.enum(['retail', 'consumable']),
    unit: z.string().trim().max(40).optional(),
    trackStock: z.boolean(),
    openingStock: z.number().min(0).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === 'retail' && values.price <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Price must be greater than 0',
        path: ['price'],
      })
    }
  })

export type ProductFormValues = z.infer<typeof productFormSchema>

export const stockAddSchema = z.object({
  quantity: z.number().min(0.001, 'Quantity must be greater than 0'),
  note: z.string().trim().max(200).optional(),
})

export const stockUseSchema = z.object({
  quantity: z.number().min(0.001, 'Quantity must be greater than 0'),
  reason: z.string().trim().min(1, INVENTORY.stock.reasonRequired).max(200),
})

export const stockAdjustSchema = z.object({
  countedQty: z.number().min(0, 'Must be 0 or more'),
  reason: z.string().trim().min(1, INVENTORY.stock.reasonRequired).max(200),
})
