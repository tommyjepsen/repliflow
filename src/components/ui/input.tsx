import type * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-8 w-full rounded-md border border-border bg-card px-2.5 text-[13px] text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-border-active',
        className,
      )}
      {...props}
    />
  )
}
