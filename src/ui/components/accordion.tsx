"use client"

import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react"
import { cva, type VariantProps } from "class-variance-authority"
import { Accordion as AccordionPrimitive } from "radix-ui"
import type * as React from "react"
import { cn } from "@ui/lib/utils"

const accordionVariants = cva("flex w-full flex-col", {
  variants: {
    variant: {
      default: "",
      filled: "overflow-hidden rounded-2xl bg-muted",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function Accordion({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root> &
  VariantProps<typeof accordionVariants>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(accordionVariants({ variant }), className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("ms-4 not-first:border-t", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "relative min-h-11 cursor-pointer items-center gap-6 py-2.75 ps-0 pe-4 text-start text-base after:absolute after:-inset-s-2 after:inset-e-2 after:top-2 after:h-[calc(100%-1rem)] after:rounded-md hover:underline focus-visible:after:ring-3 focus-visible:after:ring-ring/50 group/accordion-trigger flex flex-1 justify-between outline-none disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
        <CaretDownIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        />
        <CaretUpIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="text-sm text-muted-foreground data-open:animate-accordion-down data-closed:animate-accordion-up overflow-hidden"
      {...props}
    >
      <div
        className={cn(
          "pe-10 pb-3 [&_a]:underline [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
