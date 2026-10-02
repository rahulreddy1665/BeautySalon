import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FileText,
  Gift,
  Percent,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { Button } from '@/app/components/ui/button'
import { useAppSelector } from '@/app/hooks/useRedux'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { BusinessSettingsSection } from '@/app/screens/settings/BusinessSettingsSection'
import { TaxSettingsSection } from '@/app/screens/settings/TaxSettingsSection'
import { InvoiceSettingsSection } from '@/app/screens/settings/InvoiceSettingsSection'
import { AppointmentSettingsSection } from '@/app/screens/settings/AppointmentSettingsSection'
import { LoyaltySettingsSection } from '@/app/screens/settings/LoyaltySettingsSection'
import { cn } from '@/app/utils'

type SectionId =
  | 'business'
  | 'tax'
  | 'invoice'
  | 'appointments'
  | 'loyalty'

const SECTIONS: Array<{
  id: SectionId
  label: string
  description: string
  icon: LucideIcon
  permission?: string
}> = [
  {
    id: 'business',
    label: 'Business profile',
    description: 'Name, logo, address, GSTIN',
    icon: Building2,
  },
  {
    id: 'tax',
    label: 'Tax (CGST / SGST)',
    description: 'GST rates for services and products',
    icon: Percent,
  },
  {
    id: 'invoice',
    label: 'Invoices',
    description: 'Numbering, rounding, print template',
    icon: FileText,
  },
  {
    id: 'appointments',
    label: 'Appointments',
    description: 'Day calendar hours and slot size',
    icon: CalendarDays,
  },
  {
    id: 'loyalty',
    label: 'Loyalty',
    description: 'Earn and redeem rules',
    icon: Gift,
  },
]

function hasPermission(
  permissions: string[] | undefined,
  needed?: string,
): boolean {
  if (!needed) return true
  if (!permissions?.length) return false
  return permissions.includes(needed) || permissions.includes('settings:read')
}

export function SettingsScreen() {
  const { section } = useParams<{ section?: string }>()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const settingsQuery = useSalonSettingsQuery()

  const visible = SECTIONS.filter(() =>
    hasPermission(user?.permissions, 'settings:read'),
  )

  const activeId = (section as SectionId | undefined) ?? undefined
  const active = visible.find((s) => s.id === activeId)

  if (settingsQuery.isLoading) {
    return (
      <div className="min-w-0 space-y-3">
        <PageHeader description="Salon configuration" />
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <ErrorState
        error={settingsQuery.error}
        title="Could not load settings"
        onRetry={() => void settingsQuery.refetch()}
      />
    )
  }

  const data = settingsQuery.data
  const canUpdate = Boolean(user?.permissions?.includes('settings:update'))

  // Mobile: list when no section; detail when section selected
  // Desktop: always show list + detail
  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="Each section saves on its own. Changes apply to future bills."
        actions={
          activeId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 lg:hidden"
              onClick={() => navigate('/settings')}
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} />
              Back
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
        <nav
          className={cn(
            'space-y-1',
            activeId ? 'hidden lg:block' : 'block',
          )}
        >
          {visible.map((item) => (
            <Link
              key={item.id}
              to={`/settings/${item.id}`}
              className={cn(
                'flex items-start gap-2 rounded-md border border-transparent px-3 py-2.5 text-sm transition-colors',
                activeId === item.id
                  ? 'border-border bg-muted font-medium'
                  : 'hover:bg-muted/60',
              )}
            >
              <item.icon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                strokeWidth={1.75}
              />
              <span className="min-w-0">
                <span className="block">{item.label}</span>
                <span className="block text-[11px] font-normal text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          ))}
        </nav>

        <div className={cn(!activeId && 'hidden lg:block')}>
          {!activeId ? (
            <p className="hidden text-sm text-muted-foreground lg:block">
              Select a section to edit.
            </p>
          ) : null}
          {activeId === 'business' && active ? (
            <BusinessSettingsSection
              initial={data.business}
              canUpdate={canUpdate}
            />
          ) : null}
          {activeId === 'tax' && active ? (
            <TaxSettingsSection initial={data.tax} canUpdate={canUpdate} />
          ) : null}
          {activeId === 'invoice' && active ? (
            <InvoiceSettingsSection
              initial={data.invoice}
              preview={data.invoicePreview}
              canUpdate={canUpdate}
            />
          ) : null}
          {activeId === 'appointments' && active ? (
            <AppointmentSettingsSection
              initial={data.appointments}
              canUpdate={canUpdate}
            />
          ) : null}
          {activeId === 'loyalty' && active ? (
            <LoyaltySettingsSection
              initial={data.loyalty}
              canUpdate={canUpdate}
            />
          ) : null}
          {activeId && !active ? <Navigate to="/settings" replace /> : null}
        </div>
      </div>
    </div>
  )
}
