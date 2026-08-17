import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type * as React from 'react'
import { cn } from '@/lib/utils'

/** Wraps the app so tooltips share one timer — see main.tsx. */
export function TooltipProvider({
  delayDuration = 100,
  skipDelayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  )
}

export const TooltipRoot = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'tooltip-content z-50 max-w-56 rounded-md border border-border bg-panel px-2 py-1 text-[12px] leading-snug text-foreground',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-[var(--border)]" width={10} height={5} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

/** Convenience wrapper for the common icon-button case. */
export function Tooltip({
  label,
  children,
  side = 'bottom',
  ...props
}: {
  label: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
} & Omit<React.ComponentProps<typeof TooltipPrimitive.Root>, 'children'>) {
  return (
    <TooltipRoot {...props}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </TooltipRoot>
  )
}
