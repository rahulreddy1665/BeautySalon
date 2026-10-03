import { useMemo, type CSSProperties, type ReactNode } from 'react'

import { useAppSelector } from '@/app/hooks/useRedux'
import { theme } from '@/app/theme'

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

export function useChartTheme() {
  const themeMode = useAppSelector((state) => state.settings.themeMode)

  return useMemo(() => {
    void themeMode
    const isDark = document.documentElement.classList.contains('dark')
    const fallback = isDark ? theme.dark : theme.light
    return {
      chart1: readCssVar('--chart-1', fallback.chart1),
      chart2: readCssVar('--chart-2', fallback.chart2),
      chart4: readCssVar('--chart-4', fallback.chart4),
      chart5: readCssVar('--chart-5', fallback.chart5),
      border: readCssVar('--border', fallback.border),
      muted: readCssVar('--muted', fallback.muted),
      mutedFg: readCssVar('--muted-foreground', fallback.mutedForeground),
      card: readCssVar('--card', fallback.card),
      foreground: readCssVar('--foreground', fallback.foreground),
      cursor: readCssVar('--chart-cursor', fallback.chartCursor),
      track: readCssVar('--chart-track', fallback.chartTrack),
    }
  }, [themeMode])
}

export const chartTooltipContentStyle = (
  colors: ReturnType<typeof useChartTheme>,
): CSSProperties => ({
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  fontSize: 12,
  color: colors.foreground,
  boxShadow: 'var(--shadow-popover)',
})

type TooltipEntry = {
  dataKey?: string | number
  name?: string
  value?: number | string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  formatter?: (value: number, name: string) => [string, string]
}): ReactNode {
  const colors = useChartTheme()
  if (!active || !payload?.length) return null

  return (
    <div
      className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-card-foreground shadow-popover"
      style={{ borderColor: colors.border, background: colors.card }}
    >
      {label != null ? (
        <p className="mb-1 font-medium" style={{ color: colors.foreground }}>
          {label}
        </p>
      ) : null}
      {payload.map((entry) => {
        const raw = Number(entry.value ?? 0)
        const name = String(entry.name ?? '')
        const [display, labelName] = formatter
          ? formatter(raw, name)
          : [String(raw), name]
        return (
          <p key={String(entry.dataKey)} style={{ color: colors.foreground }}>
            {labelName}: {display}
          </p>
        )
      })}
    </div>
  )
}
