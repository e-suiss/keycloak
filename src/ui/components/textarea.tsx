"use client"

import type * as React from "react"
import { cn } from "@ui/lib/utils"

function TextareaHandle({ placement }: { placement: "inside" | "outside" }) {
  function startResize(event: React.PointerEvent<HTMLSpanElement>) {
    const handle = event.currentTarget
    const textarea = handle.parentElement?.querySelector<HTMLTextAreaElement>(
      "[data-slot=textarea]"
    )
    if (!textarea || event.button !== 0) return
    event.preventDefault()
    handle.setPointerCapture(event.pointerId)
    handle.dataset.dragging = ""
    const startY = event.clientY
    const startHeight = textarea.offsetHeight
    const minHeight =
      Number.parseFloat(getComputedStyle(textarea).minHeight) || 0
    const move = (moveEvent: PointerEvent) => {
      const height = startHeight + moveEvent.clientY - startY
      textarea.style.height = `${Math.max(minHeight, height)}px`
    }
    const end = () => {
      delete handle.dataset.dragging
      handle.removeEventListener("pointermove", move)
      handle.removeEventListener("pointerup", end)
      handle.removeEventListener("pointercancel", end)
    }
    handle.addEventListener("pointermove", move)
    handle.addEventListener("pointerup", end)
    handle.addEventListener("pointercancel", end)
  }

  function resetSize(event: React.MouseEvent<HTMLSpanElement>) {
    event.currentTarget.parentElement
      ?.querySelector<HTMLTextAreaElement>("[data-slot=textarea]")
      ?.style.removeProperty("height")
  }

  return (
    <span
      aria-hidden="true"
      data-slot="textarea-handle"
      data-placement={placement}
      onPointerDown={startResize}
      onDoubleClick={resetSize}
      className="absolute cursor-nwse-resize touch-none peer-disabled:hidden after:absolute after:-inset-2 after:content-[''] data-[placement=inside]:inset-e-1 data-[placement=inside]:bottom-1 data-[placement=inside]:size-3 data-[placement=outside]:-inset-e-1.5 data-[placement=outside]:-bottom-1.5 data-[placement=outside]:size-4.5 rtl:-scale-x-100 rtl:cursor-nesw-resize group/textarea-handle"
    >
      <svg
        aria-hidden
        viewBox={placement === "inside" ? "0 0 12 12" : "0 0 18 18"}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="pointer-events-none size-full overflow-visible stroke-border transition-[stroke] duration-200 group-hover/textarea-handle:stroke-primary group-data-dragging/textarea-handle:stroke-primary"
      >
        <path
          d={
            placement === "inside"
              ? "M11.28 4.11A12 12 0 0 1 4.11 11.28"
              : "M15.97 5.82A17 17 0 0 1 5.82 15.97"
          }
        />
      </svg>
    </span>
  )
}

function Textarea({
  className,
  resizable,
  size = "default",
  ...props
}: React.ComponentProps<"textarea"> & {
  resizable?: "inside" | "outside"
  size?: "default" | "lg"
}) {
  const textarea = (
    <textarea
      data-slot="textarea"
      data-resizable={resizable}
      data-size={size}
      className={cn(
        "field-sizing-content min-h-16 resize-none rounded-xl border border-border bg-background dark:bg-foreground/6 px-3 py-3 text-base transition-[color,box-shadow,background-color,border-color] caret-primary focus-visible:border-ring aria-invalid:border-[1.5px] aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:bg-destructive/5 data-resizable:field-sizing-fixed data-resizable:min-h-24 dark:aria-invalid:bg-destructive/10 data-[size=lg]:min-h-13.5 data-[size=lg]:px-4 data-[size=lg]:py-3.5 data-[size=lg]:text-[17px] flex w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 peer",
        className
      )}
      {...props}
    />
  )

  if (!resizable) return textarea

  return (
    <div data-slot="textarea-container" className="relative w-full">
      {textarea}
      <TextareaHandle placement={resizable} />
    </div>
  )
}

export { Textarea }
