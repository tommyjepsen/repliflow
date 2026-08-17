import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent-dim disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-foreground text-background hover:bg-foreground/85',
        secondary: 'bg-panel-hover text-foreground border border-border hover:border-border-strong',
        ghost: 'text-muted-foreground hover:bg-panel-hover hover:text-foreground',
        outline: 'border border-border text-foreground hover:bg-panel-hover',
      },
      size: {
        default: 'h-8 px-3',
        sm: 'h-7 px-2.5',
        icon: 'size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
