import { cn } from '@/app/utils'

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  expandBelowLg = false,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  className?: string
  /** Equal-width buttons that fill the row below lg. lg+ stays the compact control. */
  expandBelowLg?: boolean
}) {
  return (
    <div
      className={cn(
        'inline-flex h-9 overflow-hidden rounded-md border border-input bg-background p-0.5',
        expandBelowLg && 'max-lg:flex max-lg:h-11 max-lg:w-full max-lg:p-1',
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cn(
            'rounded-sm px-2.5 text-xs font-medium transition-colors',
            expandBelowLg && 'max-lg:flex-1 max-lg:px-3 max-lg:text-sm',
            value === opt.value
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
