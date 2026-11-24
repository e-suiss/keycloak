import type { PropsWithChildren } from "react";

export function DelayedReveal({ delay = 400, children }: PropsWithChildren<{ delay?: number }>) {
    return <div style={{ animation: `sx-reveal 180ms ease-out ${delay}ms both` }}>{children}</div>;
}
