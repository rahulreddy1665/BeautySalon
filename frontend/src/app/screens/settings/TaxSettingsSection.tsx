import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { FormField } from '@/app/components/FormField'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { SETTINGS } from '@/app/constants'
import {
  taxSettingsSchema,
  type TaxSettingsFormValues,
} from '@/app/helpers/settingsValidation'
import { usePatchTaxMutation } from '@/app/hooks/queries/useSettingsQuery'
import { SettingsSaveBar } from '@/app/screens/settings/SettingsSaveBar'
import type { TaxSettings } from '@/app/service/settings/settingsApi'

interface Props {
  initial: TaxSettings
  canUpdate: boolean
  onDirtyChange?: (dirty: boolean) => void
  hideTitle?: boolean
}

export function TaxSettingsSection({
  initial,
  canUpdate,
  onDirtyChange,
  hideTitle,
}: Props) {
  const patch = usePatchTaxMutation()
  const form = useForm<TaxSettingsFormValues>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: initial,
  })

  useEffect(() => {
    form.reset(initial)
  }, [initial, form])

  const values = form.watch()
  const servicesCombined =
    (values.services?.cgstPercent ?? 0) + (values.services?.sgstPercent ?? 0)
  const productsCombined =
    (values.products?.cgstPercent ?? 0) + (values.products?.sgstPercent ?? 0)
  const dirty = form.formState.isDirty

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
          <CardTitle>{SETTINGS.sections.tax}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              disabled={!canUpdate}
              checked={values.gstEnabled}
              onChange={(e) =>
                form.setValue('gstEnabled', e.target.checked, {
                  shouldDirty: true,
                })
              }
            />
            GST enabled
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              disabled={!canUpdate || !values.gstEnabled}
              checked={values.pricesIncludeGst}
              onChange={(e) =>
                form.setValue('pricesIncludeGst', e.target.checked, {
                  shouldDirty: true,
                })
              }
            />
            Prices include GST
          </label>

          <div className="space-y-3 rounded-md border border-border p-3">
            <p className="text-sm font-medium">Services</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="CGST %" htmlFor="svc-cgst">
                <Input
                  id="svc-cgst"
                  type="number"
                  step="0.01"
                  min={0}
                  max={50}
                  disabled={!canUpdate || !values.gstEnabled}
                  {...form.register('services.cgstPercent', {
                    valueAsNumber: true,
                  })}
                />
              </FormField>
              <FormField label="SGST %" htmlFor="svc-sgst">
                <Input
                  id="svc-sgst"
                  type="number"
                  step="0.01"
                  min={0}
                  max={50}
                  disabled={!canUpdate || !values.gstEnabled}
                  {...form.register('services.sgstPercent', {
                    valueAsNumber: true,
                  })}
                />
              </FormField>
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              Combined GST: {servicesCombined.toFixed(2)}%
            </p>
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <p className="text-sm font-medium">Products</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="CGST %" htmlFor="prd-cgst">
                <Input
                  id="prd-cgst"
                  type="number"
                  step="0.01"
                  min={0}
                  max={50}
                  disabled={!canUpdate || !values.gstEnabled}
                  {...form.register('products.cgstPercent', {
                    valueAsNumber: true,
                  })}
                />
              </FormField>
              <FormField label="SGST %" htmlFor="prd-sgst">
                <Input
                  id="prd-sgst"
                  type="number"
                  step="0.01"
                  min={0}
                  max={50}
                  disabled={!canUpdate || !values.gstEnabled}
                  {...form.register('products.sgstPercent', {
                    valueAsNumber: true,
                  })}
                />
              </FormField>
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              Combined GST: {productsCombined.toFixed(2)}%
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Tax is calculated on the net amount after discounts. Tip is never
            taxed. HSN/SAC, IGST and multi-state rules are not supported yet.
          </p>

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
