// @ts-nocheck
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useEnvironment } from "../../shared/keycloak-ui-shared";
import type { AccountEnvironment } from "..";

function initials(name: string) {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0]?.toUpperCase())
            .join("") || "?"
    );
}

export function AccountMenu() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { environment, keycloak } = useEnvironment<AccountEnvironment>();

    const user = keycloak?.idTokenParsed as
        | { name?: string; preferred_username?: string; email?: string }
        | undefined;
    const name = user?.name || user?.preferred_username || user?.email || "—";
    const email = user?.email || "";
    const referrer = environment.referrerUrl?.replace("_hash_", "#") || undefined;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={name}
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-[#6e6e73] text-[11px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:size-7.5 sm:text-xs dark:bg-[#48484a]"
                >
                    {initials(name)}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-60 rounded-xl border border-[#e5e5ea] bg-background p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.18)] ring-0 dark:border-[#38383a] dark:bg-[#1c1c1e]"
            >
                <DropdownMenuLabel className="block px-2.5 pt-2.5 pb-2 font-normal">
                    <span className="block truncate text-[15px] font-semibold text-foreground">
                        {name}
                    </span>
                    {email && (
                        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                            {email}
                        </span>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="mx-0 my-1 bg-[#e5e5ea] dark:bg-[#38383a]" />
                <DropdownMenuItem
                    className="rounded-lg p-2.5 text-sm"
                    onSelect={() => navigate(new URL(environment.baseUrl).pathname + location.search)}
                >
                    {t("personalInfo")}
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="rounded-lg p-2.5 text-sm text-[#d70015] focus:text-[#d70015] dark:text-[#ff453a] dark:focus:text-[#ff453a]"
                    onSelect={() => keycloak.logout({ redirectUri: referrer })}
                >
                    {t("signOut")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
