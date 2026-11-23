// @ts-nocheck
import { DotsThreeIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import {
    Confirm,
    ConfirmAction,
    ConfirmCancel,
    ConfirmContent,
    ConfirmDescription,
    ConfirmFooter,
    ConfirmHeader,
    ConfirmTitle
} from "@ui/patterns/confirm";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { environment } from "../environment";
import { notifyRealmsChanged, useRealmsVersion, useWhoAmI } from "../shell/session";
import { useT } from "../ui/i18n";
import { AdminPage, Chip, GROUP, ListSkeleton, Notice, SEPARATOR, SearchField, Section } from "../ui/kit";
import { useRealm } from "../ui/realm";

function realmLabel(r: any) {
    return r?.displayName && !/^\$\{.*\}$/.test(r.displayName) ? r.displayName : r?.realm;
}

export default function Realms() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const { whoAmI } = useWhoAmI();
    const version = useRealmsVersion();
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [realms, setRealms] = useState<any[]>([]);
    const [query, setQuery] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [pending, setPending] = useState<any | null>(null);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.realms
            .find({ briefRepresentation: true })
            .then(list => {
                if (!alive) return;
                const sorted = [...(Array.isArray(list) ? list : [])].sort((a, b) =>
                    (a.realm || "").localeCompare(b.realm || "")
                );
                setRealms(sorted);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, attempt, version]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return realms;
        return realms.filter(r => `${r.realm} ${r.displayName || ""}`.toLowerCase().includes(q));
    }, [realms, query]);

    const canCreate = !!whoAmI?.createRealm;
    const protectedRealm = (name: string) => name === "master" || name === environment.realm;
    const open = (name: string) => navigate(`/${encodeURIComponent(name)}/dashboard`);
    const createAction = canCreate ? (
        <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => navigate(`/${realm}/realms/new`)}>
            {t("sxRealmsCreate")}
        </Button>
    ) : undefined;

    const remove = async (target: any) => {
        if (protectedRealm(target.realm)) {
            addAlert(t("sxRealmsProtectedHint"), AlertVariant.warning);
            return;
        }
        try {
            await adminClient.realms.del({ realm: target.realm });
            addAlert(t("sxRealmsDeleted"), AlertVariant.success);
            notifyRealmsChanged();
            if (target.realm === realm) navigate(`/${encodeURIComponent(environment.realm)}/realms`);
        } catch (error) {
            addError("sxRealmsDeleteError", error);
        }
    };

    return (
        <AdminPage title={t("sxRealmsTitle")} description={t("sxRealmsDescription")} actions={createAction}>
            {status === "ready" && realms.length > 7 && (
                <SearchField value={query} onChange={setQuery} placeholder={t("sxRealmsSearch")} />
            )}

            <Section label={t("sxRealmsSection")}>
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice
                        title={t("sxRealmsLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && realms.length === 0 && (
                    <Notice title={t("sxRealmsEmpty")} description={t("sxRealmsEmptyDescription")} action={createAction} />
                )}
                {status === "ready" && realms.length > 0 && filtered.length === 0 && (
                    <Notice title={t("sxRealmsNoMatch")} description={t("sxRealmsNoMatchDescription")} />
                )}
                {status === "ready" && filtered.length > 0 && (
                    <ul className={GROUP}>
                        {filtered.map((r, index) => {
                            const current = r.realm === realm;
                            const label = realmLabel(r);
                            return (
                                <li key={r.id || r.realm}>
                                    {index > 0 && <div aria-hidden className={SEPARATOR} />}
                                    <div className="flex min-h-16 items-center gap-1 pe-2">
                                        <button
                                            type="button"
                                            onClick={() => open(r.realm)}
                                            className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-3 ps-4 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
                                        >
                                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-[13px] font-semibold text-white uppercase">
                                                {(r.realm || "?").charAt(0)}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-base font-medium">{label}</span>
                                                <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                                                    {r.realm}
                                                </span>
                                            </span>
                                            <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                                                {current && <Chip tone="info">{t("sxRealmsCurrent")}</Chip>}
                                                {r.enabled !== undefined && (
                                                    <span className="hidden sm:inline-flex">
                                                        <Chip tone={r.enabled ? "success" : "danger"}>
                                                            {r.enabled ? t("sxCommonEnabled") : t("sxCommonDisabled")}
                                                        </Chip>
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    aria-label={t("sxRealmsActions", { name: label })}
                                                    className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/8"
                                                >
                                                    <DotsThreeIcon weight="bold" className="size-5" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                className="min-w-44 rounded-xl border border-[#e5e5ea] bg-background p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.18)] ring-0 dark:border-[#38383a] dark:bg-[#1c1c1e]"
                                            >
                                                <DropdownMenuItem className="rounded-lg p-2.5 text-sm" onSelect={() => open(r.realm)}>
                                                    {t("sxRealmsOpen")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    disabled={protectedRealm(r.realm)}
                                                    className="rounded-lg p-2.5 text-sm text-[#d70015] focus:text-[#d70015] dark:text-[#ff453a] dark:focus:text-[#ff453a]"
                                                    onSelect={() => setPending(r)}
                                                >
                                                    {t("sxCommonDelete")}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {status === "ready" && realms.some(r => protectedRealm(r.realm)) && (
                    <p className="mt-2 px-0.5 text-[13px] text-muted-foreground">{t("sxRealmsProtectedHint")}</p>
                )}
            </Section>

            <Confirm open={!!pending} onOpenChange={o => !o && setPending(null)}>
                <ConfirmContent>
                    <ConfirmHeader>
                        <ConfirmTitle>{t("sxRealmsDeleteTitle", { name: pending?.realm ?? "" })}</ConfirmTitle>
                        <ConfirmDescription>{t("sxRealmsDeleteMessage")}</ConfirmDescription>
                    </ConfirmHeader>
                    <ConfirmFooter>
                        <ConfirmCancel>{t("sxCommonCancel")}</ConfirmCancel>
                        <ConfirmAction
                            variant="destructive"
                            onClick={() => {
                                const target = pending;
                                setPending(null);
                                if (target) remove(target);
                            }}
                        >
                            {t("sxCommonDelete")}
                        </ConfirmAction>
                    </ConfirmFooter>
                </ConfirmContent>
            </Confirm>
        </AdminPage>
    );
}
