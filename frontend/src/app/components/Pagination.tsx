import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/app/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { COMMON } from '@/app/constants'
import { cn } from '@/app/utils'

/** Backend list endpoints cap `limit` at 100. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20

type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

/** First, last, current ± siblings; gaps collapse to an ellipsis. */
function getPageItems(page: number, totalPages: number, siblings = 1): PageItem[] {
  // first + last + current + 2*siblings + 2 ellipses
  const maxSlots = 2 * siblings + 5
  if (totalPages <= maxSlots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const start = Math.max(2, page - siblings)
  const end = Math.min(totalPages - 1, page + siblings)
  const items: PageItem[] = [1]
  if (start > 2) items.push('ellipsis-start')
  for (let p = start; p <= end; p += 1) items.push(p)
  if (end < totalPages - 1) items.push('ellipsis-end')
  items.push(totalPages)
  return items
}

interface PaginationProps {
  /** 1-based current page. */
  page: number
  totalPages: number
  /** Total row count across all pages. */
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  /** Callers should reset to page 1 when this fires. */
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: readonly number[]
  className?: string
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}: PaginationProps) {
  if (total <= 0) return null

  const safeTotalPages = Math.max(1, totalPages)
  const current = Math.min(Math.max(1, page), safeTotalPages)
  const from = (current - 1) * pageSize + 1
  const to = Math.min(total, current * pageSize)
  const items = getPageItems(current, safeTotalPages)

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="tabular-nums">
          {COMMON.pagination.showing
            .replace('{from}', String(from))
            .replace('{to}', String(to))
            .replace('{total}', String(total))}
        </span>
        <div className="flex items-center gap-2">
          <span>{COMMON.pagination.rowsPerPage}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger
              size="sm"
              className="w-[4.5rem] tabular-nums"
              aria-label={COMMON.pagination.rowsPerPage}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {safeTotalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="size-8 p-0"
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
            aria-label={COMMON.actions.previous}
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
          </Button>
          {items.map((item) =>
            typeof item === 'number' ? (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={item === current ? 'default' : 'outline'}
                className="h-8 min-w-8 px-2 tabular-nums"
                aria-current={item === current ? 'page' : undefined}
                aria-label={`Page ${item}`}
                onClick={() => item !== current && onPageChange(item)}
              >
                {item}
              </Button>
            ) : (
              <span key={item} className="px-1 select-none" aria-hidden>
                …
              </span>
            ),
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="size-8 p-0"
            disabled={current >= safeTotalPages}
            onClick={() => onPageChange(current + 1)}
            aria-label={COMMON.actions.next}
          >
            <ChevronRight className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      ) : null}
    </nav>
  )
}
