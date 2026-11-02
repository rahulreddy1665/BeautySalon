import { Plus } from 'lucide-react'
import { useMemo } from 'react'

import { BILLING } from '@/app/constants'
import { cn, formatINR } from '@/app/utils'

export type SuggestableService = {
  id: string
  name: string
  price: number
  category: string
}

type CategoryGroup = {
  category: string
  services: SuggestableService[]
  hasMore: boolean
}

const MAX_CATEGORY_ROWS = 3
const MAX_CHIPS_PER_CATEGORY = 8

/**
 * Build "More from <Category>" groups from cart order (most recently added category first).
 * Candidates ordered by name — services API has no billed-frequency field.
 */
export function buildCategorySuggestionGroups(
  selectedCatalogIds: string[],
  catalog: SuggestableService[],
  /** Category order preference: most recent first. Falls back to selection order. */
  categoryOrder?: string[],
): CategoryGroup[] {
  const selected = new Set(selectedCatalogIds.filter(Boolean))
  const order: string[] = []
  if (categoryOrder?.length) {
    for (const c of categoryOrder) {
      const key = c.trim()
      if (key && !order.includes(key)) order.push(key)
    }
  } else {
    for (const id of [...selectedCatalogIds].reverse()) {
      const svc = catalog.find((s) => s.id === id)
      const key = svc?.category?.trim()
      if (key && !order.includes(key)) order.push(key)
    }
  }

  const groups: CategoryGroup[] = []
  for (const category of order) {
    if (groups.length >= MAX_CATEGORY_ROWS) break
    const candidates = catalog
      .filter(
        (s) =>
          s.category.trim().toLowerCase() === category.toLowerCase() &&
          !selected.has(s.id),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
    if (candidates.length === 0) continue
    groups.push({
      category,
      services: candidates.slice(0, MAX_CHIPS_PER_CATEGORY),
      hasMore: candidates.length > MAX_CHIPS_PER_CATEGORY,
    })
  }
  return groups
}

interface CategorySuggestionsProps {
  selectedCatalogIds: string[]
  catalog: SuggestableService[]
  categoryOrder?: string[]
  onPick: (serviceId: string) => void
  onShowAll?: (category: string) => void
  className?: string
}

export function CategorySuggestions({
  selectedCatalogIds,
  catalog,
  categoryOrder,
  onPick,
  onShowAll,
  className,
}: CategorySuggestionsProps) {
  const groups = useMemo(
    () =>
      buildCategorySuggestionGroups(selectedCatalogIds, catalog, categoryOrder),
    [selectedCatalogIds, catalog, categoryOrder],
  )

  if (groups.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      {groups.map((group) => (
        <div key={group.category} className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            {BILLING.new.moreFromCategory.replace('{category}', group.category)}
          </p>
          <div
            className={cn(
              'flex gap-1.5',
              'max-md:overflow-x-auto max-md:pb-1 max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden',
              'md:flex-wrap',
            )}
          >
            {group.services.map((svc) => (
              <button
                key={svc.id}
                type="button"
                onClick={() => onPick(svc.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs text-foreground',
                  'h-11 md:h-8',
                  'hover:border-gold-deep/40 hover:bg-gold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <Plus className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="max-w-[12rem] truncate md:max-w-[14rem]">{svc.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatINR(svc.price)}
                </span>
              </button>
            ))}
            {group.hasMore && onShowAll ? (
              <button
                type="button"
                onClick={() => onShowAll(group.category)}
                className={cn(
                  'inline-flex shrink-0 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground',
                  'h-11 md:h-8',
                  'hover:border-gold-deep/40 hover:bg-gold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                {BILLING.new.showAllInCategory}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
