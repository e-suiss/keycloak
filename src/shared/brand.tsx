import type { CSSProperties, PropsWithChildren } from "react";
import { cn } from "@ui/lib/utils";

export const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.4 -0.2"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>'
)}")`;

export const BRAND_GRADIENT =
    "bg-[#dbba95] bg-[radial-gradient(circle_at_18%_22%,#ff5005_0%,#dbba95_48%,#d0bce1_100%)] bg-no-repeat";

const FOCAL_POINTS = ["18% 22%", "78% 20%", "24% 80%", "82% 76%", "50% 12%", "12% 50%", "88% 48%", "50% 88%"];

function hashOf(value: string) {
    let hash = 0;
    for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return Math.abs(hash);
}

export function Grain({ className, style }: { className?: string; style?: CSSProperties }) {
    return (
        <span
            aria-hidden
            className={cn("pointer-events-none absolute inset-0 -z-10 opacity-45 mix-blend-overlay", className)}
            style={{ backgroundImage: GRAIN, ...style }}
        />
    );
}

export function GrainAvatar({ seed, className, children }: PropsWithChildren<{ seed: string; className?: string }>) {
    const focal = FOCAL_POINTS[hashOf(seed) % FOCAL_POINTS.length];
    return (
        <span
            className={cn(
                "relative isolate grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]",
                className
            )}
            style={{ background: `radial-gradient(circle at ${focal}, #ff5005 0%, #dbba95 62%, #d0bce1 100%)` }}
        >
            <Grain />
            {children}
        </span>
    );
}

export function RealmOrb({ name, className }: { name?: string; className?: string }) {
    let hash = 0;
    for (const char of name || "") hash = (hash * 31 + char.charCodeAt(0)) | 0;
    const hue = Math.abs(hash) % 360;
    const shift = (delta: number) => (hue + delta + 360) % 360;
    return (
        <span
            aria-hidden
            className={cn(
                "size-4.5 shrink-0 rounded-full shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.15)]",
                className
            )}
            style={{
                background: [
                    `radial-gradient(circle at 30% 25%, hsl(${shift(50)} 100% 88% / 0.95) 0%, transparent 45%)`,
                    `radial-gradient(circle at 80% 85%, hsl(${shift(-40)} 90% 45%) 0%, transparent 60%)`,
                    `conic-gradient(from 210deg at 50% 50%, hsl(${hue} 90% 62%), hsl(${shift(60)} 90% 64%), hsl(${shift(-30)} 85% 58%), hsl(${hue} 90% 62%))`
                ].join(", ")
            }}
        />
    );
}
