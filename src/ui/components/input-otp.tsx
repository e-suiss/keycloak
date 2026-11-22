"use client"

import { MinusIcon } from "@phosphor-icons/react"
import { OTPInput, OTPInputContext } from "input-otp"
import * as React from "react"
import { cn } from "@ui/lib/utils"

function InputOTP({
  className,
  containerClassName,
  value,
  defaultValue,
  onChange,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue === undefined ? "" : String(defaultValue)
  )

  return (
    <OTPInput
      data-slot="input-otp"
      value={value ?? uncontrolledValue}
      onChange={(next: string) => {
        if (value === undefined) setUncontrolledValue(next)
        onChange?.(next)
      }}
      containerClassName={cn(
        "flex items-center [direction:ltr] rtl:justify-end",
        containerClassName
      )}
      spellCheck={false}
      className={cn(
        "disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("gap-2 flex items-center", className)}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "h-13 w-11 rounded-xl border border-border bg-background dark:bg-foreground/6 text-xl font-semibold tabular-nums transition-[color,box-shadow,background-color,border-color] outline-none aria-invalid:border-[1.5px] aria-invalid:border-destructive aria-invalid:data-[active=true]:border-destructive aria-invalid:data-[active=true]:ring-0 aria-invalid:bg-destructive/5 dark:aria-invalid:bg-destructive/10 in-[[data-input-otp-container]:has(input[aria-invalid=true])]:border-[1.5px] in-[[data-input-otp-container]:has(input[aria-invalid=true])]:border-destructive in-[[data-input-otp-container]:has(input[aria-invalid=true])]:data-[active=true]:border-destructive in-[[data-input-otp-container]:has(input[aria-invalid=true])]:data-[active=true]:ring-0 in-[[data-input-otp-container]:has(input[aria-invalid=true])]:bg-destructive/5 dark:in-[[data-input-otp-container]:has(input[aria-invalid=true])]:bg-destructive/10 data-[active=true]:border-ring data-[active=true]:ring-1 data-[active=true]:ring-ring in-[[data-input-otp-container]:has(input:disabled)]:opacity-50 relative flex items-center justify-center data-[active=true]:z-10",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-0.5 animate-caret-blink rounded-full bg-primary duration-1000" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      className="in-[[data-input-otp-container]:has(input:disabled)]:opacity-50 flex items-center [&_svg:not([class*='size-'])]:size-4"
      role="separator"
      {...props}
    >
      <MinusIcon />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot }
