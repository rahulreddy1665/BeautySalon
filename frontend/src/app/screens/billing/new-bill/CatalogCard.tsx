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
  kind?: 'service' | 'product' | 'combo'
  stockQty?: number | null
  trackStock?: boolean
  disabled?: boolean
  disabledLabel?: string
  stockLabel?: string
}

const PREVIEW_COUNT = 6

export function CatalogCard({
  serviceCatalog,
  productCatalog,
  comboCatalog = [],
  popularServices,
  popularProducts,
  selectedServiceIds,
  coveredServiceIds = [],
  onAddService,
  onAddProduct,
  onAddCombo,
}: {
  serviceCatalog: SuggestableService[]
  productCatalog: CatalogEntry[]
  comboCatalog?: CatalogEntry[]
  popularServices: CatalogEntry[]
  popularProducts: CatalogEntry[]
  selectedServiceIds: string[]
  /** Service ids already covered by an added combo — hide from suggestion chips. */
  coveredServiceIds?: string[]
  onAddService: (id: string) => void
  onAddProduct: (id: string) => void
  onAddCombo?: (id: string) => void
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
    const defaultKind = tab === 'service' ? 'service' : 'product'
    for (const item of popular) {
      byId.set(item.id, { ...item, kind: item.kind ?? defaultKind })
    }
    // Catalog wins for stock/disabled flags (popular ranking alone must not re-enable OOS items).
    for (const item of catalog) {
      const prev = byId.get(item.id)
      const entry: CatalogEntry = {
        id: item.id,
        name: item.name,
        price: item.price,
        category: 'category' in item ? item.category : prev?.category,
        timesSold:
          ('timesSold' in item ? item.timesSold : undefined) ?? prev?.timesSold,
        kind: ('kind' in item && item.kind) || prev?.kind || defaultKind,
        trackStock: 'trackStock' in item ? item.trackStock : prev?.trackStock,
        stockQty: 'stockQty' in item ? item.stockQty : prev?.stockQty,
        disabled: 'disabled' in item ? item.disabled : prev?.disabled,
        disabledLabel:
          'disabledLabel' in item ? item.disabledLabel : prev?.disabledLabel,
        stockLabel: 'stockLabel' in item ? item.stockLabel : prev?.stockLabel,
      }
      byId.set(item.id, entry)
    }
    if (tab === 'service') {
      for (const item of comboCatalog) {
        byId.set(item.id, { ...item, kind: 'combo' })
      }
    }
    return [...byId.values()].sort(
      (a, b) => (b.timesSold ?? 0) - (a.timesSold ?? 0) || a.name.localeCompare(b.name),
    )
  }, [catalog, popular, comboCatalog, tab])

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

  const pick = (id: string, kind?: CatalogEntry['kind']) => {
    const item = mergedQuickAdd.find((entry) => entry.id === id)
    if (item?.disabled) return
    if (tab === 'service') {
      if (kind === 'combo') onAddCombo?.(id)
      else onAddService(id)
    } else onAddProduct(id)
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
            if (e.key === 'Enter') {
              const first = filtered.find((item) => !item.disabled)
              if (!first) return
              e.preventDefault()
              pick(first.id, first.kind)
            }
            if (e.key === 'Escape') {
              setSearch('')
              setCategoryFilter(null)
            }
          }}
        />

        {tab === 'service' && selectedServiceIds.length > 0 ? (
          <CategorySuggestions
            selectedCatalogIds={[...selectedServiceIds, ...coveredServiceIds]}
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
              key={`${item.kind ?? 'item'}-${item.id}`}
              type="button"
              disabled={Boolean(item.disabled)}
              className={cn(
                'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left',
                'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                item.disabled && 'cursor-not-allowed opacity-50 hover:bg-card',
              )}
              onClick={() => pick(item.id, item.kind)}
            >
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  {item.kind === 'combo' ? (
                    <span className="shrink-0 rounded border border-gold-deep/30 bg-gold-soft px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold-deep">
                      {BILLING.new.badgeCombo}
                    </span>
                  ) : null}
                  <span className="block truncate text-sm font-medium">{item.name}</span>
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {item.disabled && item.disabledLabel
                    ? item.disabledLabel
                    : item.stockLabel
                      ? `${formatINR(item.price)} · ${item.stockLabel}`
                      : formatINR(item.price)}
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
