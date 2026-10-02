import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
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
  appointmentSettingsSchema,
  type AppointmentSettingsFormValues,
} from '@/app/helpers/settingsValidation'
import { usePatchAppointmentSettingsMutation } from '@/app/hooks/queries/useSettingsQuery'
import type { AppointmentSettings } from '@/app/service/settings/settingsApi'

interface Props {
  initial: AppointmentSettings
  canUpdate: boolean
}

export function AppointmentSettingsSection({ initial, canUpdate }: Props) {
  const patch = usePatchAppointmentSettingsMutation()
  const form = useForm<AppointmentSettingsFormValues>({
    resolver: zodResolver(appointmentSettingsSchema),
    defaultValues: initial as AppointmentSettingsFormValues,
  })

  useEffect(() => {
    form.reset(initial as AppointmentSettingsFormValues)
  }, [initial, form])

  const dirty = form.formState.isDirty
  const values = form.watch()

  const onSubmit = form.handleSubmit(async (vals) => {
    await patch.mutateAsync(vals)
    form.reset(vals)
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Start hour (0–23)"
              htmlFor="startHour"
              error={form.formState.errors.startHour?.message}
            >
              <Input
                id="startHour"
                type="number"
                min={0}
                max={23}
                disabled={!canUpdate}
                {...form.register('startHour', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="End hour (1–24)"
              htmlFor="endHour"
              error={form.formState.errors.endHour?.message}
            >
              <Input
                id="endHour"
                type="number"
                min={1}
                max={24}
                disabled={!canUpdate}
                {...form.register('endHour', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Slot minutes">
              <Select
                value={String(values.slotMinutes)}
                onValueChange={(v) =>
                  form.setValue(
                    'slotMinutes',
                    Number(v) as AppointmentSettingsFormValues['slotMinutes'],
                    { shouldDirty: true },
                  )
                }
                disabled={!canUpdate}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 30, 45, 60].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground">
            Defaults: 9:00–21:00 · 30-minute slots. Used by the day calendar.
          </p>
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
