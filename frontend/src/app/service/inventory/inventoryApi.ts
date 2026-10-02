/**
 * Inventory façade — delegates to `/api/product` (name + price catalog).
 * Stock adjust / history APIs were removed.
 */
import { productsApi, type SalonProduct } from '@/app/service/products/productsApi'

export type InventoryProduct = SalonProduct & {
  /** Compat aliases for older screens */
  id?: string
  unitPrice?: number
}

export type CreateProductPayload = { name: string; price: number }
export type UpdateProductPayload = Partial<CreateProductPayload>

export const inventoryApi = {
  list: async (): Promise<SalonProduct[]> => productsApi.getAll(),
  getById: (id: string) => productsApi.getById(id),
  create: (payload: CreateProductPayload) => productsApi.create(payload),
  update: (id: string, payload: UpdateProductPayload) =>
    productsApi.update(id, payload),
}

export type { SalonProduct }
