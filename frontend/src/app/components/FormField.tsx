import type { ReactNode } from 'react'

import { Label } from '@/app/components/ui/label'
import { cn } from '@/app/utils'

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  className?: string
  children: ReactNode
}

/** Label 6px above control; use inside SheetBody/DialogBody (gap-4 between groups). */
export function FormField({
  label,
  htmlFor,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
