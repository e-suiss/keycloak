// @ts-nocheck

import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib/utils";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useT } from "./i18n";

export const GROUP =
    "w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] text-left dark:border-[#38383a] dark:bg-[#1c1c1e]";
export const SEPARATOR = "ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]";

export function AdminPage({
    title,
    description,
    actions,
    back,
    children,
    width = "default"
}: {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    back?: { label: string; to: string };
    children: ReactNode;
    width?: "narrow" | "default" | "wide";
}) {
    return (
        <div className="flex justify-center px-5 pt-6 pb-12 sm:px-10 sm:pt-12">
            <div
                className={cn(
                    "w-full",
                    width === "narrow" ? "max-w-110" : width === "wide" ? "max-w-[1040px]" : "max-w-[880px]"
                )}
            >
                {back && (
                    <Link
                        to={back.to}
                        className="mb-3 inline-flex items-center gap-1 rounded-md text-[15px] font-medium text-primary outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <CaretLeftIcon className="size-3.5" />
                        {back.label}
                    </Link>
                )}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1
                            data-testid="page-heading"
                            className="text-[28px] font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]"
                        >
                            {title}
                        </h1>
                        {description && (
                            <p className="mt-2 text-base leading-[1.45] text-muted-foreground">{description}</p>
                        )}
                    </div>
                    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
                </div>
                <div className="mt-7 flex flex-col gap-6">{children}</div>
            </div>
        </div>
    );
}

export function Section({
    label,
    action,
    children,
    className
}: {
    label?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={className}>
            {(label || action) && (
                <div className="mb-2 flex min-h-6 items-center justify-between gap-3 px-0.5">
                    <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

export function Group({ children, className }: { children: ReactNode; className?: string }) {
    const items = Children.toArray(children).filter(Boolean);
    return (
        <ul className={cn(GROUP, className)}>
            {items.map((child, index) => (
                <Fragment key={isValidElement(child) && child.key != null ? child.key : index}>
                    {index > 0 && <li aria-hidden className={SEPARATOR} />}
                    {child}
                </Fragment>
            ))}
        </ul>
    );
}

export function Row({
    title,
    subtitle,
    leading,
    trailing,
    onClick,
    className,
    testId
}: {
    title: ReactNode;
    subtitle?: ReactNode;
    leading?: ReactNode;
    trailing?: ReactNode;
    onClick?: () => void;
    className?: string;
    testId?: string;
}) {
    const content = (
        <>
            <div className="flex min-w-0 items-center gap-3">
                {leading && <span className="grid size-10 shrink-0 place-items-center">{leading}</span>}
                <div className="min-w-0">
                    <div className="truncate text-base font-medium">{title}</div>
                    {subtitle && (
                        <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{subtitle}</div>
                    )}
                </div>
            </div>
            {(trailing || onClick) && (
                <div className="flex shrink-0 items-center gap-3">
                    {trailing}
                    {onClick && <CaretRightIcon className="size-3.5 text-[#c7c7cc] dark:text-[#48484a]" />}
                </div>
            )}
        </>
    );
    const base = "flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left";
    return (
        <li data-testid={testId}>
            {onClick ? (
                <button
                    type="button"
                    onClick={onClick}
                    className={cn(
                        base,
                        "outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6",
                        className
                    )}
                >
                    {content}
                </button>
            ) : (
                <div className={cn(base, className)}>{content}</div>
            )}
        </li>
    );
}

export function Chip({ tone = "neutral", children }: { tone?: "neutral" | "success" | "danger" | "warning" | "info"; children: ReactNode }) {
    return (
        <span
            className={cn(
                "inline-flex h-6.5 shrink-0 items-center rounded-full border px-2.5 text-[13px] font-medium whitespace-nowrap",
                tone === "success" && "border-[#248a3d] text-[#248a3d] dark:border-[#32d74b] dark:text-[#32d74b]",
                tone === "danger" && "border-[#d70015] text-[#d70015] dark:border-[#ff453a] dark:text-[#ff453a]",
                tone === "warning" && "border-[#b25000] text-[#b25000] dark:border-[#ff9f0a] dark:text-[#ff9f0a]",
                tone === "info" && "border-primary text-primary",
                tone === "neutral" && "border-[#d2d2d7] text-foreground dark:border-[#48484a]"
            )}
        >
            {children}
        </span>
    );
}

export function TextAction({
    children,
    onClick,
    tone = "primary",
    disabled,
    ...rest
}: {
    children: ReactNode;
    onClick?: () => void;
    tone?: "primary" | "danger";
    disabled?: boolean;
    [key: string]: any;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            {...rest}
            className={cn(
                "shrink-0 rounded-md text-[15px] font-medium outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40",
                tone === "danger" ? "text-[#d70015] dark:text-[#ff453a]" : "text-primary",
                rest.className
            )}
        >
            {children}
        </button>
    );
}

export function Notice({
    title,
    description,
    onRetry,
    action
}: {
    title: ReactNode;
    description?: ReactNode;
    onRetry?: () => void;
    action?: ReactNode;
}) {
    const t = useT();
    return (
        <div className={GROUP}>
            <div className="px-4 py-6 text-center">
                <div className="text-base font-semibold">{title}</div>
                {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
                {onRetry && (
                    <Button size="sm" className="mt-3.5 h-8.5 px-4 font-medium" onClick={onRetry}>
                        {t("sxRetry")}
                    </Button>
                )}
                {action && <div className="mt-3.5 flex justify-center">{action}</div>}
            </div>
        </div>
    );
}

function Bar({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return <div aria-hidden style={style} className={cn("animate-pulse rounded-md bg-[#e5e5ea] dark:bg-[#2c2c2e]", className)} />;
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
    const widths = [
        ["40%", "60%"],
        ["34%", "50%"],
        ["46%", "56%"],
        ["38%", "52%"]
    ];
    return (
        <div aria-busy="true" className={GROUP}>
            {Array.from({ length: rows }, (_, index) => {
                const [title, detail] = widths[index % widths.length];
                return (
                    <Fragment key={index}>
                        {index > 0 && <div className={SEPARATOR} />}
                        <div className="flex flex-col gap-2 p-4">
                            <Bar className="h-3.5" style={{ width: title }} />
                            <Bar className="h-2.5" style={{ width: detail }} />
                        </div>
                    </Fragment>
                );
            })}
        </div>
    );
}

export function SearchField({
    value,
    onChange,
    placeholder,
    onEnter,
    className
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    onEnter?: () => void;
    className?: string;
}) {
    return (
        <div className={cn("relative w-full", className)}>
            <MagnifyingGlassIcon className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                size="lg"
                type="search"
                aria-label={placeholder}
                placeholder={placeholder}
                value={value}
                onChange={event => onChange(event.target.value)}
                onKeyDown={event => {
                    if (event.key === "Enter") onEnter?.();
                }}
                className="data-[size=lg]:ps-10.5 data-[size=lg]:text-base"
            />
        </div>
    );
}

export function SegmentTabs<T extends string>({
    value,
    onChange,
    items,
    ariaLabel
}: {
    value: T;
    onChange: (value: T) => void;
    items: { value: T; label: ReactNode }[];
    ariaLabel?: string;
}) {
    return (
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0 [scrollbar-width:none]">
            <div
                role="tablist"
                aria-label={ariaLabel}
                className="inline-flex gap-1 rounded-xl bg-[#e5e5ea] p-1 dark:bg-[#1c1c1e]"
            >
                {items.map(item => {
                    const selected = item.value === value;
                    return (
                        <button
                            key={item.value}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => onChange(item.value)}
                            className={cn(
                                "rounded-[9px] px-3.5 py-1.5 text-sm whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                                selected
                                    ? "bg-white font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#3a3a3c]"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function Pager({
    page,
    hasPrev,
    hasNext,
    onPrev,
    onNext
}: {
    page: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
}) {
    const t = useT();
    if (!hasPrev && !hasNext) return null;
    return (
        <div className="flex items-center justify-center gap-5 pt-1">
            <TextAction disabled={!hasPrev} onClick={onPrev}>
                {t("sxPrevious")}
            </TextAction>
            <span className="text-sm text-muted-foreground tabular-nums">{t("sxPageN", { page })}</span>
            <TextAction disabled={!hasNext} onClick={onNext}>
                {t("sxNext")}
            </TextAction>
        </div>
    );
}

export function PageSkeleton() {
    return (
        <div aria-busy="true" className="flex justify-center px-5 pt-6 pb-12 sm:px-10 sm:pt-12">
            <div className="w-full max-w-[880px]">
                <Bar className="h-7 w-48" />
                <Bar className="mt-3 h-4 w-80 max-w-full" />
                <div className="mt-7 flex flex-col gap-6">
                    <Bar className="h-13.5 w-full rounded-xl" />
                    <div>
                        <Bar className="mb-2 ms-0.5 h-3 w-24" />
                        <ListSkeleton rows={4} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function AppSkeleton() {
    const sections = [6, 4, 6, 2];
    return (
        <div className="min-h-svh bg-background">
            <div className="mx-auto flex min-h-svh w-full max-w-[1248px]">
                <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-e border-[#e5e5ea] px-3 pb-5 sm:flex dark:border-[#38383a]">
                    <div className="-mx-3 mb-3.5 flex h-15 shrink-0 items-center gap-2 border-b border-[#e5e5ea] px-5.5 dark:border-[#38383a]">
                        <span className="size-5.5 shrink-0 rounded-full bg-muted-foreground" />
                        <Bar className="h-3.5 w-24" />
                    </div>
                    {sections.map((count, section) => (
                        <div key={section} className="pt-4.5">
                            <Bar className="mx-2.5 mb-2.5 h-2.5 w-14" />
                            {Array.from({ length: count }, (_, index) => (
                                <div key={index} className="flex h-8.5 items-center gap-2.5 px-2.5">
                                    <Bar className="size-4 rounded" />
                                    <Bar className="h-3" style={{ width: `${50 + ((index * 17) % 35)}%` }} />
                                </div>
                            ))}
                        </div>
                    ))}
                </aside>
                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between border-b border-[#e5e5ea] bg-background px-4 sm:h-15 sm:px-7 dark:border-[#38383a]">
                        <Bar className="size-6 sm:hidden" />
                        <Bar className="h-4 w-32" />
                        <Bar className="size-7 rounded-full sm:size-7.5" />
                    </header>
                    <main className="flex-1">
                        <PageSkeleton />
                    </main>
                </div>
            </div>
        </div>
    );
}
