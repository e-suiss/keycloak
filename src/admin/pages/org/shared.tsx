// @ts-nocheck
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@ui/lib/utils";
import { ListSkeleton, Notice } from "../../ui/kit";
import { useT } from "../../ui/i18n";
import { initials } from "../../ui/util";

export function Monogram({ name }: { name: string }) {
    return (
        <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-[11px] font-semibold text-white dark:bg-[#48484a]">
            {initials(name || "?")}
        </span>
    );
}

export function FilterChips({ value, onChange, items, ariaLabel }: any) {
    return (
        <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
            {items.map((item: any) => {
                const selected = item.value === value;
                return (
                    <button
                        key={item.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(item.value)}
                        className={cn(
                            "inline-flex h-8 items-center rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                            selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-[#d2d2d7] text-foreground hover:bg-black/3 dark:border-[#48484a] dark:hover:bg-white/4"
                        )}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}

export function ListState({ status, count, onRetry, errorTitle, emptyTitle, emptyDescription, emptyAction, children }: any) {
    const t = useT();
    if (status === "loading") return <ListSkeleton />;
    if (status === "error")
        return <Notice title={errorTitle} description={t("sxLoadErrorDescription")} onRetry={onRetry} />;
    if (count === 0) return <Notice title={emptyTitle} description={emptyDescription} action={emptyAction} />;
    return <>{children}</>;
}

export function useDebounced(value: string, delay = 300) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setV(value.trim()), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return v;
}

export function Footnote({ children }: { children: ReactNode }) {
    return <p className="mt-2 px-0.5 text-[13px] leading-[1.4] text-muted-foreground">{children}</p>;
}
