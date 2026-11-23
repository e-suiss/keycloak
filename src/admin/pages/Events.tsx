// @ts-nocheck

import { ArrowClockwiseIcon, FunnelIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Field, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Spinner } from "@ui/components/spinner";
import { useEffect, useId, useRef, useState } from "react";
import { useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { AdminPage, Chip, GROUP, Group, ListSkeleton, Notice, Section, SegmentTabs } from "../ui/kit";
import { useTranslation } from "react-i18next";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";

const PAGE = 100;

const TONE_CHIP: Record<string, "neutral" | "success" | "danger" | "warning" | "info"> = {
    blue: "info",
    green: "success",
    red: "danger",
    orange: "warning",
    gray: "neutral"
};

const loginTone = (type: string, error: any) => {
    if (error) return "red";
    if (type === "LOGIN") return "green";
    if (/_ERROR$/.test(type || "")) return "red";
    return "blue";
};
const opTone = (op: string) => {
    switch (op) {
        case "CREATE":
            return "green";
        case "UPDATE":
            return "blue";
        case "DELETE":
            return "red";
        case "ACTION":
            return "orange";
        default:
            return "gray";
    }
};

const OP_TYPES = ["CREATE", "UPDATE", "DELETE", "ACTION"];

export default function Events() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addError } = useAlerts();

    const [tab, setTab] = useState<"login" | "admin">("login");
    const [showFilters, setShowFilters] = useState(false);
    const [rows, setRows] = useState<any[]>([]);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [loadingMore, setLoadingMore] = useState(false);
    const [more, setMore] = useState(false);
    const [attempt, setAttempt] = useState(0);

    const [f, setF] = useState<any>({});
    const [applied, setApplied] = useState<any>({});
    const setField = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

    const fetchPage = (first: number) => {
        if (tab === "login") {
            return adminClient.realms.findEvents({
                realm,
                first,
                max: PAGE,
                client: applied.client || undefined,
                user: applied.user || undefined,
                type: applied.type ? [applied.type] : undefined,
                dateFrom: applied.dateFrom || undefined,
                dateTo: applied.dateTo || undefined,
                ipAddress: applied.ipAddress || undefined
            });
        }
        return adminClient.realms.findAdminEvents({
            realm,
            first,
            max: PAGE,
            operationTypes: applied.operationType ? [applied.operationType] : undefined,
            resourceTypes: applied.resourceType ? [applied.resourceType] : undefined,
            resourcePath: applied.resourcePath || undefined,
            dateFrom: applied.dateFrom || undefined,
            dateTo: applied.dateTo || undefined,
            authIpAddress: applied.ipAddress || undefined
        });
    };

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
    }, [adminClient, realm, tab, applied, attempt]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const data = await fetchPage(rowsRef.current.length);
            const list = Array.isArray(data) ? data : [];
            setRows(prev => [...prev, ...list]);
            setMore(list.length === PAGE);
        } catch (err) {
            addError(t("sxEventsLoadMoreError"), err);
        } finally {
            setLoadingMore(false);
        }
    };

    const applyFilters = () => setApplied({ ...f });
    const clearFilters = () => {
        setF({});
        setApplied({});
    };
    const activeFilterCount = Object.values(f).filter(Boolean).length;
    const appliedFilterCount = Object.values(applied).filter(Boolean).length;

    return (
        <AdminPage
            title={t("sxNavEvents")}
            description={t("sxEventsDescription")}
            actions={
                <>
                    <Button
                        type="button"
                        variant={showFilters || activeFilterCount > 0 ? "tinted" : "secondary"}
                        onClick={() => setShowFilters(s => !s)}
                    >
                        <FunnelIcon data-icon="inline-start" weight={activeFilterCount > 0 ? "fill" : "regular"} />
                        {activeFilterCount > 0 ? t("sxEventsFiltersCount", { total: activeFilterCount }) : t("sxEventsFilters")}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => setAttempt(n => n + 1)}
                        aria-label={t("sxEventsRefresh")}
                    >
                        <ArrowClockwiseIcon />
                    </Button>
                </>
            }
        >
            <SegmentTabs
                ariaLabel={t("sxEventsTypeLabel")}
                value={tab}
                onChange={v => {
                    setShowFilters(false);
                    setTab(v);
                }}
                items={[
                    { value: "login", label: t("sxEventsLoginTab") },
                    { value: "admin", label: t("sxEventsAdminTab") }
                ]}
            />

            {showFilters && (
                <Section label={t("sxEventsFilters")}>
                    <div className={`${GROUP} p-4`}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {tab === "login" ? (
                                <>
                                    <FilterField
                                        label={t("sxEventsFilterClient")}
                                        value={f.client}
                                        onChange={(v: any) => setField("client", v)}
                                        placeholder="clientId"
                                    />
                                    <FilterField
                                        label={t("sxEventsFilterUser")}
                                        value={f.user}
                                        onChange={(v: any) => setField("user", v)}
                                        placeholder={t("sxEventsFilterUserPlaceholder")}
                                    />
                                    <FilterField
                                        label={t("sxEventsFilterEventType")}
                                        value={f.type}
                                        onChange={(v: any) => setField("type", v)}
                                        placeholder="LOGIN, LOGOUT, …"
                                    />
                                </>
                            ) : (
                                <>
                                    <Field size="lg">
                                        <FieldLabel>{t("sxEventsFilterOperationType")}</FieldLabel>
                                        <Select
                                            value={f.operationType || "__all__"}
                                            onValueChange={(v: string) =>
                                                setField("operationType", v === "__all__" ? "" : v)
                                            }
                                        >
                                            <SelectTrigger size="lg" className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__all__">{t("sxEventsFilterAll")}</SelectItem>
                                                {OP_TYPES.map(o => (
                                                    <SelectItem key={o} value={o}>
                                                        {o}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <FilterField
                                        label={t("sxEventsFilterResourceType")}
                                        value={f.resourceType}
                                        onChange={(v: any) => setField("resourceType", v)}
                                        placeholder="USER, CLIENT, …"
                                    />
                                    <FilterField
                                        label={t("sxEventsFilterResourcePath")}
                                        value={f.resourcePath}
                                        onChange={(v: any) => setField("resourcePath", v)}
                                        placeholder="users/123"
                                    />
                                </>
                            )}
                            <FilterField
                                label={t("sxEventsFilterDateFrom")}
                                type="date"
                                value={f.dateFrom}
                                onChange={(v: any) => setField("dateFrom", v)}
                            />
                            <FilterField
                                label={t("sxEventsFilterDateTo")}
                                type="date"
                                value={f.dateTo}
                                onChange={(v: any) => setField("dateTo", v)}
                            />
                            <FilterField
                                label={t("sxEventsFilterIpAddress")}
                                value={f.ipAddress}
                                onChange={(v: any) => setField("ipAddress", v)}
                                placeholder="192.168.…"
                            />
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <Button type="button" onClick={applyFilters}>
                                {t("sxEventsApplyFilters")}
                            </Button>
                            {activeFilterCount > 0 && (
                                <Button type="button" variant="plain" onClick={clearFilters}>
                                    <XIcon data-icon="inline-start" /> {t("sxEventsClearFilters")}
                                </Button>
                            )}
                        </div>
                    </div>
                </Section>
            )}

            <Section
                label={
                    status === "ready" && rows.length > 0
                        ? t("sxEventsCount", { total: `${rows.length}${more ? "+" : ""}` })
                        : tab === "login"
                          ? t("sxEventsLoginTab")
                          : t("sxEventsAdminTab")
                }
            >
                {status === "loading" && <ListSkeleton rows={4} />}
                {status === "error" && (
                    <Notice
                        title={t("sxEventsLoadError")}
                        description={t("sxEventsLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && rows.length === 0 && (
                    <Notice
                        title={appliedFilterCount > 0 ? t("sxEventsNoMatchTitle") : t("sxEventsEmptyTitle")}
                        description={
                            appliedFilterCount > 0 ? t("sxEventsNoMatchDescription") : t("sxEventsEmptyDescription")
                        }
                        action={
                            appliedFilterCount > 0 ? (
                                <Button type="button" variant="plain" onClick={clearFilters}>
                                    {t("sxEventsClearFilters")}
                                </Button>
                            ) : undefined
                        }
                    />
                )}
                {status === "ready" && rows.length > 0 && (
                    <>
                        <Group>
                            {rows.map((e, i) =>
                                tab === "login" ? (
                                    <EventRow
                                        key={i}
                                        tone={loginTone(e.type, e.error)}
                                        label={e.type ?? "—"}
                                        meta={[e.clientId, e.ipAddress].filter(Boolean).join(" · ") || "—"}
                                        badge={e.error ? { text: e.error, tone: "red" } : null}
                                        time={e.time}
                                    />
                                ) : (
                                    <EventRow
                                        key={i}
                                        tone={opTone(e.operationType)}
                                        label={e.operationType ?? "—"}
                                        meta={
                                            [e.resourceType, e.resourcePath, e.authDetails?.ipAddress]
                                                .filter(Boolean)
                                                .join(" · ") || "—"
                                        }
                                        time={e.time}
                                    />
                                )
                            )}
                        </Group>
                        {more && (
                            <div className="mt-3 flex justify-center">
                                <Button type="button" variant="plain" onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore && <Spinner data-icon="inline-start" />}
                                    {t("sxEventsLoadMore")}
                                </Button>
                            </div>
                        )}
                        <p className="mt-2 px-0.5 text-[13px] text-muted-foreground">
                            {t("sxEventsPageNote", { max: PAGE })}
                        </p>
                    </>
                )}
            </Section>
        </AdminPage>
    );
}

function FilterField({ label, value, onChange, placeholder, type = "text" }: any) {
    const id = useId();
    return (
        <Field size="lg">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Input
                id={id}
                size="lg"
                type={type}
                value={value ?? ""}
                onChange={(e: any) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </Field>
    );
}

function formatDate(v: any, lang: string) {
    return v ? new Date(typeof v === "number" ? v : Number(v) || v).toLocaleString(lang) : "—";
}

function EventRow({ tone, label, meta, badge, time }: any) {
    const { i18n } = useTranslation();
    const when = formatDate(time, i18n.language);
    return (
        <li className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Chip tone={TONE_CHIP[tone] || "neutral"}>{label}</Chip>
                    {badge && <Chip tone="danger">{badge.text}</Chip>}
                </div>
                <div className="mt-1 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{meta}</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground tabular-nums sm:hidden">{when}</div>
            </div>
            <span className="hidden shrink-0 text-[13px] text-muted-foreground tabular-nums sm:block">
                {when}
            </span>
        </li>
    );
}
