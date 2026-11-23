// @ts-nocheck

import { SidebarSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@ui/lib/utils";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { matchPath } from "react-router-dom";

import { content } from "../assets/content";
import { environment } from "../environment";
import { flattenLeaves, NavBrand, pageTitleKey, NavLinkContent, NavSections, navLinkClass } from "./PageNav";
import { HAIRLINE, Shell } from "./Shell";

export function Bar({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <div
            aria-hidden
            style={style}
            className={cn("animate-pulse rounded-md bg-[#e5e5ea] dark:bg-[#2c2c2e]", className)}
        />
    );
}

function PageFrame({ children }: { children?: React.ReactNode }) {
    return (
        <div
            aria-busy="true"
            className="flex justify-center px-7.5 pt-6 pb-10 sm:px-10 sm:py-14"
        >
            <div className="flex w-full max-w-110 flex-col items-center">
                <Bar className="mt-8 h-7 w-44" />
                <Bar className="mt-3.5 h-4 w-64 max-w-full" />
                <div className="mt-8.5 w-full">{children}</div>
            </div>
        </div>
    );
}

export function PageSkeleton() {
    const rows = [
        ["55%", "30%"],
        ["40%", "26%"],
        ["48%", "34%"]
    ];
    return (
        <PageFrame>
            <Bar className="ms-0.5 h-3 w-20" />
            <div className="mt-2 overflow-hidden rounded-xl bg-[#f5f5f7] dark:bg-[#1c1c1e]">
                {rows.map(([title, date], index) => (
                    <Fragment key={index}>
                        {index > 0 && <div className="ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]" />}
                        <div className="flex min-h-16 flex-col justify-center gap-2 px-4 py-3.5">
                            <Bar className="h-3.5" style={{ width: title }} />
                            <Bar className="h-2.5" style={{ width: date }} />
                        </div>
                    </Fragment>
                ))}
            </div>
        </PageFrame>
    );
}

export function MethodsSkeleton() {
    const widths = ["38%", "50%", "34%"];
    return (
        <div
            aria-busy="true"
            className="w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] dark:border-[#38383a] dark:bg-[#1c1c1e]"
        >
            {widths.map((width, index) => (
                <Fragment key={index}>
                    {index > 0 && <div className="ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]" />}
                    <div className="flex h-13 items-center justify-between px-4">
                        <Bar className="h-3" style={{ width }} />
                        <Bar className="h-2.5 w-[14%]" />
                    </div>
                </Fragment>
            ))}
        </div>
    );
}

export function SessionsSkeleton() {
    const rows = [
        ["48%", "70%"],
        ["40%", "55%"]
    ];
    return (
        <div
            aria-busy="true"
            className="w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] dark:border-[#38383a] dark:bg-[#1c1c1e]"
        >
            {rows.map(([title, detail], index) => (
                <Fragment key={index}>
                    {index > 0 && <div className="ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]" />}
                    <div className="flex flex-col gap-2 p-4">
                        <Bar className="h-3.5" style={{ width: title }} />
                        <Bar className="h-2.5" style={{ width: detail }} />
                    </div>
                </Fragment>
            ))}
        </div>
    );
}

export function ListSkeleton() {
    const rows = [
        ["40%", "60%"],
        ["34%", "50%"]
    ];
    return (
        <div
            aria-busy="true"
            className="w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] dark:border-[#38383a] dark:bg-[#1c1c1e]"
        >
            {rows.map(([title, detail], index) => (
                <Fragment key={index}>
                    {index > 0 && <div className="ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]" />}
                    <div className="flex flex-col gap-2 p-4">
                        <Bar className="h-3.5" style={{ width: title }} />
                        <Bar className="h-2.5" style={{ width: detail }} />
                    </div>
                </Fragment>
            ))}
        </div>
    );
}

export function FormSkeleton({ fields = 8 }: { fields?: number }) {
    return (
        <PageFrame>
            <div className="flex flex-col gap-4">
                {Array.from({ length: fields }, (_, index) => (
                    <div key={index} className="flex flex-col gap-2">
                        <Bar className="ms-0.5 h-3 w-24" />
                        <div className="h-13.5 rounded-xl border border-border bg-background dark:bg-foreground/6" />
                    </div>
                ))}
            </div>
            <Bar className="mt-7 h-12.5 rounded-xl" />
        </PageFrame>
    );
}

function activeLeaf() {
    const base = new URL(environment.baseUrl).pathname;
    const leaves = flattenLeaves(content, environment.features);
    return leaves.find(leaf => !!matchPath(`${base}${leaf.path}`, window.location.pathname)) ?? leaves[0];
}

export function RouteSkeleton() {
    const path = activeLeaf()?.path;
    if (path === "") return <FormSkeleton />;
    if (path === "account-security/signing-in")
        return (
            <PageFrame>
                <MethodsSkeleton />
            </PageFrame>
        );
    if (path === "account-security/device-activity")
        return (
            <PageFrame>
                <SessionsSkeleton />
            </PageFrame>
        );
    if (["account-security/linked-accounts", "applications", "groups"].includes(path))
        return (
            <PageFrame>
                <ListSkeleton />
            </PageFrame>
        );
    return <PageSkeleton />;
}

export function AccountSkeleton() {
    const { t } = useTranslation();
    const base = new URL(environment.baseUrl).pathname;
    const isActive = (path: string) => !!matchPath(`${base}${path}`, window.location.pathname);
    const active = activeLeaf();

    return (
        <Shell
            menuLabel={t("openMenu")}
            sidebar={
                <>
                    <NavBrand />
                    <NavSections
                        menuItems={content}
                        features={environment.features}
                        renderLeaf={leaf => (
                            <li key={leaf.label}>
                                <a
                                    href={`${base}${leaf.path}`}
                                    aria-current={isActive(leaf.path) ? "page" : undefined}
                                    className={navLinkClass(isActive(leaf.path))}
                                >
                                    <NavLinkContent
                                        icon={leaf.label}
                                        label={t(leaf.label)}
                                        isActive={isActive(leaf.path)}
                                    />
                                </a>
                            </li>
                        )}
                    />
                </>
            }
            header={
                <header
                    className={`sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between border-b bg-background px-4 sm:h-15 sm:px-7 ${HAIRLINE}`}
                >
                    <span className="grid size-7 place-items-center sm:hidden">
                        <SidebarSimpleIcon className="size-5 text-muted-foreground" />
                    </span>
                    <span className="pointer-events-none absolute inset-x-14 truncate text-center text-base font-semibold sm:static sm:text-left sm:text-lg">
                        {active ? t(pageTitleKey(active.label)) : ""}
                    </span>
                    <Bar className="size-7 rounded-full sm:size-7.5" />
                </header>
            }
        >
            <RouteSkeleton />
        </Shell>
    );
}
