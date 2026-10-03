/** Flat semicircle gauge — gold arc on neutral track. */

interface Props {
  percent: number
  label: string
  detail: string
}

export function ProgressGauge({ percent, label, detail }: Props) {
  const p = Math.max(0, Math.min(100, percent))
  const r = 54
  const cx = 70
  const cy = 70
  const start = Math.PI
  const end = Math.PI - (Math.PI * p) / 100
  const polar = (ang: number) => ({
    x: cx + r * Math.cos(ang),
    y: cy - r * Math.sin(ang),
  })
  const s = polar(start)
  const e = polar(end)
  const large = p > 50 ? 1 : 0
  const arc =
    p <= 0
      ? ''
      : `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 86" className="h-28 w-full max-w-[200px]">
        <path
          d={`M ${polar(Math.PI).x} ${polar(Math.PI).y} A ${r} ${r} 0 0 1 ${polar(0).x} ${polar(0).y}`}
          fill="none"
          stroke="var(--chart-track)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {arc ? (
          <path
            d={arc}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="12"
            strokeLinecap="round"
          />
        ) : null}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-foreground text-2xl font-semibold"
          style={{ fontSize: 22 }}
        >
          {p}%
        </text>
      </svg>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}
