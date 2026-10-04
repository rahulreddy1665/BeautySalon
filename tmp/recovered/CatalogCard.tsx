import { Plus } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import {
  CategorySuggestions,
  type SuggestableService,
} from '@/app/components/CategorySuggestions'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { BILLING } from '@/app/constants'
import { SegmentedControl } from '@/app/screens/billing/new-bill/segmented'
import { cn, formatINR } from '@/app/utils'

export type CatalogEntry = {
  id: string
  name: string
  price: number
  category?: string
  timesSold?: number
}

const PREVIEW_COUNT = 6

export function CatalogCard({
  serviceCatalog,
  productCatalog,
  popularServices,
  popularProducts,
  selectedServiceIds,
  onAddService,
  onAddProduct,
}: {
  serviceCatalog: SuggestableService[]
  productCatalog: CatalogEntry[]
  popularServices: CatalogEntry[]
  popularProducts: CatalogEntry[]
  selectedServiceIds: string[]
  onAddService: (id: string) => void
  onAddProduct: (id: string) => void
}) {
  const [tab, setTab] = useState<'service' | 'product'>('service')
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const catalog = tab === 'service' ? serviceCatalog : productCatalog
  const popular = tab === 'service' ? popularServices : popularProducts

  const mergedQuickAdd = useMemo(() => {
    const byId = new Map<string, CatalogEntry>()
    for (const item of popular) byId.set(item.id, item)
    for (const item of catalog) {
      if (!byId.has(item.id)) byId.set(item.id, item)
    }
    return [...byId.values()].sort(
      (a, b) => (b.timesSold ?? 0) - (a.timesSold ?? 0) || a.name.localeCompare(b.name),
    )
  }, [catalog, popular])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return mergedQuickAdd.filter((item) => {
      if (
        categoryFilter &&
        (item.category ?? '').trim().toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false
      }
      return !q || item.name.toLowerCase().includes(q)
    })
  }, [mergedQuickAdd, search, categoryFilter])

  const visible = showAll || search.trim() || categoryFilter
    ? filtered
    : filtered.slice(0, PREVIEW_COUNT)
  const canExpand = !search.trim() && !categoryFilter && filtered.length > PREVIEW_COUNT

  const categoryOrder = useMemo(() => {
    if (tab !== 'service' || selectedServiceIds.length === 0) return undefined
    const order: string[] = []
    for (let i = selectedServiceIds.length - 1; i >= 0; i -= 1) {
      const id = selectedServiceIds[i]
      const svc = serviceCatalog.find((s) => s.id === id)
      const cat = svc?.category?.trim()
      if (cat && !order.includes(cat)) order.push(cat)
    }
    return order
  }, [tab, selectedServiceIds, serviceCatalog])

  const pick = (id: string) => {
    if (tab === 'service') onAddService(id)
    else onAddProduct(id)
    setSearch('')
    setCategoryFilter(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base">{BILLING.new.addItemsCardTitle}</CardTitle>
        <SegmentedControl
          value={tab}
          onChange={(v) => {
            setTab(v)
            setSearch('')
            setShowAll(false)
            setCategoryFilter(null)
          }}
          options={[
            { value: 'service', label: BILLING.new.servicesTab },
            { value: 'product', label: BILLING.new.productsTab },
          ]}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          ref={searchRef}
          className="min-touch h-11 w-full"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (e.target.value.trim()) setCategoryFilter(null)
          }}
          placeholder={
            tab === 'service' ? BILLING.new.searchService : BILLING.new.searchProduct
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filtered[0]) {
              e.preventDefault()
              pick(filtered[0].id)
            }
            if (e.key === 'Escape') {
              setSearch('')
              setCategoryFilter(null)
            }
          }}
        />

        {tab === 'service' && selectedServiceIds.length > 0 ? (
          <CategorySuggestions
            selectedCatalogIds={selectedServiceIds}
            catalog={serviceCatalog}
            categoryOrder={categoryOrder}
            onPick={pick}
            onShowAll={(category) => {
              setCategoryFilter(category)
              setSearch('')
              setShowAll(true)
              searchRef.current?.focus()
            }}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left',
                'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              onClick={() => pick(item.id)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatINR(item.price)}
                </span>
              </span>
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-gold-soft text-gold-deep">
                <Plus className="size-4" strokeWidth={1.75} />
              </span>
            </button>
          ))}
        </div>

        {canExpand ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? BILLING.new.showLess : BILLING.new.showAll}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
