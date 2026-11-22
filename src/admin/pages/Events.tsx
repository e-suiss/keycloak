// @ts-nocheck

import {
    ArrowClockwiseIcon,
    ClockCounterClockwiseIcon,
    FunnelIcon,
    XIcon
} from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import { Field, FieldGroup, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Spinner } from "@ui/components/spinner";
import { SegmentPicker, SegmentPickerItem } from "@ui/patterns/segment-picker";
import { Fragment, useCallback, useEffect, useId, useState } from "react";
import { useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";
import { fmtDate } from "../ui/util";

const PAGE = 100;

const TONE_BADGE: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
    blue: "default",
    green: "outline",
    red: "destructive",
    orange: "outline",
    gray: "secondary"
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
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addError } = useAlerts();

    const [tab, setTab] = useState("login");
    const [showFilters, setShowFilters] = useState(false);
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [more, setMore] = useState(false);

    // Filter draft (login + admin share one object; relevant fields per tab).
    const [f, setF] = useState<any>({});
    const setField = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

    const load = useCallback(
        async (reset = true) => {
            setLoading(reset);
            try {
                const first = reset ? 0 : rows.length;
                let data: any[];
                if (tab === "login") {
                    data = await adminClient.realms.findEvents({
                        realm,
                        first,
                        max: PAGE,
                        client: f.client || undefined,
                        user: f.user || undefined,
                        type: f.type ? [f.type] : undefined,
                        dateFrom: f.dateFrom || undefined,
                        dateTo: f.dateTo || undefined,
                        ipAddress: f.ipAddress || undefined
                    });
                } else {
                    data = await adminClient.realms.findAdminEvents({
                        realm,
                        first,
                        max: PAGE,
                        operationTypes: f.operationType ? [f.operationType] : undefined,
                        resourceTypes: f.resourceType ? [f.resourceType] : undefined,
                        resourcePath: f.resourcePath || undefined,
                        dateFrom: f.dateFrom || undefined,
                        dateTo: f.dateTo || undefined,
                        authIpAddress: f.ipAddress || undefined
                    });
                }
                const list = Array.isArray(data) ? data : [];
                setRows(reset ? list : [...rows, ...list]);
                setMore(list.length === PAGE);
            } catch (err) {
                addError("Olaylar yüklenemedi (kapalı olabilir).", err);
                setRows([]);
                setMore(false);
            } finally {
                setLoading(false);
            }
        },
        [adminClient, realm, tab, f, rows, addError]
    );

    useEffect(() => {
        load(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);

    const clearFilters = () => {
        setF({});
        setTimeout(() => load(true), 0);
    };
    const activeFilterCount = Object.values(f).filter(Boolean).length;

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-5 flex flex-wrap items-center gap-3">
                <SegmentPicker
                    value={tab}
                    onValueChange={(v: string) => {
                        setShowFilters(false);
                        setTab(v);
                    }}
                >
                    <SegmentPickerItem value="login" label="Giriş olayları" />
                    <SegmentPickerItem value="admin" label="Yönetim olayları" />
                </SegmentPicker>
                <div className="ms-auto flex items-center gap-2">
                    <Button
                        type="button"
                        variant={
                            showFilters || activeFilterCount > 0 ? "tinted" : "secondary"
                        }
                        onClick={() => setShowFilters(s => !s)}
                    >
                        <FunnelIcon
                            data-icon="inline-start"
                            weight={activeFilterCount > 0 ? "fill" : "regular"}
                        />
                        Filtreler{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => load(true)}
                        aria-label="Yenile"
                    >
                        <ArrowClockwiseIcon />
                    </Button>
                </div>
            </div>

            {showFilters && (
                <div className="mb-5 flex flex-col gap-3">
                    <FieldGroup variant="inset">
                        {tab === "login" ? (
                            <>
                                <FilterField
                                    label="İstemci"
                                    value={f.client}
                                    onChange={(v: any) => setField("client", v)}
                                    placeholder="clientId"
                                />
                                <FilterField
                                    label="Kullanıcı"
                                    value={f.user}
                                    onChange={(v: any) => setField("user", v)}
                                    placeholder="kullanıcı ID"
                                />
                                <FilterField
                                    label="Olay türü"
                                    value={f.type}
                                    onChange={(v: any) => setField("type", v)}
                                    placeholder="LOGIN, LOGOUT, …"
                                />
                            </>
                        ) : (
                            <>
                                <Field orientation="horizontal">
                                    <FieldLabel>İşlem türü</FieldLabel>
                                    <Select
                                        value={f.operationType || "__all__"}
                                        onValueChange={(v: string) =>
                                            setField(
                                                "operationType",
                                                v === "__all__" ? "" : v
                                            )
                                        }
                                    >
                                        <SelectTrigger size="sm" className="w-40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__all__">Tümü</SelectItem>
                                            {OP_TYPES.map(o => (
                                                <SelectItem key={o} value={o}>
                                                    {o}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <FilterField
                                    label="Kaynak türü"
                                    value={f.resourceType}
                                    onChange={(v: any) => setField("resourceType", v)}
                                    placeholder="USER, CLIENT, …"
                                />
                                <FilterField
                                    label="Kaynak yolu"
                                    value={f.resourcePath}
                                    onChange={(v: any) => setField("resourcePath", v)}
                                    placeholder="users/123"
                                />
                            </>
                        )}
                        <FilterField
                            label="Başlangıç"
                            type="date"
                            value={f.dateFrom}
                            onChange={(v: any) => setField("dateFrom", v)}
                        />
                        <FilterField
                            label="Bitiş"
                            type="date"
                            value={f.dateTo}
                            onChange={(v: any) => setField("dateTo", v)}
                        />
                        <FilterField
                            label="IP adresi"
                            value={f.ipAddress}
                            onChange={(v: any) => setField("ipAddress", v)}
                            placeholder="192.168.…"
                        />
                    </FieldGroup>
                    <div className="flex items-center gap-2">
                        <Button type="button" size="sm" onClick={() => load(true)}>
                            Filtrele
                        </Button>
                        {activeFilterCount > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                            >
                                <XIcon data-icon="inline-start" /> Temizle
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            ) : rows.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ClockCounterClockwiseIcon />
                        </EmptyMedia>
                        <EmptyTitle>Olay yok</EmptyTitle>
                        <EmptyDescription>
                            {activeFilterCount > 0
                                ? "Filtrelerle eşleşen olay bulunamadı."
                                : "Olaylar kapalı olabilir veya henüz kayıt yok."}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        {rows.length}
                        {more ? "+" : ""} olay
                    </h3>
                    <ItemGroup variant="inset">
                        {rows.map((e, i) => (
                            <Fragment key={i}>
                                {i > 0 && <ItemSeparator />}
                                {tab === "login" ? (
                                    <EventRow
                                        tone={loginTone(e.type, e.error)}
                                        label={e.type ?? "—"}
                                        meta={
                                            [e.clientId, e.ipAddress]
                                                .filter(Boolean)
                                                .join(" · ") || "—"
                                        }
                                        badge={
                                            e.error
                                                ? { text: e.error, tone: "red" }
                                                : null
                                        }
                                        time={e.time}
                                    />
                                ) : (
                                    <EventRow
                                        tone={opTone(e.operationType)}
                                        label={e.operationType ?? "—"}
                                        meta={
                                            [
                                                e.resourceType,
                                                e.resourcePath,
                                                e.authDetails?.ipAddress
                                            ]
                                                .filter(Boolean)
                                                .join(" · ") || "—"
                                        }
                                        time={e.time}
                                    />
                                )}
                            </Fragment>
                        ))}
                        {more && (
                            <>
                                <ItemSeparator />
                                <Item size="sm" asChild>
                                    <button type="button" onClick={() => load(false)}>
                                        <ItemContent>
                                            <ItemTitle className="text-primary">
                                                Daha fazla yükle
                                            </ItemTitle>
                                        </ItemContent>
                                    </button>
                                </Item>
                            </>
                        )}
                    </ItemGroup>
                    <p className="mt-2 ms-1 text-sm text-muted-foreground">
                        En fazla {PAGE} olay sayfa başına gösterilir.
                    </p>
                </>
            )}
        </div>
    );
}

function FilterField({ label, value, onChange, placeholder, type = "text" }: any) {
    const id = useId();
    return (
        <Field orientation="horizontal">
            <FieldLabel htmlFor={id} className="shrink-0">
                {label}
            </FieldLabel>
            <Input
                id={id}
                type={type}
                value={value ?? ""}
                onChange={(e: any) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </Field>
    );
}

function EventRow({ tone, label, meta, badge, time }: any) {
    return (
        <Item size="sm">
            <ItemContent className="min-w-0">
                <ItemTitle>
                    <Badge variant={TONE_BADGE[tone] || TONE_BADGE.gray}>{label}</Badge>
                    {badge && <Badge variant="destructive">{badge.text}</Badge>}
                </ItemTitle>
                <ItemDescription className="truncate">{meta}</ItemDescription>
            </ItemContent>
            <ItemActions>
                <span className="text-sm text-muted-foreground tabular-nums">
                    {fmtDate(time)}
                </span>
            </ItemActions>
        </Item>
    );
}
