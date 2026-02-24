"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function interpolateWhiteToGreen(percent: number): string {
  const p = Math.max(0, Math.min(100, percent)) / 100
  const r = Math.round(255 + (34 - 255) * p)
  const g = Math.round(255 + (197 - 255) * p)
  const b = Math.round(255 + (94 - 255) * p)
  return `rgb(${r}, ${g}, ${b})`
}

export interface ProgressProps
  extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  /** When "wizard", uses white-to-green gradient and shows percentage on hover */
  variant?: "default" | "wizard"
}

function Progress({
  className,
  value,
  variant = "default",
  ...props
}: ProgressProps) {
  const numValue = value ?? 0
  const isWizard = variant === "wizard"

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-variant={variant}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full",
        isWizard ? "bg-muted" : "bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-all duration-300",
          !isWizard && "bg-primary"
        )}
        style={
          isWizard
            ? {
                transform: `translateX(-${100 - numValue}%)`,
                backgroundColor: interpolateWhiteToGreen(numValue),
              }
            : { transform: `translateX(-${100 - numValue}%)` }
        }
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress, interpolateWhiteToGreen }
