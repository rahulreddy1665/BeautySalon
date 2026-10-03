import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { FormField } from '@/app/components/FormField'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { COMMON, STAFF } from '@/app/constants'
import { staffFormSchema, type StaffFormValues } from '@/app/helpers/staffValidation'
import { useDesignationsQuery } from '@/app/hooks/queries/useDesignationsQuery'
import {
  useCreateStaffMutation,
  useUpdateStaffMutation,
} from '@/app/hooks/queries/useStaffQuery'
import { staffApi, type StaffMember } from '@/app/service/staff/staffApi'
import { toErrorMessage } from '@/app/utils'

interface StaffFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff?: StaffMember | null
}

function designationIdOf(staff?: StaffMember | null): string {
  if (!staff?.designation) return ''
  if (typeof staff.designation === 'string') return staff.designation
  return staff.designation._id
}

function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

function toValues(staff?: StaffMember | null): StaffFormValues {
  if (!staff) {
    return {
      name: '',
      age: 25,
      gender: 'Female',
      isActive: true,
      designationId: '',
    }
  }
  return {
    name: staff.name,
    age: staff.age,
    gender: staff.gender,
    isActive: staff.isActive !== false,
    designationId: designationIdOf(staff),
  }
}

function StaffFormBody({
  staff,
  onOpenChange,
}: {
  staff?: StaffMember | null
  onOpenChange: (open: boolean) => void
}) {
  const isEdit = Boolean(staff)
  const createMutation = useCreateStaffMutation()
  const updateMutation = useUpdateStaffMutation()
  const designationsQuery = useDesignationsQuery()
  const pending = createMutation.isPending || updateMutation.isPending
  const designations = (designationsQuery.data ?? []).filter((d) => d.isActive)

  const hadLogin =
    staff?.loginStatus === 'login_enabled' ||
    staff?.loginStatus === 'must_change_password'

  const [allowLogin, setAllowLogin] = useState(Boolean(hadLogin))
  const [username, setUsername] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [shownTemp, setShownTemp] = useState<string | null>(null)

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: toValues(staff),
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      designationId: values.designationId || null,
    }

    try {
      let staffId = staff?._id
      if (isEdit && staff) {
        await updateMutation.mutateAsync({ id: staff._id, payload })
      } else {
        const created = await createMutation.mutateAsync(payload)
        staffId = created._id
      }

      if (!staffId) {
        onOpenChange(false)
        return
      }

      if (allowLogin && !hadLogin) {
        if (!values.designationId) {
          toast.error(STAFF.detail.allowLogin)
          return
        }
        const res = await staffApi.enableLogin(staffId, {
          username,
          temporaryPassword: tempPassword,
        })
        setShownTemp(res.temporaryPassword)
        toast.success(STAFF.toasts.loginEnabled)
        return
      }

      if (!allowLogin && hadLogin) {
        await staffApi.disableLogin(staffId)
        toast.success(STAFF.toasts.loginDisabled)
      }

      onOpenChange(false)
    } catch (err) {
      toast.error(toErrorMessage(err))
    }
  })

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit} noValidate>
      <SheetBody>
        {shownTemp ? (
          <div className="mb-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p className="mb-2">{STAFF.detail.tempPasswordOnce}</p>
            <p className="font-mono text-base tabular-nums">{shownTemp}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                void navigator.clipboard.writeText(shownTemp)
                toast.success(STAFF.toasts.copied)
              }}
            >
              {STAFF.detail.copyPassword}
            </Button>
            <Button
              type="button"
              size="sm"
              className="mt-2 ml-2"
              onClick={() => onOpenChange(false)}
            >
              {COMMON.actions.close}
            </Button>
          </div>
        ) : null}

        <FormField
          label={STAFF.form.name}
          htmlFor="staff-name"
          error={form.formState.errors.name?.message}
        >
          <Input id="staff-name" {...form.register('name')} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label={STAFF.form.age}
            htmlFor="staff-age"
            error={form.formState.errors.age?.message}
          >
            <Input
              id="staff-age"
              type="number"
              min={14}
              max={80}
              className="tabular-nums"
              {...form.register('age', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label={STAFF.form.gender}
            error={form.formState.errors.gender?.message}
          >
            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{COMMON.gender.Male}</SelectItem>
                    <SelectItem value="Female">{COMMON.gender.Female}</SelectItem>
                    <SelectItem value="Other">{COMMON.gender.Other}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>

        <FormField label={STAFF.form.designation}>
          <Controller
            control={form.control}
            name="designationId"
            render={({ field }) => (
              <Select
                value={field.value || 'none'}
                onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={STAFF.form.designation} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {designations.map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField label={COMMON.labels.status}>
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Select
                value={field.value ? 'active' : 'inactive'}
                onValueChange={(v) => field.onChange(v === 'active')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{COMMON.labels.active}</SelectItem>
                  <SelectItem value="inactive">{COMMON.labels.inactive}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField label={STAFF.form.allowLogin}>
          <Select
            value={allowLogin ? 'on' : 'off'}
            onValueChange={(v) => setAllowLogin(v === 'on')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on">{COMMON.labels.yes}</SelectItem>
              <SelectItem value="off">{COMMON.labels.no}</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        {allowLogin && !hadLogin ? (
          <>
            <FormField label={STAFF.detail.username}>
              <Input
                className="min-touch h-11"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                autoComplete="off"
              />
            </FormField>
            <FormField label={STAFF.detail.temporaryPassword}>
              <div className="flex gap-1">
                <Input
                  className="min-touch h-11"
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-touch h-11"
                  onClick={() => setTempPassword(generatePassword())}
                >
                  {STAFF.detail.generatePassword}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {STAFF.detail.passwordStrength}
              </p>
            </FormField>
          </>
        ) : null}
      </SheetBody>

      {!shownTemp ? (
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            className="min-touch w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            {COMMON.actions.cancel}
          </Button>
          <Button
            type="submit"
            className="min-touch w-full sm:w-auto"
            disabled={
              pending ||
              (allowLogin &&
                !hadLogin &&
                (username.length < 4 || tempPassword.length < 8))
            }
          >
            {pending
              ? COMMON.labels.loading
              : isEdit
                ? COMMON.actions.save
                : COMMON.actions.add}
          </Button>
        </SheetFooter>
      ) : null}
    </form>
  )
}

export function StaffFormSheet({ open, onOpenChange, staff }: StaffFormSheetProps) {
  const formKey = `${staff?._id ?? 'new'}-${open ? 'open' : 'closed'}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{staff ? STAFF.form.editTitle : STAFF.form.createTitle}</SheetTitle>
          <SheetDescription>{STAFF.form.noLoginHint}</SheetDescription>
        </SheetHeader>
        {open ? (
          <StaffFormBody key={formKey} staff={staff} onOpenChange={onOpenChange} />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
