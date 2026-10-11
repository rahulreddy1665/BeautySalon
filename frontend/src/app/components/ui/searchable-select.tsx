import { CheckIcon, ChevronDownIcon, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover'
import { cn } from '@/app/utils'

export interface SearchableOption {
  value: string
  label: string
  /** Section heading; options keep their input order within a group. */
  group?: string
  /** Secondary text shown on the right (e.g. price). Also searchable. */
  hint?: string
}

interface SearchableSelectProps {
  value?: string
  onValueChange: (value: string) => void
  options: SearchableOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  'aria-invalid'?: boolean
}

/**
 * Select with a search box, for long lists (e.g. 150+ services).
 * Filtering is in-memory and instant: no debounce needed for a local list.
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  className,
  disabled,
  'aria-invalid': ariaInvalid,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) =>
      [o.label, o.group ?? '', o.hint ?? ''].join(' ').toLowerCase().includes(q),
    )
  }, [options, query])

  // Keep the highlighted option scrolled into view during keyboard navigation.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const choose = (option: SearchableOption | undefined) => {
    if (!option) return
    onValueChange(option.value)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setActiveIndex(0)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={ariaInvalid}
          className={cn(
            'flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-left text-sm whitespace-nowrap outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive lg:h-10',
            className,
          )}
        >
          <span className={cn('min-w-0 truncate', !selected && 'text-muted-foreground')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        onOpenAutoFocus={(e) => {
          // Focus the search box, not the first option.
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).querySelector('input')?.focus()
        }}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              // New result set: highlight the first match.
              setActiveIndex(0)
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-controls={listId}
            aria-activedescendant={
              filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined
            }
            className="h-11 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground lg:h-10 lg:text-sm"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex((i) => Math.min(filtered.length - 1, i + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex((i) => Math.max(0, i - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                choose(filtered[activeIndex])
              }
            }}
          />
        </div>
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="max-h-72 overflow-y-auto overscroll-contain p-1"
        >
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </p>
          ) : (
            filtered.map((option, index) => {
              const showGroup =
                option.group && option.group !== filtered[index - 1]?.group
              const isSelected = option.value === value
              return (
                <div key={option.value}>
                  {showGroup ? (
                    <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                      {option.group}
                    </p>
                  ) : null}
                  <div
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-sm py-2 pr-2 pl-2 text-sm select-none',
                      index === activeIndex && 'bg-accent text-accent-foreground',
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(option)}
                  >
                    <CheckIcon
                      className={cn('size-4 shrink-0', !isSelected && 'invisible')}
                    />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {option.hint}
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
