"use client"

import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import * as React from "react"
import { useModifierKey } from "@ui/hooks/use-platform"
import { cn } from "@ui/lib/utils"

const DropdownMenuGroupContext = React.createContext<
  ((id: string | undefined) => void) | undefined
>(undefined)

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className={cn(
          "min-w-48 rounded-xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 overflow-x-hidden overflow-y-auto outline-none data-closed:overflow-hidden z-50 max-h-(--radix-dropdown-menu-content-available-height) w-(--radix-dropdown-menu-trigger-width) origin-(--radix-dropdown-menu-content-transform-origin)",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  const [labelId, setLabelId] = React.useState<string>()

  return (
    <DropdownMenuGroupContext.Provider value={setLabelId}>
      <DropdownMenuPrimitive.Group
        data-slot="dropdown-menu-group"
        aria-labelledby={labelId}
        {...props}
      />
    </DropdownMenuGroupContext.Provider>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  id,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  const generatedId = React.useId()
  const labelId = id ?? generatedId
  const setLabelId = React.useContext(DropdownMenuGroupContext)

  React.useLayoutEffect(() => {
    setLabelId?.(labelId)
    return () => setLabelId?.(undefined)
  }, [labelId, setLabelId])

  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      id={labelId}
      data-inset={inset ? "" : undefined}
      className={cn("px-3 py-2.5 text-xs font-semibold text-muted-foreground data-inset:ps-9.5", className)}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  disabled,
  onClick,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset ? "" : undefined}
      data-variant={variant}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "gap-2.5 rounded-md px-3 py-2 text-base focus:bg-accent focus:text-accent-foreground data-inset:ps-9.5 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive group/dropdown-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 data-disabled:opacity-50 not-data-[variant=destructive]:focus:**:text-accent-foreground [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset ? "" : undefined}
      className={cn(
        "gap-2 rounded-md px-3 py-2 text-base focus:bg-accent focus:text-accent-foreground data-inset:ps-9.5 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 not-data-[variant=destructive]:focus:**:text-accent-foreground [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <CaretRightIcon className="rtl:rotate-180 ms-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  alignOffset = -3,
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        data-slot="dropdown-menu-sub-content"
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          "max-h-(--radix-dropdown-menu-content-available-height) min-w-36 rounded-xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95 w-auto overflow-x-hidden overflow-y-auto z-50 origin-(--radix-dropdown-menu-content-transform-origin)",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  defaultChecked,
  onCheckedChange,
  inset,
  closeOnClick = false,
  disabled,
  onClick,
  onSelect,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
  inset?: boolean
  closeOnClick?: boolean
  defaultChecked?: boolean
}) {
  const [uncontrolled, setUncontrolled] = React.useState(
    defaultChecked ?? false
  )

  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset ? "" : undefined}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onSelect={(event) => {
        onSelect?.(event)
        if (!closeOnClick) event.preventDefault()
      }}
      className={cn(
        "gap-2.5 rounded-md py-2 pe-8 ps-3 text-base focus:bg-accent focus:text-accent-foreground data-inset:ps-9.5 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 data-disabled:opacity-50 focus:**:text-accent-foreground [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked ?? uncontrolled}
      onCheckedChange={(next) => {
        setUncontrolled(next)
        onCheckedChange?.(next)
      }}
      {...props}
    >
      <span
        className="absolute inset-e-2 flex items-center justify-center pointer-events-none"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup> & {
  defaultValue?: string
}) {
  const [labelId, setLabelId] = React.useState<string>()
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)

  return (
    <DropdownMenuGroupContext.Provider value={setLabelId}>
      <DropdownMenuPrimitive.RadioGroup
        data-slot="dropdown-menu-radio-group"
        aria-labelledby={labelId}
        value={value ?? uncontrolled}
        onValueChange={(next) => {
          setUncontrolled(next)
          onValueChange?.(next)
        }}
        {...props}
      />
    </DropdownMenuGroupContext.Provider>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  closeOnClick = false,
  disabled,
  onClick,
  onSelect,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  inset?: boolean
  closeOnClick?: boolean
}) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset ? "" : undefined}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onSelect={(event) => {
        onSelect?.(event)
        if (!closeOnClick) event.preventDefault()
      }}
      className={cn(
        "gap-2.5 rounded-md py-2 pe-8 ps-3 text-base focus:bg-accent focus:text-accent-foreground data-inset:ps-9.5 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 data-disabled:opacity-50 focus:**:text-accent-foreground [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        className="absolute inset-e-2 flex items-center justify-center pointer-events-none"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border/50", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  mod,
  children,
  ...props
}: React.ComponentProps<"span"> & { mod?: boolean }) {
  const modifier = useModifierKey(children != null)

  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("max-md:hidden ms-auto text-xs text-muted-foreground group-focus/dropdown-menu-item:text-foreground", className)}
      {...props}
    >
      {mod && modifier}
      {children}
    </span>
  )
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
}
