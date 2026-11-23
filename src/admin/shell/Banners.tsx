// @ts-nocheck
import { WarningIcon } from "@phosphor-icons/react";
import { useT } from "../ui/i18n";
import { useWhoAmI } from "./session";

export function Banners() {
    const t = useT();
    const { whoAmI } = useWhoAmI();

    if (!whoAmI?.temporary) return null;

    return (
        <div
            role="status"
            className="flex items-start gap-2 border-b border-[#f5d38a] bg-[#fff8e6] px-4 py-2.5 text-[13px] leading-snug text-[#7a4b00] sm:px-7 dark:border-[#5c4300] dark:bg-[#2b2100] dark:text-[#ffd60a]"
        >
            <WarningIcon weight="fill" className="mt-px size-4 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{t("sxShellTempAdminBanner")}</span>
        </div>
    );
}
