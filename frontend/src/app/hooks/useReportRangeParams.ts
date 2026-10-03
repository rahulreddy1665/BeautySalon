import {
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { DateRange } from '@/app/components/DateRangeFilter'

function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function parseDateKey(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = parseISO(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function defaultThisMonthRange(now = new Date()): DateRange {
  return { from: startOfMonth(now), to: endOfDay(now) }
}

export function rangeForReportPreset(
  id: 'today' | 'yesterday' | '7d' | 'month' | 'lastMonth',
  now = new Date(),
): DateRange {
  if (id === 'today') {
    return { from: startOfDay(now), to: endOfDay(now) }
  }
  if (id === 'yesterday') {
    const day = subDays(now, 1)
    return { from: startOfDay(day), to: endOfDay(day) }
  }
  if (id === '7d') {
    return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) }
  }
  if (id === 'lastMonth') {
    const prev = subMonths(now, 1)
    return { from: startOfMonth(prev), to: endOfMonth(prev) }
  }
  return defaultThisMonthRange(now)
}

/**
 * URL-synced report date range (`from` / `to` as YYYY-MM-DD).
 * Defaults to this month (month start → today).
 */
export function useReportRangeParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const range = useMemo((): DateRange => {
    const from = parseDateKey(searchParams.get('from'))
    const to = parseDateKey(searchParams.get('to'))
    if (from && to && from <= to) {
      return { from: startOfDay(from), to: endOfDay(to) }
    }
    return defaultThisMonthRange()
  }, [searchParams])

  const fromKey = toDateKey(range.from)
  const toKey = toDateKey(range.to)

  const setRange = useCallback(
    (next: DateRange) => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('from', toDateKey(next.from))
      nextParams.set('to', toDateKey(next.to))
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  /** Detect which preset matches the current value (if any). */
  const matchedPreset = useMemo(() => {
    const now = new Date()
    const presets = ['today', 'yesterday', '7d', 'month', 'lastMonth'] as const
    for (const id of presets) {
      const p = rangeForReportPreset(id, now)
      if (isSameDay(p.from, range.from) && isSameDay(p.to, range.to)) {
        return id
      }
    }
    return 'custom' as const
  }, [range.from, range.to])

  return {
    range,
    from: fromKey,
    to: toKey,
    setRange,
    matchedPreset,
  }
}
