import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'

import { FormField } from '@/app/components/FormField'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import {
  businessSettingsSchema,
  type BusinessSettingsFormValues,
} from '@/app/helpers/settingsValidation'
import {
  usePatchBusinessMutation,
  useRemoveLogoMutation,
  useUploadLogoMutation,
} from '@/app/hooks/queries/useSettingsQuery'
import {
  logoDataUrl,
  type BusinessSettings,
} from '@/app/service/settings/settingsApi'

interface Props {
  initial: BusinessSettings
  canUpdate: boolean
}

export function BusinessSettingsSection({ initial, canUpdate }: Props) {
  const patch = usePatchBusinessMutation()
  const uploadLogo = useUploadLogoMutation()
  const removeLogo = useRemoveLogoMutation()
  const fileRef = useRef<HTMLInputElement>(null)

  const form = useForm<BusinessSettingsFormValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      salonName: initial.salonName,
      address: initial.address ?? '',
      city: initial.city ?? '',
      state: initial.state ?? '',
      pincode: initial.pincode ?? '',
      phone: initial.phone ?? '',
      email: initial.email ?? '',
      gstin: initial.gstin ?? '',
      invoiceFooterNote: initial.invoiceFooterNote ?? '',
    },
  })

  useEffect(() => {
    form.reset({
      salonName: initial.salonName,
      address: initial.address ?? '',
      city: initial.city ?? '',
      state: initial.state ?? '',
      pincode: initial.pincode ?? '',
      phone: initial.phone ?? '',
      email: initial.email ?? '',
      gstin: initial.gstin ?? '',
      invoiceFooterNote: initial.invoiceFooterNote ?? '',
    })
  }, [initial, form])

  const dirty = form.formState.isDirty
  const preview = useMemo(() => logoDataUrl(initial), [initial])

  const onSubmit = form.handleSubmit(async (values) => {
    await patch.mutateAsync(values)
    form.reset(values)
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Business profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {preview ? (
                <img src={preview} alt="" className="size-full object-contain" />
              ) : (
                <span className="text-[10px] text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void uploadLogo.mutateAsync(file)
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canUpdate || uploadLogo.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {preview ? 'Replace logo' : 'Upload logo'}
              </Button>
              {preview ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!canUpdate || removeLogo.isPending}
                  onClick={() => void removeLogo.mutateAsync()}
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="w-full text-[11px] text-muted-foreground">
              PNG, JPG, SVG or WebP · max 2 MB
            </p>
          </div>

          <FormField
            label="Salon name"
            htmlFor="salonName"
            error={form.formState.errors.salonName?.message}
          >
            <Input
              id="salonName"
              disabled={!canUpdate}
              {...form.register('salonName')}
            />
          </FormField>

          <FormField label="Address" htmlFor="address">
            <Input id="address" disabled={!canUpdate} {...form.register('address')} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="City" htmlFor="city">
              <Input id="city" disabled={!canUpdate} {...form.register('city')} />
            </FormField>
            <FormField label="State" htmlFor="state">
              <Input id="state" disabled={!canUpdate} {...form.register('state')} />
            </FormField>
            <FormField
              label="Pincode"
              htmlFor="pincode"
              error={form.formState.errors.pincode?.message}
            >
              <Input
                id="pincode"
                disabled={!canUpdate}
                {...form.register('pincode')}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phone" htmlFor="phone">
              <Input id="phone" disabled={!canUpdate} {...form.register('phone')} />
            </FormField>
            <FormField
              label="Email"
              htmlFor="email"
              error={form.formState.errors.email?.message}
            >
              <Input id="email" disabled={!canUpdate} {...form.register('email')} />
            </FormField>
          </div>

          <FormField
            label="GSTIN (optional)"
            htmlFor="gstin"
            error={form.formState.errors.gstin?.message}
          >
            <Input
              id="gstin"
              disabled={!canUpdate}
              placeholder="27AABCU9603R1ZM"
              {...form.register('gstin')}
            />
          </FormField>

          <FormField label="Invoice footer note" htmlFor="footer">
            <Input
              id="footer"
              disabled={!canUpdate}
              {...form.register('invoiceFooterNote')}
            />
          </FormField>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {dirty ? 'Unsaved changes' : 'All changes saved'}
            </p>
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
