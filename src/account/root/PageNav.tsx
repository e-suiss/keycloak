// @ts-nocheck

import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@ui/components/sidebar";
import { Badge } from "@ui/components/badge";
import { type MouseEvent as ReactMouseEvent, type ReactNode, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { matchPath, useHref, useLinkClickHandler, useLocation } from "react-router-dom";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import type { AccountEnvironment, Feature } from "..";
import fetchContentJson from "../content/fetchContent";
import type { TFuncKey } from "../i18n-type";
import { usePromise } from "../utils/usePromise";
import { NavIcon } from "./NavIcon";

type RootMenuItem = {
    id?: string;
    label: TFuncKey;
    path: string;
    isVisible?: keyof Feature;
    modulePath?: string;
};

type MenuItemWithChildren = {
    label: TFuncKey;
    children: MenuItem[];
    isVisible?: keyof Feature;
};

export type MenuItem = RootMenuItem | MenuItemWithChildren;

/** Shared loader so both the sidebar and the header read the same menu. */
export function useMenuItems() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>();
    const context = useEnvironment<AccountEnvironment>();
    usePromise(signal => fetchContentJson({ signal, context }), setMenuItems);
    return menuItems;
}

function isVisible(item: MenuItem, features: Feature) {
    return item.isVisible ? features[item.isVisible] : true;
}

/** Flatten the visible leaf items (used by the mobile pill nav). */
export function flattenLeaves(
    menuItems: MenuItem[] | undefined,
    features: Feature
): RootMenuItem[] {
    if (!menuItems) return [];
    return menuItems
        .filter(item => isVisible(item, features))
        .flatMap(item =>
            "path" in item ? [item] : flattenLeaves(item.children, features)
        );
}

function getFullUrl(path: string, baseUrl: string) {
    return `${new URL(baseUrl).pathname}${path}`;
}

function matchMenuItem(
    currentPath: string,
    menuItem: MenuItem,
    baseUrl: string
): boolean {
    if ("path" in menuItem) {
        return !!matchPath(getFullUrl(menuItem.path, baseUrl), currentPath);
    }
    return menuItem.children.some(child => matchMenuItem(currentPath, child, baseUrl));
}

/** Title of the active leaf — drives the header (desktop) and main heading (mobile). */
export function usePageTitle(menuItems: MenuItem[] | undefined) {
    const { t } = useTranslation();
    const { environment } = useEnvironment<AccountEnvironment>();
    const { pathname } = useLocation();
    const leaves = flattenLeaves(menuItems, environment.features);
    const active = leaves.find(item =>
        matchMenuItem(pathname, item, environment.baseUrl)
    );
    return t((active?.label ?? leaves[0]?.label ?? "personalInfo") as TFuncKey);
}

export const PageNav = () => {
    const { t } = useTranslation();
    const { environment } = useEnvironment<AccountEnvironment>();
    const menuItems = useMenuItems();

    return (
        <>
            <SidebarHeader>
                <a
                    href={
                        environment.referrerUrl?.replace("_hash_", "#") ||
                        environment.logoUrl ||
                        "/"
                    }
                    data-testid="page-header"
                    className="flex items-center gap-2 font-semibold"
                >
                    <BrandMark className="size-5" />
                    Wallet
                    <Badge variant="secondary">Hesap</Badge>
                </a>
                <span className="text-xs text-muted-foreground">Hesap Konsolu</span>
            </SidebarHeader>

            <SidebarContent>
                <Suspense
                    fallback={
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                            …
                        </div>
                    }
                >
                    {buildSections(menuItems, environment.features).map((section, i) => (
                        <SidebarGroup key={i}>
                            {section.label && (
                                <SidebarGroupLabel>{t(section.label)}</SidebarGroupLabel>
                            )}
                            <SidebarMenu>
                                {section.items.map(leaf => (
                                    <NavLeaf
                                        key={leaf.label as string}
                                        path={leaf.path}
                                        icon={leaf.label as string}
                                        label={t(leaf.label)}
                                    />
                                ))}
                            </SidebarMenu>
                        </SidebarGroup>
                    ))}
                </Suspense>
            </SidebarContent>
        </>
    );
};

/** Group consecutive loose leaves together so every section has the same rhythm. */
function buildSections(menuItems: MenuItem[] | undefined, features: Feature) {
    const sections: { label?: TFuncKey; items: RootMenuItem[] }[] = [];
    if (!menuItems) return sections;
    let leaves: RootMenuItem[] = [];
    const flush = () => {
        if (leaves.length) {
            sections.push({ items: leaves });
            leaves = [];
        }
    };
    for (const item of menuItems) {
        if (!isVisible(item, features)) continue;
        if ("path" in item) {
            leaves.push(item);
        } else {
            flush();
            sections.push({
                label: item.label,
                items: item.children.filter(c => isVisible(c, features)) as RootMenuItem[]
            });
        }
    }
    flush();
    return sections;
}

type NavLeafProps = {
    path: string;
    icon: string;
    label: ReactNode;
};

export const NavLeaf = ({ path, icon, label }: NavLeafProps) => {
    const { environment } = useEnvironment<AccountEnvironment>();
    const { pathname } = useLocation();
    const fullPath = getFullUrl(path, environment.baseUrl);
    const isActive = !!matchPath(fullPath, pathname);
    const menuItemPath = fullPath + location.search;
    const href = useHref(menuItemPath);
    const handleClick = useLinkClickHandler(menuItemPath);

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive}>
                <a
                    data-testid={path}
                    href={href}
                    onClick={event =>
                        handleClick(
                            event as unknown as ReactMouseEvent<HTMLAnchorElement>
                        )
                    }
                >
                    <NavIcon name={icon} active={isActive} />
                    <span className="flex-1 text-left">{label}</span>
                </a>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
};

function BrandMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
            <path d="M17 1.6c.1 1-.3 2-1 2.8-.7.8-1.8 1.4-2.8 1.3-.1-1 .4-2 1-2.7.8-.8 2-1.4 2.8-1.4ZM19.6 17c-.5 1.2-.8 1.8-1.5 2.9-1 1.5-2.3 3.4-4 3.4-1.5 0-1.9-1-3.9-1-2 0-2.4 1-3.9 1-1.7 0-3-1.7-3.9-3.2C-.1 16.9-.4 11.8 2 9.1c1.1-1.3 2.6-2 4-2 1.6 0 2.6 1 3.9 1 1.3 0 2-1 3.9-1 1.3 0 2.7.7 3.7 1.9-3.3 1.8-2.7 6.5.1 8Z" />
        </svg>
    );
}
