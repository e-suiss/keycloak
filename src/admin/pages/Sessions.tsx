// @ts-nocheck

import { ClockCounterClockwiseIcon, DeviceMobileIcon, MonitorIcon, SignOutIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Spinner } from "@ui/components/spinner";
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
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useEffect, useRef, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import {
    AdminPage,
    Chip,
    Group,
    ListSkeleton,
    Notice,
    Row,
    SearchField,
    Section,
    SegmentTabs,
    TextAction
} from "../ui/kit";
import { useTranslation } from "react-i18next";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import { adminFetch, initials } from "../ui/util";
import { GrainAvatar } from "../../shared/brand";

const PAGE = 50;
const FILTERS = [
    { value: "ALL", label: "sxSessionsFilterAll" },
    { value: "REGULAR", label: "sxSessionsFilterRegular" },
    { value: "OFFLINE", label: "sxSessionsFilterOffline" }
];

function toDate(v: any) {
    return new Date(typeof v === "number" ? v : Number(v) || v);
}

function formatDate(v: any, lang: string) {
    return v ? toDate(v).toLocaleString(lang) : "—";
}

function formatRelative(v: any, lang: string) {
    if (!v) return "—";
    const time = toDate(v).getTime();
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto", style: "short" });
    const sec = Math.round((time - Date.now()) / 1000);
    if (Math.abs(sec) < 60) return rtf.format(0, "second");
    const min = Math.round(sec / 60);
    if (Math.abs(min) < 60) return rtf.format(min, "minute");
    const hr = Math.round(min / 60);
    if (Math.abs(hr) < 24) return rtf.format(hr, "hour");
    const day = Math.round(hr / 24);
    if (Math.abs(day) < 30) return rtf.format(day, "day");
    return new Date(time).toLocaleDateString(lang);
}

export default function Sessions() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const [filter, setFilter] = useState("ALL");
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState<any[]>([]);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [loadingMore, setLoadingMore] = useState(false);
    const [more, setMore] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [revocationOpen, setRevocationOpen] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => setSearch(query.trim()), 300);
        return () => clearTimeout(id);
    }, [query]);

    const fetchPage = (first: number) =>
        adminFetch(adminClient, realm, "ui-ext/sessions", {
            first,
            max: PAGE,
            type: filter,
            search
        });

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        fetchPage(0)
            .then((data: any) => {
                if (!alive) return;
                const list = Array.isArray(data) ? data : [];
                setRows(list);
                setMore(list.length === PAGE);
                setStatus("ready");
            })
            .catch(() => {
                if (!alive) return;
                setRows([]);
                setMore(false);
                setStatus("error");
            });
        return () => {
            alive = false;
        };
    }, [adminClient, realm, filter, search, attempt]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const data = await fetchPage(rowsRef.current.length);
            const list = Array.isArray(data) ? data : [];
            setRows(prev => [...prev, ...list]);
            setMore(list.length === PAGE);
        } catch (err) {
            addError(t("sxSessionsLoadMoreError"), err);
        } finally {
            setLoadingMore(false);
        }
    };

    const signOut = (s: any) =>
        confirm({
            title: t("sxSessionsSignOutTitle"),
            message: s.username
                ? t("sxSessionsSignOutMessage", { name: s.username })
                : t("sxSessionsSignOutMessageUnknown"),
            confirmLabel: t("sxSessionsSignOut"),
            danger: true,
            onConfirm: async () => {
                setBusy(s.id);
                try {
                    await adminClient.realms.deleteSession({
                        realm,
                        session: s.id,
                        isOffline: (s.type || "").toUpperCase() === "OFFLINE"
                    });
                    addAlert(t("sxSessionsSignedOut"), AlertVariant.success);
                    setRows(prev => prev.filter(r => r.id !== s.id));
                } catch (err) {
                    addError(t("sxSessionsSignOutError"), err);
                } finally {
                    setBusy(null);
                }
            }
        });

    const logoutAll = () =>
        confirm({
            title: t("sxSessionsSignOutAllTitle"),
            message: t("sxSessionsSignOutAllMessage"),
            confirmLabel: t("sxSessionsSignOutAll"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.realms.logoutAll({ realm });
                    addAlert(t("sxSessionsSignedOutAll"), AlertVariant.success);
                    setAttempt(n => n + 1);
                } catch (err) {
                    addError(t("sxSessionsSignOutAllError"), err);
                }
            }
        });

    return (
        <AdminPage
            title={t("sxNavSessions")}
            description={t("sxSessionsDescription")}
            actions={
                <>
                    <Button type="button" variant="plain" onClick={() => setRevocationOpen(true)}>
                        <ClockCounterClockwiseIcon weight="bold" data-icon="inline-start" />
                        {t("sxSessionsRevocation")}
                    </Button>
                    <Button type="button" variant="destructive" onClick={logoutAll}>
                        <SignOutIcon weight="bold" data-icon="inline-start" />
                        {t("sxSessionsSignOutAll")}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-3">
                <SegmentTabs
                    ariaLabel={t("sxSessionsTypeLabel")}
                    value={filter}
                    onChange={setFilter}
                    items={FILTERS.map(f => ({ value: f.value, label: t(f.label) }))}
                />
                <SearchField
                    value={query}
                    onChange={setQuery}
                    onEnter={() => setSearch(query.trim())}
                    placeholder={t("sxSessionsSearch")}
                />
            </div>

            <Section
                label={
                    status === "ready" && rows.length > 0
                        ? t("sxSessionsCount", { total: `${rows.length}${more ? "+" : ""}` })
                        : t("sxNavSessions")
                }
            >
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice
                        title={t("sxSessionsLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && rows.length === 0 && (
                    <Notice
                        title={search ? t("sxSessionsNoMatchTitle") : t("sxSessionsEmptyTitle")}
                        description={search ? t("sxSessionsNoMatchDescription") : t("sxSessionsEmptyDescription")}
                    />
                )}
                {status === "ready" && rows.length > 0 && (
                    <>
                        <Group>
                            {rows.map(s => (
                                <SessionRow key={s.id} s={s} busy={busy === s.id} onSignOut={() => signOut(s)} />
                            ))}
                        </Group>
                        {more && (
                            <div className="mt-3 flex justify-center">
                                <Button type="button" variant="plain" onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore && <Spinner data-icon="inline-start" />}
                                    {t("sxSessionsLoadMore")}
                                </Button>
                            </div>
                        )}
                        <p className="mt-2 px-0.5 text-[13px] text-muted-foreground">
                            {t("sxSessionsFootnote")}
                        </p>
                    </>
                )}
            </Section>

            {revocationOpen && <RevocationModal onClose={() => setRevocationOpen(false)} />}

            <Confirm open={!!confirmOpts} onOpenChange={o => !o && setConfirmOpts(null)}>
                <ConfirmContent>
                    <ConfirmHeader>
                        <ConfirmTitle>{confirmOpts?.title}</ConfirmTitle>
                        {confirmOpts?.message && <ConfirmDescription>{confirmOpts.message}</ConfirmDescription>}
                    </ConfirmHeader>
                    <ConfirmFooter>
                        <ConfirmCancel>{t("sxSessionsCancel")}</ConfirmCancel>
                        <ConfirmAction
                            variant={confirmOpts?.danger ? "destructive" : "default"}
                            onClick={() => {
                                const fn = confirmOpts?.onConfirm;
                                setConfirmOpts(null);
                                fn?.();
                            }}
                        >
                            {confirmOpts?.confirmLabel ?? t("sxSessionsConfirm")}
                        </ConfirmAction>
                    </ConfirmFooter>
                </ConfirmContent>
            </Confirm>
        </AdminPage>
    );
}

function SessionRow({ s, busy, onSignOut }: any) {
    const t = useT();
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const offline = (s.type || "").toUpperCase() === "OFFLINE";
    const clients = Object.values(s.clients || {}) as string[];
    const where = [
        s.ipAddress,
        clients.length > 0 ? `${clients.slice(0, 3).join(", ")}${clients.length > 3 ? ` +${clients.length - 3}` : ""}` : null
    ]
        .filter(Boolean)
        .join(" · ");
    return (
        <Row
            leading={
                <GrainAvatar seed={s.username} className="size-8 text-[11px]">
                    {initials(s.username)}
                </GrainAvatar>
            }
            title={s.username || t("sxSessionsUnknownUser")}
            subtitle={
                <>
                    {where && <span className="block">{where}</span>}
                    <span className="block tabular-nums">
                        {formatRelative(s.lastAccess, lang)} · {t("sxSessionsStarted", { date: formatDate(s.start, lang) })}
                        <span className="sm:hidden"> · {offline ? t("sxSessionsOffline") : t("sxSessionsActive")}</span>
                    </span>
                </>
            }
            trailing={
                <>
                    <span className="hidden sm:flex">
                        <Chip tone={offline ? "neutral" : "success"}>
                            <span className="flex items-center gap-1 [&_svg]:size-3.5">
                                {offline ? <DeviceMobileIcon /> : <MonitorIcon />}
                                {offline ? t("sxSessionsOffline") : t("sxSessionsActive")}
                            </span>
                        </Chip>
                    </span>
                    <TextAction tone="danger" onClick={onSignOut} disabled={busy} aria-label={t("sxSessionsSignOutTitle")}>
                        {busy ? <Spinner /> : t("sxSessionsSignOut")}
                    </TextAction>
                </>
            }
        />
    );
}

function RevocationModal({ onClose }: any) {
    const t = useT();
    const { i18n } = useTranslation();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [notBefore, setNotBefore] = useState<number | null>(null);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.realms
            .findOne({ realm })
            .then((rep: any) => {
                if (!alive) return;
                setNotBefore(Number(rep?.notBefore) || 0);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, realm, attempt]);

    const run = async (key: string, fn: () => Promise<void>) => {
        setBusy(key);
        try {
            await fn();
            onClose();
        } finally {
            setBusy(null);
        }
    };

    const setNow = () =>
        run("now", async () => {
            try {
                await adminClient.realms.update({ realm }, { realm, notBefore: Math.floor(Date.now() / 1000) });
                addAlert(t("sxSessionsNotBeforeSet"), AlertVariant.success);
            } catch (e) {
                addError(t("sxSessionsNotBeforeSetError"), e);
            }
        });

    const clear = () =>
        run("clear", async () => {
            try {
                await adminClient.realms.update({ realm }, { realm, notBefore: 0 });
                addAlert(t("sxSessionsNotBeforeCleared"), AlertVariant.success);
            } catch (e) {
                addError(t("sxSessionsNotBeforeClearError"), e);
            }
        });

    const push = () =>
        run("push", async () => {
            try {
                const result = await adminClient.realms.pushRevocation({ realm });
                const ok = result?.successRequests || [];
                const failed = result?.failedRequests || [];
                if (ok.length === 0 && failed.length === 0) {
                    addAlert(t("sxSessionsPushNoAdminUrl"), AlertVariant.warning);
                    return;
                }
                if (ok.length > 0)
                    addAlert(t("sxSessionsPushSuccess", { nodes: ok.join(", ") }), AlertVariant.success);
                if (failed.length > 0)
                    addAlert(t("sxSessionsPushFailed", { nodes: failed.join(", ") }), AlertVariant.danger);
            } catch (e) {
                addError(t("sxSessionsPushError"), e);
            }
        });

    return (
        <Modal open onOpenChange={o => !o && !busy && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxSessionsRevocation")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <p className="text-[15px] leading-[1.45] text-muted-foreground">
                            {t("sxSessionsRevocationDescription")}
                        </p>
                        {status === "loading" && <ListSkeleton rows={1} />}
                        {status === "error" && (
                            <Notice
                                title={t("sxSessionsNotBeforeLoadError")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => setAttempt(n => n + 1)}
                            />
                        )}
                        {status === "ready" && (
                            <Group>
                                <Row
                                    title={t("sxSessionsNotBefore")}
                                    subtitle={
                                        <span className="tabular-nums">
                                            {notBefore
                                                ? new Date(notBefore * 1000).toLocaleString(i18n.language)
                                                : t("sxSessionsNotBeforeNone")}
                                        </span>
                                    }
                                />
                            </Group>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button type="button" variant="plain" disabled={!!busy} onClick={clear}>
                        {busy === "clear" && <Spinner data-icon="inline-start" />}
                        {t("sxSessionsNotBeforeClear")}
                    </Button>
                    <Button type="button" variant="plain" disabled={!!busy} onClick={push}>
                        {busy === "push" && <Spinner data-icon="inline-start" />}
                        {t("sxSessionsPush")}
                    </Button>
                    <Button type="button" disabled={!!busy} onClick={setNow}>
                        {busy === "now" && <Spinner data-icon="inline-start" />}
                        {t("sxSessionsSetToNow")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
