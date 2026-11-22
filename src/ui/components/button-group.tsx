import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import type * as React from "react"
import { Separator } from "@ui/components/separator"
import { cn } from "@ui/lib/utils"

const buttonGroupVariants = cva(
  "has-[>[data-slot=button-group]]:gap-2 flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1 group/button-group *:data-slot:bg-clip-border [&>[data-variant=ghost]]:rounded-full! [&>[data-variant=plain]]:rounded-full! has-[>[data-variant=outline]]:*:data-[slot=input-group]:border-border has-[>[data-variant=outline]]:*:data-[slot=select-trigger]:border-border has-[>[data-variant=outline]]:[&>input]:border-border",
  {
    variants: {
      orientation: {
        horizontal:
          "*:data-slot:rounded-e-none [&>[data-slot]:first-child]:rounded-s-full [&>[data-slot]:not(:has(~[data-slot]))]:rounded-e-full! [&>[data-slot]~[data-slot]]:rounded-s-none [&>[data-slot]~[data-slot]]:border-s-0",
        vertical:
          "flex-col *:data-slot:rounded-b-none [&>[data-slot]:first-child]:rounded-t-2xl [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-2xl! [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="button-group-text"
      className={cn(
        "items-center gap-2 rounded-full bg-secondary px-2.5 text-sm flex [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "z-10 bg-foreground/20 data-horizontal:mx-2.25 data-horizontal:-mb-px data-vertical:my-2.25 data-vertical:-me-px relative data-horizontal:w-auto data-vertical:h-auto",
        className
      )}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText }
