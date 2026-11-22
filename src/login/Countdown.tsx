import NumberFlow from "@number-flow/react"

const TWO_DIGITS = { minimumIntegerDigits: 2 } as const

export const TIME_SLOT = "__TIME__"

export function Countdown({ seconds }: { seconds: number }) {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  return (
    <span className="inline-flex items-center tabular-nums">
      <NumberFlow value={minutes} format={TWO_DIGITS} />
      <span className="mx-px">:</span>
      <NumberFlow value={secs} format={TWO_DIGITS} />
    </span>
  )
}

export function TimeRemaining({
  template,
  seconds,
}: {
  template: string
  seconds: number
}) {
  const [before, after] = template.split(TIME_SLOT)

  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      {before}
      <Countdown seconds={seconds} />
      {after}
    </span>
  )
}
