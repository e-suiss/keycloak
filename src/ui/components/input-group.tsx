"use client"

import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { Button } from "@ui/components/button"
import { Input } from "@ui/components/input"
import { Textarea } from "@ui/components/textarea"
import { cn } from "@ui/lib/utils"

function InputGroup({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "lg" }) {
  return (
    <div
      data-slot="input-group"
      data-size={size}
      role="group"
      className={cn(
        "has-[>textarea]:h-auto h-11 rounded-xl border border-border bg-background dark:bg-foreground/6 transition-[color,box-shadow,background-color,border-color] in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 in-data-[slot=combobox-content]:outline-none! has-data-[align=block-end]:rounded-xl has-data-[align=block-start]:rounded-xl has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot][aria-invalid=true]]:border-[1.5px] has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:has-[[data-slot=input-group-control]:focus-visible]:border-destructive has-[[data-slot][aria-invalid=true]]:bg-destructive/5 dark:has-[[data-slot][aria-invalid=true]]:bg-destructive/10 has-[textarea]:rounded-xl has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col data-[disabled=true]:opacity-50 has-[[data-slot=input-group-control]:disabled]:opacity-50 data-[size=lg]:h-13.5 group/input-group relative flex w-full min-w-0 items-center outline-none has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pe-1.5 has-[>[data-align=inline-start]]:[&>input]:ps-1.5",
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "h-auto gap-2 py-2 text-base text-muted-foreground group-data-[disabled=true]/input-group:opacity-50 group-has-[[data-slot=input-group-control]:disabled]/input-group:opacity-50 justify-center group-data-[size=lg]/input-group:text-[17px] flex cursor-text items-center select-none [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start": "order-first ps-3 has-[>button]:-ms-1 has-[>kbd]:-ms-1 group-data-[size=lg]/input-group:ps-4",
        "inline-end": "order-last pe-3 has-[>button]:-me-1 has-[>kbd]:-me-1 group-data-[size=lg]/input-group:pe-4 group-data-[size=lg]/input-group:has-[>button]:-me-1.75",
        "block-start": "order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-3.5 [.border-b]:pb-3.5",
        "block-end": "order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-3.5 [.border-t]:pt-3.5",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  onClick,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (
          event.defaultPrevented ||
          (event.target as HTMLElement).closest("button")
        ) {
          return
        }
        event.currentTarget.parentElement
          ?.querySelector<HTMLElement>("input, textarea")
          ?.focus()
      }}
    />
  )
}

const inputGroupButtonVariants = cva(
  "gap-2 rounded-full text-sm flex items-center shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-full px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-full px-2.5 has-[>svg]:px-2.5",
        "icon-xs": "size-6 rounded-full p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
        icon: "size-9 rounded-full p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset"
  }) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-base text-muted-foreground group-data-[size=lg]/input-group:text-[17px] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "size">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn("rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 focus-visible:outline-none disabled:bg-transparent aria-invalid:border-0 aria-invalid:ring-0 aria-invalid:bg-transparent dark:aria-invalid:bg-transparent dark:bg-transparent group-data-[size=lg]/input-group:px-4 group-data-[size=lg]/input-group:text-[17px] flex-1", className)}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn("rounded-none border-0 bg-transparent py-2.5 shadow-none ring-0 focus-visible:ring-0 focus-visible:outline-none disabled:bg-transparent aria-invalid:border-0 aria-invalid:ring-0 aria-invalid:bg-transparent dark:aria-invalid:bg-transparent dark:bg-transparent group-data-[size=lg]/input-group:px-4 group-data-[size=lg]/input-group:py-3.5 group-data-[size=lg]/input-group:text-[17px] flex-1 resize-none", className)}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
}
