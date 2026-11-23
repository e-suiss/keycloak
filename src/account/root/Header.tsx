// @ts-nocheck

import { SidebarSimpleIcon } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

import { AccountMenu } from "./AccountMenu";
import { useMenuItems, usePageTitle } from "./PageNav";
import { HAIRLINE, useNavDrawer } from "../../shared/shell/Shell";

export const Header = () => {
    const { t } = useTranslation();
    const menuItems = useMenuItems();
    const title = usePageTitle(menuItems);
    const { setOpen } = useNavDrawer();

    return (
        <header
            className={`sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between border-b bg-background px-4 sm:h-15 sm:px-7 ${HAIRLINE}`}
        >
            <button
                type="button"
                aria-label={t("openMenu")}
                onClick={() => setOpen(true)}
                className="grid size-7 place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:hidden"
            >
                <SidebarSimpleIcon className="size-5" />
            </button>
            <span className="pointer-events-none absolute inset-x-14 truncate text-center text-base font-semibold sm:static sm:text-left sm:text-lg">
                {title}
            </span>
            <AccountMenu />
        </header>
    );
};
