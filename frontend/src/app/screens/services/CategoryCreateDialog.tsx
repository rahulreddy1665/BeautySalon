import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { FormField } from '@/app/components/FormField'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { COMMON, SERVICES } from '@/app/constants'
import {
  categoryFormSchema,
  type CategoryFormValues,
} from '@/app/helpers/serviceValidation'
import { useCreateCategoryMutation } from '@/app/hooks/queries/useCategoriesQuery'
import type { ServiceCategory } from '@/app/service/categories/categoriesApi'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (category: ServiceCategory) => void
}

export function CategoryCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const createMutation = useCreateCategoryMutation()
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (open) form.reset({ name: '' })
  }, [open, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const created = await createMutation.mutateAsync({ name: values.name })
    onCreated(created)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{SERVICES.categories.createTitle}</DialogTitle>
          <DialogDescription>
            {SERVICES.categories.createDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <FormField
              label={SERVICES.categories.name}
              htmlFor="cat-name"
              error={form.formState.errors.name?.message}
            >
              <Input
                id="cat-name"
                autoFocus
                placeholder={SERVICES.categories.namePlaceholder}
                {...form.register('name')}
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {COMMON.actions.cancel}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending
                ? COMMON.labels.loading
                : SERVICES.categories.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
