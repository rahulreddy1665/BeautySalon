import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { FormField } from '@/app/components/FormField'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { SETTINGS } from '@/app/constants'
import {
  invoiceSettingsSchema,
  type InvoiceSettingsFormValues,
} from '@/app/helpers/settingsValidation'
import { usePatchInvoiceSettingsMutation } from '@/app/hooks/queries/useSettingsQuery'
import type {
  InvoiceAccentPreset,
  InvoiceSettings,
  InvoiceTemplateId,
} from '@/app/service/settings/settingsApi'
import { InvoiceTemplatePreview } from '@/app/screens/settings/InvoiceTemplatePreview'
import { SettingsSaveBar } from '@/app/screens/settings/SettingsSaveBar'
import {
  ACCENT_PRESET_OPTIONS,
  TEMPLATE_OPTIONS,
  isValidHexColor,
  resolveAccent,
} from '@/app/theme/invoice-themes'

const DEFAULT_ACCENT = resolveAccent('gold')
import { formatINR } from '@/app/utils'

interface Props {
  initial: InvoiceSettings
  preview?: { nextNumber: number; preview: string }
  canUpdate: boolean
  onDirtyChange?: (dirty: boolean) => void
  hideTitle?: boolean
}

function livePreview(
  values: InvoiceSettingsFormValues,
  nextNumber: number,
): string {
  const pad = String(nextNumber).padStart(values.numberPadding || 5, '0')
  const prefix = (values.prefix || 'INV').toUpperCase()
  return values.includeYear
    ? `${prefix}-${new Date().getFullYear()}-${pad}`
    : `${prefix}-${pad}`
}

function fillWhatsAppExample(template: string): string {
  return template
    .replaceAll('{customer}', 'Ananya')
    .replaceAll('{salon}', 'Glow Studio')
    .replaceAll('{amount}', formatINR(1139.82))
    .replaceAll('{link}', 'https://example.com/i/sample')
}

export function InvoiceSettingsSection({
  initial,
  preview,
  canUpdate,
  onDirtyChange,
  hideTitle,
}: Props) {
  const patch = usePatchInvoiceSettingsMutation()
  const form = useForm<InvoiceSettingsFormValues>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues: {
      ...initial,
      templateId:
        initial.templateId === 'classic' ? 'creamGold' : initial.templateId,
      accentPreset: initial.accentPreset ?? 'gold',
      accentColor: initial.accentColor ?? DEFAULT_ACCENT,
      showStaffNames: initial.showStaffNames !== false,
      showLogo: initial.showLogo !== false,
      termsText: initial.termsText ?? SETTINGS.invoice.termsDefault,
      thankYouText: initial.thankYouText ?? SETTINGS.invoice.thankYouDefault,
      whatsappMessage:
        initial.whatsappMessage ?? SETTINGS.invoice.whatsappDefault,
      shareLinkDays: initial.shareLinkDays ?? 30,
      nextNumber: preview?.nextNumber,
    },
  })

  useEffect(() => {
    form.reset({
      ...initial,
      templateId:
        initial.templateId === 'classic' ? 'creamGold' : initial.templateId,
      accentPreset: initial.accentPreset ?? 'gold',
      accentColor: initial.accentColor ?? DEFAULT_ACCENT,
      showStaffNames: initial.showStaffNames !== false,
      showLogo: initial.showLogo !== false,
      termsText: initial.termsText ?? SETTINGS.invoice.termsDefault,
      thankYouText: initial.thankYouText ?? SETTINGS.invoice.thankYouDefault,
      whatsappMessage:
        initial.whatsappMessage ?? SETTINGS.invoice.whatsappDefault,
      shareLinkDays: initial.shareLinkDays ?? 30,
      nextNumber: preview?.nextNumber,
    })
  }, [initial, preview, form])

  const values = form.watch()
  const dirty = form.formState.isDirty
  const shown = useMemo(
    () => livePreview(values, values.nextNumber || preview?.nextNumber || 1),
    [values, preview?.nextNumber],
  )
  const waExample = fillWhatsAppExample(values.whatsappMessage || '')

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  const onSubmit = form.handleSubmit(async (vals) => {
    await patch.mutateAsync(vals)
    form.reset(vals)
  })

  return (
    <Card>
      {hideTitle ? null : (
        <CardHeader className="pb-2">
          <CardTitle>{SETTINGS.sections.invoice}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label={SETTINGS.invoice.prefix}
              htmlFor="prefix"
              error={form.formState.errors.prefix?.message}
            >
              <Input
                id="prefix"
                disabled={!canUpdate}
                {...form.register('prefix')}
              />
            </FormField>
            <FormField label={SETTINGS.invoice.padding} htmlFor="pad">
              <Input
                id="pad"
                type="number"
                min={1}
                max={10}
                disabled={!canUpdate}
                {...form.register('numberPadding', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label={SETTINGS.invoice.nextNumber} htmlFor="next">
              <Input
                id="next"
                type="number"
                min={preview?.nextNumber ?? 1}
                disabled={!canUpdate}
                {...form.register('nextNumber', { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              disabled={!canUpdate}
              checked={values.includeYear}
              onChange={(e) =>
                form.setValue('includeYear', e.target.checked, {
                  shouldDirty: true,
                })
              }
            />
            {SETTINGS.invoice.includeYear}
          </label>

          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm tabular-nums">
            {shown}
          </p>

          <FormField label={SETTINGS.invoice.rounding}>
            <Select
              value={values.rounding}
              onValueChange={(v) =>
                form.setValue(
                  'rounding',
                  v as InvoiceSettingsFormValues['rounding'],
                  { shouldDirty: true },
                )
              }
              disabled={!canUpdate}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="nearest">Nearest ₹1</SelectItem>
                <SelectItem value="up">Round up to ₹1</SelectItem>
                <SelectItem value="down">Round down to ₹1</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <div className="space-y-2">
            <p className="text-sm font-medium">{SETTINGS.invoice.template}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {TEMPLATE_OPTIONS.map((t) => (
                <InvoiceTemplatePreview
                  key={t.id}
                  templateId={t.id}
                  accentPreset={values.accentPreset as InvoiceAccentPreset}
                  accentColor={values.accentColor}
                  selected={values.templateId === t.id}
                  label={SETTINGS.invoice.templates[t.labelKey]}
                  onSelect={() => {
                    if (!canUpdate) return
                    form.setValue('templateId', t.id as InvoiceTemplateId, {
                      shouldDirty: true,
                    })
                  }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={SETTINGS.invoice.accentPreset}>
              <Select
                value={values.accentPreset}
                onValueChange={(v) => {
                  const preset = v as InvoiceAccentPreset
                  form.setValue('accentPreset', preset, { shouldDirty: true })
                  const found = ACCENT_PRESET_OPTIONS.find((p) => p.id === preset)
                  if (found) {
                    form.setValue('accentColor', found.hex, { shouldDirty: true })
                  }
                }}
                disabled={!canUpdate}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCENT_PRESET_OPTIONS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {SETTINGS.invoice.accents[p.id]}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">
                    {SETTINGS.invoice.accents.custom}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label={SETTINGS.invoice.customAccent}
              error={
                values.accentPreset === 'custom' &&
                !isValidHexColor(values.accentColor)
                  ? 'Use #RRGGBB'
                  : undefined
              }
            >
              <div className="flex gap-2">
                <Input
                  type="color"
                  className="h-11 w-14 p-1 lg:h-10"
                  disabled={!canUpdate}
                  value={
                    isValidHexColor(values.accentColor)
                      ? values.accentColor
                      : DEFAULT_ACCENT
                  }
                  onChange={(e) => {
                    form.setValue('accentPreset', 'custom', { shouldDirty: true })
                    form.setValue('accentColor', e.target.value.toUpperCase(), {
                      shouldDirty: true,
                    })
                  }}
                />
                <Input
                  disabled={!canUpdate}
                  value={values.accentColor}
                  onChange={(e) => {
                    form.setValue('accentPreset', 'custom', { shouldDirty: true })
                    form.setValue('accentColor', e.target.value.toUpperCase(), {
                      shouldDirty: true,
                    })
                  }}
                />
              </div>
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              disabled={!canUpdate}
              checked={values.showStaffNames}
              onChange={(e) =>
                form.setValue('showStaffNames', e.target.checked, {
                  shouldDirty: true,
                })
              }
            />
            {SETTINGS.invoice.showStaffNames}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              disabled={!canUpdate}
              checked={values.showLogo}
              onChange={(e) =>
                form.setValue('showLogo', e.target.checked, {
                  shouldDirty: true,
                })
              }
            />
            {SETTINGS.invoice.showLogo}
          </label>

          <FormField label={SETTINGS.invoice.termsText}>
            <textarea
              className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              disabled={!canUpdate}
              maxLength={500}
              value={values.termsText}
              onChange={(e) =>
                form.setValue('termsText', e.target.value, { shouldDirty: true })
              }
            />
          </FormField>
          <FormField label={SETTINGS.invoice.thankYouText}>
            <Input
              disabled={!canUpdate}
              maxLength={200}
              value={values.thankYouText}
              onChange={(e) =>
                form.setValue('thankYouText', e.target.value, {
                  shouldDirty: true,
                })
              }
            />
          </FormField>
          <FormField label={SETTINGS.invoice.whatsappMessage}>
            <textarea
              className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              disabled={!canUpdate}
              maxLength={500}
              value={values.whatsappMessage}
              onChange={(e) =>
                form.setValue('whatsappMessage', e.target.value, {
                  shouldDirty: true,
                })
              }
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {SETTINGS.invoice.whatsappHint}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {SETTINGS.invoice.whatsappExample}: {waExample}
            </p>
          </FormField>
          <FormField label={SETTINGS.invoice.shareLinkDays}>
            <Input
              type="number"
              min={1}
              max={365}
              disabled={!canUpdate}
              {...form.register('shareLinkDays', { valueAsNumber: true })}
            />
          </FormField>

          <SettingsSaveBar
            dirty={dirty}
            canUpdate={canUpdate}
            pending={patch.isPending}
          />
        </form>
      </CardContent>
    </Card>
  )
}
