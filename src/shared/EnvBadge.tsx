import { cn } from "@ui/lib/utils";

const ENVIRONMENTS: Record<string, { label: string; className: string }> = {
    dev: { label: "DEV", className: "bg-[#5e5ce6]" },
    test: { label: "TEST", className: "bg-[#ff9500]" }
};

export function EnvBadge({ environment, className }: { environment?: string; className?: string }) {
    const config = environment ? ENVIRONMENTS[environment] : undefined;
    if (!config) return null;
    return (
        <span
            className={cn(
                "pointer-events-none inline-flex h-5.25 items-center rounded-full px-2.5 text-[10px] font-semibold tracking-[0.02em] text-white shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_0.5px_0_rgba(255,255,255,0.28)] select-none",
                config.className,
                className
            )}
        >
            {config.label}
        </span>
    );
}
