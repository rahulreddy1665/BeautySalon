import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { logoDataUrl } from '@/app/service/settings/settingsApi'
import { cn } from '@/app/utils'
import logoFallback from '@/app/assets/logo.svg'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  collapsed?: boolean
  className?: string
}

const sizeMap = {
  sm: 'size-7',
  md: 'size-8',
  lg: 'size-10',
} as const

/**
 * Salon logo + name from settings (cached). Falls back to local SVG + BeautySalon.
 */
export function Logo({
  size = 'md',
  showText = true,
  collapsed = false,
  className,
}: LogoProps) {
  const settingsQuery = useSalonSettingsQuery()
  const business = settingsQuery.data?.business
  const name = business?.salonName?.trim() || 'BeautySalon'
  const remote = logoDataUrl(business)
  const showLabel = showText && !collapsed

  return (
    <div className={cn('flex min-w-0 items-center gap-2 text-foreground', className)}>
      <span className={cn('relative shrink-0 text-primary', sizeMap[size])}>
        <img
          src={remote || logoFallback}
          alt=""
          className="size-full object-contain"
          onError={(e) => {
            e.currentTarget.src = logoFallback
          }}
        />
      </span>
      {showLabel ? (
        <span className="truncate text-sm font-semibold tracking-tight">
          {name}
        </span>
      ) : (
        <span className="sr-only">{name}</span>
      )}
    </div>
  )
}
