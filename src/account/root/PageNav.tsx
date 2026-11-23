// @ts-nocheck

import { cn } from "@ui/lib/utils";
import { type MouseEvent as ReactMouseEvent, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { matchPath, useHref, useLinkClickHandler, useLocation } from "react-router-dom";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import type { AccountEnvironment, Feature } from "..";
import fetchContentJson from "../content/fetchContent";
import type { TFuncKey } from "../i18n-type";
import { usePromise } from "../utils/usePromise";
import { NavIcon } from "./NavIcon";
import { HAIRLINE, useNavDrawer } from "./Shell";

export type RootMenuItem = {
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

export function NavBrand() {
    const { t } = useTranslation();
    return (
        <div
            data-testid="page-header"
            className={`-mx-3 mb-3.5 flex h-12 shrink-0 items-center gap-2 sm:h-15 border-b px-5.5 ${HAIRLINE}`}
        >
            <span aria-hidden className="size-5.5 shrink-0 rounded-full bg-muted-foreground" />
            <span className="text-base font-semibold">{t("consoleBrand")}</span>
            <span className="text-xs text-muted-foreground">{t("consoleBrandSuffix")}</span>
        </div>
    );
}

export function NavSections({
    menuItems,
    features,
    renderLeaf
}: {
    menuItems: MenuItem[] | undefined;
    features: Feature;
    renderLeaf: (leaf: RootMenuItem) => ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <nav aria-label={t("openMenu")}>
            {buildSections(menuItems, features).map((section, i) => (
                <div key={i} className={i > 0 && !section.label ? "pt-3" : undefined}>
                    {section.label && (
                        <div className="px-2.5 pt-4.5 pb-1.5 text-xs text-muted-foreground">
                            {t(section.label)}
                        </div>
                    )}
                    <ul>{section.items.map(leaf => renderLeaf(leaf))}</ul>
                </div>
            ))}
        </nav>
    );
}

export function navLinkClass(isActive: boolean) {
    return cn(
        "mt-0.5 flex h-8.5 items-center gap-2.5 rounded-lg px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
        isActive
            ? "bg-[#e5e5ea] font-medium dark:bg-[#2c2c2e]"
            : "hover:bg-[#e5e5ea]/60 dark:hover:bg-[#2c2c2e]/60"
    );
}

export function NavLinkContent({ icon, label, isActive }: { icon: string; label: ReactNode; isActive: boolean }) {
    return (
        <>
            <NavIcon
                name={icon}
                className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")}
            />
            <span className="flex-1 truncate">{label}</span>
        </>
    );
}

export const PageNav = () => {
    const { t } = useTranslation();
    const { environment } = useEnvironment<AccountEnvironment>();
    const menuItems = useMenuItems();

    return (
        <>
            <NavBrand />
            <NavSections
                menuItems={menuItems}
                features={environment.features}
                renderLeaf={leaf => (
                    <NavLeaf
                        key={leaf.label as string}
                        path={leaf.path}
                        icon={leaf.label as string}
                        label={t(leaf.label)}
                    />
                )}
            />
        </>
    );
};

/** Group consecutive loose leaves together so every section has the same rhythm. */
export function buildSections(menuItems: MenuItem[] | undefined, features: Feature) {
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
    const { setOpen } = useNavDrawer();
    const fullPath = getFullUrl(path, environment.baseUrl);
    const isActive = !!matchPath(fullPath, pathname);
    const menuItemPath = fullPath + location.search;
    const href = useHref(menuItemPath);
    const handleClick = useLinkClickHandler(menuItemPath);

    return (
        <li>
            <a
                data-testid={path}
                href={href}
                aria-current={isActive ? "page" : undefined}
                onClick={event => {
                    handleClick(event as unknown as ReactMouseEvent<HTMLAnchorElement>);
                    setOpen(false);
                }}
                className={navLinkClass(isActive)}
            >
                <NavLinkContent icon={icon} label={label} isActive={isActive} />
            </a>
        </li>
    );
};
