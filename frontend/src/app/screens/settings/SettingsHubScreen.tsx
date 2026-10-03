import { Link, Navigate } from 'react-router-dom'

import { PageHeader } from '@/app/components/PageHeader'
import { ROUTES, SETTINGS } from '@/app/constants'
import { useAppSelector } from '@/app/hooks/useRedux'
import { SETTINGS_SECTIONS } from '@/app/screens/settings/settingsSections'
import { cn } from '@/app/utils'

export function SettingsHubScreen() {
  const user = useAppSelector((s) => s.auth.user)
  const isAdmin = user?.role === 'admin'
  const canRead = Boolean(
    isAdmin ||
      user?.permissions?.includes('settings:read') ||
      user?.permissions?.includes('settings:update'),
  )

  if (!canRead) {
    return <Navigate to={ROUTES.forbidden} replace />
  }

  const visible = SETTINGS_SECTIONS.filter((s) => !s.adminOnly || isAdmin)

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader description={SETTINGS.description} />

      <div className="mx-auto grid w-full max-w-[960px] grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-3">
        {visible.map((section) => (
          <Link
            key={section.id}
            to={ROUTES.settingsSection(section.id)}
            className={cn(
              'group flex min-h-40 flex-col rounded-md border border-border bg-card p-4 outline-none transition-colors',
              'hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            <div className="mb-3 flex size-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <section.icon className="size-7" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold tracking-tight">
              {section.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
