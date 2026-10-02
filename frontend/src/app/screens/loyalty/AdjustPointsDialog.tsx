import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
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
  loyaltyAdjustSchema,
  type LoyaltyAdjustFormValues,
} from '@/app/helpers/loyaltyValidation'
import { useAdjustLoyaltyMutation } from '@/app/hooks/queries/useLoyaltyQuery'
import type { Customer } from '@/app/service/customers/customersApi'

interface AdjustPointsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: Customer[]
  /** When set, locks the customer select. */
  presetCustomerId?: string | null
}

function displayName(customer: Customer): string {
  return [customer.name, customer.lastName].filter(Boolean).join(' ')
}

export function AdjustPointsDialog({
  open,
  onOpenChange,
  customers,
  presetCustomerId,
}: AdjustPointsDialogProps) {
  const mutation = useAdjustLoyaltyMutation()

  const form = useForm<LoyaltyAdjustFormValues>({
    resolver: zodResolver(loyaltyAdjustSchema),
    defaultValues: {
      customerId: presetCustomerId ?? '',
      type: 'earn',
      points: 50,
      reason: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        customerId: presetCustomerId ?? '',
        type: 'earn',
        points: 50,
        reason: '',
      })
    }
  }, [open, presetCustomerId, form])

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync({
      customerId: values.customerId,
      type: values.type,
      points: values.points,
      reason: values.reason,
    })
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust points</DialogTitle>
          <DialogDescription>
            Manual earn, redeem, or set balance. Record a reason for the ledger.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onSubmit} noValidate>
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select
              value={form.watch('customerId')}
              onValueChange={(value) =>
                form.setValue('customerId', value, { shouldValidate: true })
              }
              disabled={Boolean(presetCustomerId)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer._id} value={customer._id}>
                    {displayName(customer)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.customerId ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.customerId.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(value) =>
                form.setValue('type', value as LoyaltyAdjustFormValues['type'], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="earn">Earn (add)</SelectItem>
                <SelectItem value="redeem">Redeem (subtract)</SelectItem>
                <SelectItem value="adjust">Set balance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loy-points">
              {form.watch('type') === 'adjust' ? 'New balance' : 'Points'}
            </Label>
            <Input
              id="loy-points"
              type="number"
              min={1}
              step="1"
              className="tabular-nums"
              {...form.register('points', { valueAsNumber: true })}
            />
            {form.formState.errors.points ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.points.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loy-reason">Reason</Label>
            <Input
              id="loy-reason"
              placeholder="Birthday bonus / correction…"
              {...form.register('reason')}
            />
            {form.formState.errors.reason ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.reason.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
