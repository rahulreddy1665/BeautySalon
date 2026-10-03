import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { FormField } from '@/app/components/FormField'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { SETTINGS } from '@/app/constants'
import {
  loyaltyRulesSchema,
  type LoyaltyRulesFormValues,
} from '@/app/helpers/loyaltyValidation'
import { usePatchLoyaltySettingsMutation } from '@/app/hooks/queries/useSettingsQuery'
import { SettingsSaveBar } from '@/app/screens/settings/SettingsSaveBar'
import type { LoyaltySettings } from '@/app/service/settings/settingsApi'
import { formatINR } from '@/app/utils'

interface Props {
  initial: LoyaltySettings
  canUpdate: boolean
  onDirtyChange?: (dirty: boolean) => void
  hideTitle?: boolean
}

export function LoyaltySettingsSection({
  initial,
  canUpdate,
  onDirtyChange,
  hideTitle,
}: Props) {
  const patch = usePatchLoyaltySettingsMutation()
  const form = useForm<LoyaltyRulesFormValues>({
    resolver: zodResolver(loyaltyRulesSchema),
    defaultValues: initial,
  })

  useEffect(() => {
    form.reset(initial)
  }, [initial, form])

  const values = form.watch()
  const dirty = form.formState.isDirty
  const exampleBill = 1000
  const earnExample = Math.floor(
    (exampleBill / 100) * (values.earnPointsPer100Inr || 0),
  )
  const redeemExample = (values.redeemValuePerPoint || 0) * 100

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
          <CardTitle>{SETTINGS.sections.loyalty}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              disabled={!canUpdate}
              checked={values.enabled}
              onChange={(e) =>
                form.setValue('enabled', e.target.checked, {
                  shouldDirty: true,
                })
              }
            />
            Loyalty enabled
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Points per ₹100"
              htmlFor="earn"
              error={form.formState.errors.earnPointsPer100Inr?.message}
            >
              <Input
                id="earn"
                type="number"
                disabled={!canUpdate || !values.enabled}
                {...form.register('earnPointsPer100Inr', {
                  valueAsNumber: true,
                })}
              />
            </FormField>
            <FormField
              label="₹ value per point"
              htmlFor="redeem"
              error={form.formState.errors.redeemValuePerPoint?.message}
            >
              <Input
                id="redeem"
                type="number"
                step="0.01"
                disabled={!canUpdate || !values.enabled}
                {...form.register('redeemValuePerPoint', {
                  valueAsNumber: true,
                })}
              />
            </FormField>
            <FormField
              label="Min redeem points"
              htmlFor="min"
              error={form.formState.errors.minRedeemPoints?.message}
            >
              <Input
                id="min"
                type="number"
                disabled={!canUpdate || !values.enabled}
                {...form.register('minRedeemPoints', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Max redeem % of bill"
              htmlFor="max"
              error={form.formState.errors.maxRedeemPercent?.message}
            >
              <Input
                id="max"
                type="number"
                step="0.01"
                disabled={!canUpdate || !values.enabled}
                {...form.register('maxRedeemPercent', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Expiry days (0 = never)"
              htmlFor="exp"
              error={form.formState.errors.pointsExpiryDays?.message}
            >
              <Input
                id="exp"
                type="number"
                disabled={!canUpdate || !values.enabled}
                {...form.register('pointsExpiryDays', { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Example: a {formatINR(exampleBill)} net bill earns{' '}
            <span className="font-medium text-foreground">{earnExample}</span>{' '}
            points · 100 points redeem for{' '}
            <span className="font-medium text-foreground">
              {formatINR(redeemExample)}
            </span>
            . Points earn on net after discounts and redemption (excludes tax
            and tip).
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
