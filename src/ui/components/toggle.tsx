"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { Toggle as TogglePrimitive } from "radix-ui"
import type * as React from "react"
import { cn } from "@ui/lib/utils"

const toggleVariants = cva(
  "gap-1 rounded-lg text-sm transition-[color,background-color,scale] duration-200 ease-[cubic-bezier(0.3,1.25,0.5,1)] active:scale-96 motion-reduce:active:scale-100 hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-pressed:bg-accent aria-pressed:text-[color-mix(in_oklab,var(--primary)_80%,var(--foreground))] aria-pressed:hover:bg-accent aria-pressed:hover:text-[color-mix(in_oklab,var(--primary)_80%,var(--foreground))] inline-flex items-center justify-center whitespace-nowrap outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 disabled:opacity-50 group/toggle [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 min-w-9 px-3 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
        sm: "h-8 min-w-8 px-3 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
        lg: "h-10 min-w-10 px-4 has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
