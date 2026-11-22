import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import type * as React from "react"
import { cn } from "@ui/lib/utils"

const markerVariants = cva(
  "w-full min-h-4 gap-2 text-start text-sm text-muted-foreground [a]:underline [a]:hover:text-foreground group/marker relative flex items-center [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "",
        separator: "before:me-1 before:h-px before:min-w-0 before:flex-1 before:bg-border after:ms-1 after:h-px after:min-w-0 after:flex-1 after:bg-border",
        border: "border-b border-border pb-2",
      },
    },
  }
)

function Marker({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof markerVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="marker"
      data-variant={variant}
      className={cn(markerVariants({ variant, className }))}
      {...props}
    />
  )
}

function MarkerIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function MarkerContent({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="marker-content"
      className={cn(
        "group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center min-w-0 wrap-break-word *:[a]:underline *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Marker, MarkerContent, MarkerIcon }
