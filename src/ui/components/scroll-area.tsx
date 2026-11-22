"use client"

import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"
import * as React from "react"
import { cn } from "@ui/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = React.useState(false)

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const measure = () =>
      setScrollable(
        viewport.scrollHeight > viewport.clientHeight ||
          viewport.scrollWidth > viewport.clientWidth
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    for (const child of viewport.children) observer.observe(child)
    return () => observer.disconnect()
  }, [])

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        ref={viewportRef}
        tabIndex={scrollable ? 0 : -1}
        className="focus-visible:ring-3 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "z-10 data-horizontal:mx-2 data-horizontal:mb-1 data-horizontal:h-2.25 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:my-2 data-vertical:me-1 data-vertical:w-2.25 data-vertical:border-s data-vertical:border-s-transparent flex touch-none p-px transition-colors select-none",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="rounded-full relative flex-1 bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
