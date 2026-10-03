import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { Button } from '@/app/components/ui/button'
import { COMMON, ROUTES, SETTINGS } from '@/app/constants'
import {
  confirmLeaveIfDirty,
  useUnsavedChangesGuard,
} from '@/app/hooks/useUnsavedChangesGuard'
import { useAppSelector } from '@/app/hooks/useRedux'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { AppointmentSettingsSection } from '@/app/screens/settings/AppointmentSettingsSection'
import { BusinessSettingsSection } from '@/app/screens/settings/BusinessSettingsSection'
import { DesignationsSettingsSection } from '@/app/screens/settings/DesignationsSettingsSection'
import { InvoiceSettingsSection } from '@/app/screens/settings/InvoiceSettingsSection'
import { LoyaltySettingsSection } from '@/app/screens/settings/LoyaltySettingsSection'
import { TaxSettingsSection } from '@/app/screens/settings/TaxSettingsSection'
import {
  normalizeSettingsSection,
  SETTINGS_SECTIONS,
} from '@/app/screens/settings/settingsSections'

export function SettingsSectionScreen() {
  const { section: raw } = useParams<{ section: string }>()
  const sectionId = normalizeSettingsSection(raw)
  const user = useAppSelector((s) => s.auth.user)
  const isAdmin = user?.role === 'admin'
  const canRead = Boolean(
    isAdmin ||
      user?.permissions?.includes('settings:read') ||
      user?.permissions?.includes('settings:update'),
  )
  const canUpdate = Boolean(
    isAdmin || user?.permissions?.includes('settings:update'),
  )
  const settingsQuery = useSalonSettingsQuery({
    enabled: sectionId !== 'roles',
  })
  const [dirty, setDirty] = useState(false)
  useUnsavedChangesGuard(dirty)

  if (!sectionId) {
    return <Navigate to={ROUTES.settings} replace />
  }

  if (!canRead) {
    return <Navigate to={ROUTES.forbidden} replace />
  }

  const def = SETTINGS_SECTIONS.find((s) => s.id === sectionId)
  if (!def) {
    return <Navigate to={ROUTES.settings} replace />
  }
  if (def.adminOnly && !isAdmin) {
    return <Navigate to={ROUTES.forbidden} replace />
  }

  // Redirect legacy /settings/designations → /settings/roles in URL
  if (raw === 'designations') {
    return <Navigate to={ROUTES.settingsSection('roles')} replace />
  }

  if (sectionId !== 'roles' && settingsQuery.isLoading) {
    return (
      <div className="min-w-0 space-y-3">
        <SectionHeader title={def.label} dirty={dirty} />
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  if (
    sectionId !== 'roles' &&
    (settingsQuery.isError || !settingsQuery.data)
  ) {
    return (
      <ErrorState
        error={settingsQuery.error}
        title={COMMON.errors.loadFailed}
        onRetry={() => void settingsQuery.refetch()}
      />
    )
  }

  const data = settingsQuery.data

  return (
    <div className="min-w-0 space-y-3">
      <SectionHeader title={def.label} dirty={dirty} />

      {sectionId === 'business' && data ? (
        <BusinessSettingsSection
          initial={data.business}
          canUpdate={canUpdate}
          onDirtyChange={setDirty}
          hideTitle
        />
      ) : null}
      {sectionId === 'tax' && data ? (
        <TaxSettingsSection
          initial={data.tax}
          canUpdate={canUpdate}
          onDirtyChange={setDirty}
          hideTitle
        />
      ) : null}
      {sectionId === 'invoice' && data ? (
        <InvoiceSettingsSection
          initial={data.invoice}
          preview={data.invoicePreview}
          canUpdate={canUpdate}
          onDirtyChange={setDirty}
          hideTitle
        />
      ) : null}
      {sectionId === 'appointments' && data ? (
        <AppointmentSettingsSection
          initial={data.appointments}
          canUpdate={canUpdate}
          onDirtyChange={setDirty}
          hideTitle
        />
      ) : null}
      {sectionId === 'loyalty' && data ? (
        <LoyaltySettingsSection
          initial={data.loyalty}
          canUpdate={canUpdate}
          onDirtyChange={setDirty}
          hideTitle
        />
      ) : null}
      {sectionId === 'roles' ? (
        <DesignationsSettingsSection
          canUpdate={isAdmin}
          onDirtyChange={setDirty}
          hideTitle
        />
      ) : null}
    </div>
  )
}

function SectionHeader({ title, dirty }: { title: string; dirty: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        asChild
      >
        <Link
          to={ROUTES.settings}
          onClick={(e) => {
            if (!confirmLeaveIfDirty(dirty)) e.preventDefault()
          }}
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          {SETTINGS.backToSettings}
        </Link>
      </Button>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    </div>
  )
}
