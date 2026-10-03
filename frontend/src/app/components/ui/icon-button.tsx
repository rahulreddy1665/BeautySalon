import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/app/utils'

const iconButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      size: {
        default: 'size-10 [&_svg:not([class*="size-"])]:size-5',
        sm: 'size-9 [&_svg:not([class*="size-"])]:size-4',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

export interface IconButtonProps
  extends React.ComponentProps<'button'>, VariantProps<typeof iconButtonVariants> {
  asChild?: boolean
  'aria-label': string
}

/** Fixed 40×40 (or 36×36 sm) round outline icon control for the top bar. */
export function IconButton({
  className,
  size = 'default',
  asChild = false,
  type = 'button',
  ...props
}: IconButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      type={asChild ? undefined : type}
      data-slot="icon-button"
      className={cn(iconButtonVariants({ size, className }))}
      {...props}
    />
  )
}

export { iconButtonVariants }
