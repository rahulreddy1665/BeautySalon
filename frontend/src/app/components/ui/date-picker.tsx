import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

import { Button } from '@/app/components/ui/button'
import { Calendar } from '@/app/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover'
import { cn } from '@/app/utils'

interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: ComponentProps<typeof Calendar>['disabled']
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'min-touch h-11 w-full justify-start text-left font-normal md:h-9',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4" strokeWidth={1.75} />
          {value ? format(value, 'dd MMM yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          disabled={disabled}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
