import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { FormField } from '@/app/components/FormField'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import {
  invoiceSettingsSchema,
  type InvoiceSettingsFormValues,
} from '@/app/helpers/settingsValidation'
import { usePatchInvoiceSettingsMutation } from '@/app/hooks/queries/useSettingsQuery'
import type {
  InvoiceSettings,
  InvoiceTemplateId,
} from '@/app/service/settings/settingsApi'
import { InvoiceTemplatePreview } from '@/app/screens/settings/InvoiceTemplatePreview'

interface Props {
  initial: InvoiceSettings
  preview?: { nextNumber: number; preview: string }
  canUpdate: boolean
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

export function InvoiceSettingsSection({
  initial,
  preview,
  canUpdate,
}: Props) {
  const patch = usePatchInvoiceSettingsMutation()
  const form = useForm<InvoiceSettingsFormValues>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues: {
      ...initial,
      nextNumber: preview?.nextNumber,
    },
  })

  useEffect(() => {
    form.reset({
      ...initial,
      nextNumber: preview?.nextNumber,
    })
  }, [initial, preview, form])

  const values = form.watch()
  const dirty = form.formState.isDirty
  const shown = useMemo(
    () => livePreview(values, values.nextNumber || preview?.nextNumber || 1),
    [values, preview?.nextNumber],
  )

  const onSubmit = form.handleSubmit(async (vals) => {
    await patch.mutateAsync(vals)
    form.reset(vals)
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Invoice settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Prefix"
              htmlFor="prefix"
              error={form.formState.errors.prefix?.message}
            >
              <Input
                id="prefix"
                disabled={!canUpdate}
                {...form.register('prefix')}
              />
            </FormField>
            <FormField label="Number padding" htmlFor="pad">
              <Input
                id="pad"
                type="number"
                min={1}
                max={10}
                disabled={!canUpdate}
                {...form.register('numberPadding', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Next number" htmlFor="next">
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
            Include year in invoice number
          </label>

          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm tabular-nums">
            Next invoice: <span className="font-semibold">{shown}</span>
          </p>

          <FormField label="Rounding">
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

          <FormField label="Print template">
            <Select
              value={values.templateId}
              onValueChange={(v) =>
                form.setValue('templateId', v as InvoiceTemplateId, {
                  shouldDirty: true,
                })
              }
              disabled={!canUpdate}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic A4</SelectItem>
                <SelectItem value="compact">Compact A5</SelectItem>
                <SelectItem value="thermal">Thermal receipt</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <InvoiceTemplatePreview templateId={values.templateId} />

          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-normal text-muted-foreground">
              {dirty ? 'Unsaved changes' : 'All changes saved'}
            </Label>
            <Button
              type="submit"
              disabled={!canUpdate || !dirty || patch.isPending}
            >
              {patch.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
