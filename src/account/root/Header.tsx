// @ts-nocheck

import { Separator } from "@ui/components/separator";
import { SidebarTrigger } from "@ui/components/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { matchPath, useHref, useLinkClickHandler, useLocation } from "react-router-dom";
import { useEnvironment } from "../../shared/keycloak-ui-shared";

import type { AccountEnvironment } from "..";
import { AccountMenu } from "./AccountMenu";
import { NavIcon } from "./NavIcon";
import { flattenLeaves, useMenuItems, usePageTitle } from "./PageNav";

export const Header = () => {
    const { environment } = useEnvironment<AccountEnvironment>();
    const { pathname } = useLocation();
    const menuItems = useMenuItems();
    const title = usePageTitle(menuItems);
    const leaves = flattenLeaves(menuItems, environment.features);
    const base = new URL(environment.baseUrl).pathname;
    const active = leaves.find(item => matchPath(`${base}${item.path}`, pathname))?.path ?? "";

    return (
        <header className="sticky top-0 z-40 bg-background">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
                <div className="flex min-w-0 items-center gap-2">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
                </div>
                <AccountMenu />
            </div>

            <Tabs value={active} className="px-5 pb-3 md:hidden">
                <TabsList>
                    {leaves.map(item => (
                        <NavTab key={item.path} item={item} />
                    ))}
                </TabsList>
            </Tabs>
            <Separator />
        </header>
    );
};

function NavTab({ item }: { item: { label: string; path: string } }) {
    const { t } = useTranslation();
    const { environment } = useEnvironment<AccountEnvironment>();
    const fullPath = `${new URL(environment.baseUrl).pathname}${item.path}`;
    const href = useHref(fullPath + location.search);
    const handleClick = useLinkClickHandler(fullPath + location.search);

    return (
        <TabsTrigger value={item.path} asChild>
            <a
                href={href}
                onClick={event => handleClick(event as unknown as ReactMouseEvent<HTMLAnchorElement>)}
            >
                <NavIcon name={item.label} className="size-4" />
                {t(item.label)}
            </a>
        </TabsTrigger>
    );
}
