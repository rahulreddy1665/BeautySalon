import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns'
import { useMemo, useState } from 'react'

import { DatePicker } from '@/app/components/ui/date-picker'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/utils'

export interface DateRange {
  from: Date
  to: Date
}

type PresetId = 'today' | 'yesterday' | '7d' | 'month' | 'custom'

const PRESETS: { id: Exclude<PresetId, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: '7 days' },
  { id: 'month', label: 'This month' },
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
  return { from: startOfMonth(now), to: endOfMonth(now) }
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [preset, setPreset] = useState<PresetId>('today')
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.from)
  const [customTo, setCustomTo] = useState<Date | undefined>(value.to)

  const label = useMemo(
    () => `${format(value.from, 'dd MMM')} – ${format(value.to, 'dd MMM yyyy')}`,
    [value.from, value.to],
  )

  const applyPreset = (id: Exclude<PresetId, 'custom'>) => {
    setPreset(id)
    onChange(rangeForPreset(id))
  }

  const applyCustom = () => {
    if (!customFrom || !customTo) return
    setPreset('custom')
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
          onClick={() => setPreset('custom')}
        >
          Custom
        </Button>
      </div>

      {preset === 'custom' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <DatePicker value={customFrom} onChange={setCustomFrom} placeholder="From" />
          <DatePicker value={customTo} onChange={setCustomTo} placeholder="To" />
          <Button type="button" className="min-touch" onClick={applyCustom}>
            Apply
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
