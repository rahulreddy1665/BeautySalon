import { Building2, CalendarDays, FileText, Gift, Percent, UserCog } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { SETTINGS } from '@/app/constants'

export type SettingsSectionId =
  'business' | 'tax' | 'invoice' | 'appointments' | 'loyalty' | 'roles'

export interface SettingsSectionDef {
  id: SettingsSectionId
  label: string
  description: string
  icon: LucideIcon
  /** Admin-only sections */
  adminOnly?: boolean
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  {
    id: 'business',
    label: SETTINGS.sections.business,
    description: SETTINGS.sectionDescriptions.business,
    icon: Building2,
  },
  {
    id: 'tax',
    label: SETTINGS.sections.tax,
    description: SETTINGS.sectionDescriptions.tax,
    icon: Percent,
  },
  {
    id: 'invoice',
    label: SETTINGS.sections.invoice,
    description: SETTINGS.sectionDescriptions.invoice,
    icon: FileText,
  },
  {
    id: 'appointments',
    label: SETTINGS.sections.appointments,
    description: SETTINGS.sectionDescriptions.appointments,
    icon: CalendarDays,
  },
  {
    id: 'loyalty',
    label: SETTINGS.sections.loyalty,
    description: SETTINGS.sectionDescriptions.loyalty,
    icon: Gift,
  },
  {
    id: 'roles',
    label: SETTINGS.sections.roles,
    description: SETTINGS.sectionDescriptions.roles,
    icon: UserCog,
    adminOnly: true,
  },
]

export function normalizeSettingsSection(raw?: string): SettingsSectionId | null {
  if (!raw) return null
  if (raw === 'designations') return 'roles'
  if (SETTINGS_SECTIONS.some((s) => s.id === raw)) {
    return raw as SettingsSectionId
  }
  return null
}
