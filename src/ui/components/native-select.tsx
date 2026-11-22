"use client"

import { CaretUpDownIcon } from "@phosphor-icons/react"
import type * as React from "react"
import { cn } from "@ui/lib/utils"

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default" | "lg"
}

function NativeSelect({
  className,
  size = "default",
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn(
        "relative w-fit has-[select:disabled]:opacity-50 group/native-select",
        className
      )}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className="h-11 w-full min-w-0 appearance-none rounded-xl border border-border bg-background dark:bg-foreground/6 py-1 pe-8 ps-3 text-base transition-[color,box-shadow,background-color,border-color] select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground has-[option[value='']:checked]:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring aria-invalid:border-[1.5px] aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-0 aria-invalid:bg-destructive/5 dark:aria-invalid:bg-destructive/10 data-[size=sm]:h-9 data-[size=sm]:rounded-md data-[size=lg]:h-13.5 data-[size=lg]:ps-4 data-[size=lg]:pe-10 data-[size=lg]:text-[17px] outline-none disabled:pointer-events-none disabled:cursor-not-allowed"
        {...props}
      />
      <CaretUpDownIcon
        className="top-1/2 inset-e-2.5 size-4 -translate-y-1/2 text-muted-foreground group-data-[size=lg]/native-select:inset-e-4 pointer-events-none absolute select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn(
        "bg-[Canvas] text-[CanvasText]",
        className
      )}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn(
        "bg-[Canvas] text-[CanvasText]",
        className
      )}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
