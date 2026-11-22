"use client"

import { Slider as SliderPrimitive } from "radix-ui"
import type * as React from "react"
import { cn } from "@ui/lib/utils"

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root>

function thumbCount(
  value: SliderProps["value"],
  defaultValue: SliderProps["defaultValue"]
) {
  if (Array.isArray(value)) return value.length
  if (Array.isArray(defaultValue)) return defaultValue.length
  return 1
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  disabled,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      className={cn(
        "cursor-pointer data-disabled:cursor-not-allowed data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-vertical:h-full data-vertical:w-auto data-vertical:flex-col data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="data-horizontal:w-full data-vertical:h-full rounded-full bg-border data-horizontal:h-1 data-vertical:w-1 select-none relative grow overflow-hidden"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="bg-primary absolute select-none data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount(value, defaultValue) }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-disabled={disabled || undefined}
          className="rounded-full bg-background shadow-md ring-1 ring-foreground/10 transition-[width,height,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none not-dark:bg-clip-padding focus-visible:ring-3 focus-visible:ring-ring/50 data-horizontal:h-5 data-horizontal:w-8 data-horizontal:active:w-9 data-vertical:h-8 data-vertical:w-5 data-vertical:active:h-9 data-disabled:pointer-events-none data-disabled:shadow-none dark:bg-foreground block shrink-0 select-none"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
