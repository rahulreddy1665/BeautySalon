/**
 * MOCK inventory adapter — no `/api/inventory` on the backend yet.
 *
 * Gaps:
 * - GET/POST/PATCH /api/inventory (products + stock levels)
 * - POST /api/inventory/:id/adjust (stock in/out with reason)
 * - GET /api/inventory/:id/history
 * - Low-stock query (`?lowStock=true`)
 * - Link from POS product sales → stock-out
 *
 * Persists products + movements in localStorage until a real API replaces this.
 * Catalog IDs are shared with billing mock products for a single SKU source.
 */

export type StockMovementType = 'in' | 'out' | 'adjust'

export interface InventoryProduct {
  id: string
  sku: string
  name: string
  category: string
  unit: string
  unitPrice: number
  costPrice: number
  qtyOnHand: number
  reorderLevel: number
  isActive: boolean
  updatedAt: string
}

export interface StockMovement {
  id: string
  productId: string
  type: StockMovementType
  qty: number
  reason: string
  balanceAfter: number
  createdAt: string
}

export interface CreateProductPayload {
  sku: string
  name: string
  category: string
  unit: string
  unitPrice: number
  costPrice: number
  qtyOnHand: number
  reorderLevel: number
}

export type UpdateProductPayload = Partial<CreateProductPayload> & {
  isActive?: boolean
}

export interface AdjustStockPayload {
  type: StockMovementType
  qty: number
  reason: string
}

export type StockLevel = 'out' | 'low' | 'ok'

export const INVENTORY_API_GAPS = [
  'GET/POST/PATCH /api/inventory — missing',
  'POST /api/inventory/:id/adjust — missing',
  'GET /api/inventory/:id/history — missing',
  'GET /api/inventory?lowStock=true — missing',
  'POS sale → stock-out link — missing',
] as const

export const INVENTORY_CATEGORIES = ['Hair', 'Skin', 'Nails', 'Color', 'Retail'] as const

const STORAGE_KEY = 'beauty-salon.inventory.mocks'
const HISTORY_KEY = 'beauty-salon.inventory.history'

interface InventoryStore {
  products: InventoryProduct[]
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function seedProducts(): InventoryProduct[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'prod-shampoo',
      sku: 'HR-SH-250',
      name: 'Shampoo 250ml',
      category: 'Hair',
      unit: 'bottle',
      unitPrice: 450,
      costPrice: 220,
      qtyOnHand: 4,
      reorderLevel: 8,
      isActive: true,
      updatedAt: now,
    },
    {
      id: 'prod-serum',
      sku: 'HR-SR-30',
      name: 'Hair serum',
      category: 'Hair',
      unit: 'bottle',
      unitPrice: 699,
      costPrice: 340,
      qtyOnHand: 12,
      reorderLevel: 6,
      isActive: true,
      updatedAt: now,
    },
    {
      id: 'prod-mask',
      sku: 'HR-MSK-200',
      name: 'Hair mask',
      category: 'Hair',
      unit: 'jar',
      unitPrice: 550,
      costPrice: 280,
      qtyOnHand: 2,
      reorderLevel: 5,
      isActive: true,
      updatedAt: now,
    },
    {
      id: 'prod-nail',
      sku: 'NL-PL-15',
      name: 'Nail polish',
      category: 'Nails',
      unit: 'bottle',
      unitPrice: 299,
      costPrice: 120,
      qtyOnHand: 0,
      reorderLevel: 10,
      isActive: true,
      updatedAt: now,
    },
    {
      id: 'prod-color',
      sku: 'CL-DYE-60',
      name: 'Hair color cream',
      category: 'Color',
      unit: 'tube',
      unitPrice: 850,
      costPrice: 420,
      qtyOnHand: 18,
      reorderLevel: 8,
      isActive: true,
      updatedAt: now,
    },
    {
      id: 'prod-wax',
      sku: 'SK-WX-400',
      name: 'Strip wax tin',
      category: 'Skin',
      unit: 'tin',
      unitPrice: 620,
      costPrice: 310,
      qtyOnHand: 7,
      reorderLevel: 6,
      isActive: true,
      updatedAt: now,
    },
    {
      id: 'prod-conditioner',
      sku: 'HR-CD-250',
      name: 'Conditioner 250ml',
      category: 'Hair',
      unit: 'bottle',
      unitPrice: 480,
      costPrice: 230,
      qtyOnHand: 15,
      reorderLevel: 8,
      isActive: true,
      updatedAt: now,
    },
  ]
}

function seedHistory(products: InventoryProduct[]): StockMovement[] {
  const now = Date.now()
  return products.flatMap((product, index) => [
    {
      id: `mov-seed-${product.id}-in`,
      productId: product.id,
      type: 'in' as const,
      qty: product.qtyOnHand + (index % 3) + 2,
      reason: 'Opening stock',
      balanceAfter: product.qtyOnHand + (index % 3) + 2,
      createdAt: new Date(now - (index + 4) * 86400000).toISOString(),
    },
    {
      id: `mov-seed-${product.id}-out`,
      productId: product.id,
      type: 'out' as const,
      qty: (index % 3) + 2,
      reason: 'Retail sale',
      balanceAfter: product.qtyOnHand,
      createdAt: new Date(now - (index + 1) * 86400000).toISOString(),
    },
  ])
}

function readStore(): InventoryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const products = seedProducts()
      writeStore({ products })
      writeHistory(seedHistory(products))
      return { products }
    }
    return JSON.parse(raw) as InventoryStore
  } catch {
    const products = seedProducts()
    return { products }
  }
}

function writeStore(store: InventoryStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function readHistory(): StockMovement[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as StockMovement[]
  } catch {
    return []
  }
}

function writeHistory(movements: StockMovement[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(movements))
}

export function getStockLevel(product: InventoryProduct): StockLevel {
  if (product.qtyOnHand <= 0) return 'out'
  if (product.qtyOnHand <= product.reorderLevel) return 'low'
  return 'ok'
}

export function isLowStock(product: InventoryProduct): boolean {
  return getStockLevel(product) !== 'ok'
}

/** Sync helper for dashboard / other adapters — same mock store. */
export function countLowStockSync(): number {
  return readStore().products.filter((p) => p.isActive && isLowStock(p)).length
}

/** Catalog slice for billing POS — active products only. */
export function listCatalogSync(): Array<{
  id: string
  name: string
  kind: 'product'
  price: number
}> {
  return readStore()
    .products.filter((p) => p.isActive)
    .map((p) => ({
      id: p.id,
      name: p.name,
      kind: 'product' as const,
      price: p.unitPrice,
    }))
}

export const inventoryMockApi = {
  list: async (): Promise<InventoryProduct[]> => {
    await delay(120)
    return [...readStore().products].sort((a, b) => a.name.localeCompare(b.name))
  },

  getById: async (id: string): Promise<InventoryProduct> => {
    await delay(80)
    const product = readStore().products.find((p) => p.id === id)
    if (!product) throw new Error('Product not found')
    return product
  },

  create: async (payload: CreateProductPayload): Promise<InventoryProduct> => {
    await delay(180)
    const store = readStore()
    const skuTaken = store.products.some(
      (p) => p.sku.toLowerCase() === payload.sku.trim().toLowerCase(),
    )
    if (skuTaken) throw new Error('SKU already exists')

    const product: InventoryProduct = {
      id: `prod-${Date.now()}`,
      sku: payload.sku.trim().toUpperCase(),
      name: payload.name.trim(),
      category: payload.category,
      unit: payload.unit.trim() || 'pcs',
      unitPrice: payload.unitPrice,
      costPrice: payload.costPrice,
      qtyOnHand: Math.max(0, Math.floor(payload.qtyOnHand)),
      reorderLevel: Math.max(0, Math.floor(payload.reorderLevel)),
      isActive: true,
      updatedAt: new Date().toISOString(),
    }

    writeStore({ products: [product, ...store.products] })

    if (product.qtyOnHand > 0) {
      const history = readHistory()
      writeHistory([
        {
          id: `mov-${Date.now()}`,
          productId: product.id,
          type: 'in',
          qty: product.qtyOnHand,
          reason: 'Opening stock',
          balanceAfter: product.qtyOnHand,
          createdAt: product.updatedAt,
        },
        ...history,
      ])
    }

    return product
  },

  update: async (
    id: string,
    payload: UpdateProductPayload,
  ): Promise<InventoryProduct> => {
    await delay(160)
    const store = readStore()
    const index = store.products.findIndex((p) => p.id === id)
    if (index < 0) throw new Error('Product not found')

    if (payload.sku) {
      const skuTaken = store.products.some(
        (p) => p.id !== id && p.sku.toLowerCase() === payload.sku!.trim().toLowerCase(),
      )
      if (skuTaken) throw new Error('SKU already exists')
    }

    const current = store.products[index]
    if (!current) throw new Error('Product not found')

    const updated: InventoryProduct = {
      id: current.id,
      sku: payload.sku?.trim().toUpperCase() ?? current.sku,
      name: payload.name?.trim() ?? current.name,
      category: payload.category ?? current.category,
      unit: payload.unit?.trim() ?? current.unit,
      unitPrice: payload.unitPrice ?? current.unitPrice,
      costPrice: payload.costPrice ?? current.costPrice,
      qtyOnHand: current.qtyOnHand,
      reorderLevel:
        payload.reorderLevel !== undefined
          ? Math.max(0, Math.floor(payload.reorderLevel))
          : current.reorderLevel,
      isActive: payload.isActive ?? current.isActive,
      updatedAt: new Date().toISOString(),
    }

    const products = [...store.products]
    products[index] = updated
    writeStore({ products })
    return updated
  },

  adjust: async (id: string, payload: AdjustStockPayload): Promise<InventoryProduct> => {
    await delay(160)
    const qty = Math.floor(payload.qty)
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error('Quantity must be a positive number')
    }
    if (!payload.reason.trim()) {
      throw new Error('Reason is required')
    }

    const store = readStore()
    const index = store.products.findIndex((p) => p.id === id)
    if (index < 0) throw new Error('Product not found')

    const current = store.products[index]
    if (!current) throw new Error('Product not found')

    let nextQty = current.qtyOnHand

    if (payload.type === 'in') {
      nextQty = current.qtyOnHand + qty
    } else if (payload.type === 'out') {
      if (qty > current.qtyOnHand) {
        throw new Error('Not enough stock on hand')
      }
      nextQty = current.qtyOnHand - qty
    } else {
      // adjust = set absolute quantity
      nextQty = qty
    }

    const updated: InventoryProduct = {
      ...current,
      qtyOnHand: nextQty,
      updatedAt: new Date().toISOString(),
    }

    const products = [...store.products]
    products[index] = updated
    writeStore({ products })

    const movementQty =
      payload.type === 'adjust' ? Math.abs(nextQty - current.qtyOnHand) : qty

    const history = readHistory()
    writeHistory([
      {
        id: `mov-${Date.now()}`,
        productId: id,
        type: payload.type,
        qty: movementQty,
        reason: payload.reason.trim(),
        balanceAfter: nextQty,
        createdAt: updated.updatedAt,
      },
      ...history,
    ])

    return updated
  },

  history: async (productId: string): Promise<StockMovement[]> => {
    await delay(80)
    return readHistory()
      .filter((m) => m.productId === productId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  countLowStock: async (): Promise<number> => {
    await delay(40)
    return countLowStockSync()
  },
}
