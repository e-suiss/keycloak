import type * as React from "react"
import { cn } from "@ui/lib/utils"

function Input({
  className,
  type,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  size?: "sm" | "md" | "default" | "lg"
}) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        "file:border-0 file:bg-transparent h-11 rounded-xl border border-border bg-background dark:bg-foreground/6 px-3 py-1 text-base transition-[color,box-shadow,background-color,border-color] file:h-7 file:text-sm caret-primary focus-visible:border-ring data-[size=md]:h-9 data-[size=md]:text-sm data-[size=sm]:h-8 data-[size=sm]:rounded-md data-[size=sm]:px-2.5 data-[size=sm]:text-sm aria-invalid:border-[1.5px] aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:bg-destructive/5 dark:aria-invalid:bg-destructive/10 in-[[data-slot=field-group][data-variant=inset]]:border-0 data-[size=lg]:h-13.5 data-[size=lg]:px-4 data-[size=lg]:text-[17px] w-full min-w-0 outline-none file:inline-flex file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
