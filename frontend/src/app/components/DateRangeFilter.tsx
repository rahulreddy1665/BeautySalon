import {
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { useMemo, useState } from 'react'

import { DatePicker } from '@/app/components/ui/date-picker'
import { Button } from '@/app/components/ui/button'
import { REPORTS } from '@/app/constants'
import { cn } from '@/app/utils'

export interface DateRange {
  from: Date
  to: Date
}

type PresetId = 'today' | 'yesterday' | '7d' | 'month' | 'lastMonth' | 'custom'

const PRESETS: { id: Exclude<PresetId, 'custom'>; label: string }[] = [
  { id: 'today', label: REPORTS.presets.today },
  { id: 'yesterday', label: REPORTS.presets.yesterday },
  { id: '7d', label: REPORTS.presets.sevenDays },
  { id: 'month', label: REPORTS.presets.thisMonth },
  { id: 'lastMonth', label: REPORTS.presets.lastMonth },
]

function rangeForPreset(id: Exclude<PresetId, 'custom'>, now = new Date()): DateRange {
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
  // This month: start of month → today
  return { from: startOfMonth(now), to: endOfDay(now) }
}

function detectPreset(value: DateRange, now = new Date()): PresetId {
  for (const item of PRESETS) {
    const p = rangeForPreset(item.id, now)
    if (isSameDay(p.from, value.from) && isSameDay(p.to, value.to)) {
      return item.id
    }
  }
  return 'custom'
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const detected = detectPreset(value)
  const [pickingCustom, setPickingCustom] = useState(false)
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.from)
  const [customTo, setCustomTo] = useState<Date | undefined>(value.to)

  const preset: PresetId = pickingCustom || detected === 'custom' ? 'custom' : detected

  const label = useMemo(
    () => `${format(value.from, 'dd MMM')} – ${format(value.to, 'dd MMM yyyy')}`,
    [value.from, value.to],
  )

  const applyPreset = (id: Exclude<PresetId, 'custom'>) => {
    setPickingCustom(false)
    onChange(rangeForPreset(id))
  }

  const openCustom = () => {
    setCustomFrom(value.from)
    setCustomTo(value.to)
    setPickingCustom(true)
  }

  const applyCustom = () => {
    if (!customFrom || !customTo) return
    setPickingCustom(false)
    onChange({ from: startOfDay(customFrom), to: endOfDay(customTo) })
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={preset === item.id ? 'default' : 'outline'}
            className="min-touch h-9"
            onClick={() => applyPreset(item.id)}
          >
            {item.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={preset === 'custom' ? 'default' : 'outline'}
          className="min-touch h-9"
          onClick={openCustom}
        >
          {REPORTS.presets.custom}
        </Button>
      </div>

      {preset === 'custom' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <DatePicker
            value={customFrom}
            onChange={setCustomFrom}
            placeholder={REPORTS.presets.from}
          />
          <DatePicker
            value={customTo}
            onChange={setCustomTo}
            placeholder={REPORTS.presets.to}
          />
          <Button type="button" className="min-touch" onClick={applyCustom}>
            {REPORTS.presets.apply}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{label}</p>
      )}
    </div>
  )
}

export function defaultTodayRange(): DateRange {
  return rangeForPreset('today')
}

export function defaultThisMonthRange(): DateRange {
  return rangeForPreset('month')
}
