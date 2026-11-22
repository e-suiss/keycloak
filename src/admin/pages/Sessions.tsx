// @ts-nocheck

import {
    DeviceMobileIcon,
    MagnifyingGlassIcon,
    MonitorIcon,
    SignOutIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput
} from "@ui/components/input-group";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
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
import { SegmentPicker, SegmentPickerItem } from "@ui/patterns/segment-picker";
import { Fragment, useCallback, useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";
import { adminFetch, fmtDate, fmtRelative, initials } from "../ui/util";

const PAGE = 50;
const FILTERS = [
    { value: "ALL", label: "Tümü" },
    { value: "REGULAR", label: "Normal" },
    { value: "OFFLINE", label: "Çevrimdışı" }
];

export default function Sessions() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const [filter, setFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [more, setMore] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(
        async (reset = true) => {
            setLoading(reset);
            try {
                const first = reset ? 0 : rows.length;
                const data = await adminFetch(adminClient, realm, "ui-ext/sessions", {
                    first,
                    max: PAGE,
                    type: filter,
                    search
                });
                const list = Array.isArray(data) ? data : [];
                setRows(reset ? list : [...rows, ...list]);
                setMore(list.length === PAGE);
            } catch (err) {
                addError("Oturumlar yüklenemedi.", err);
                setRows([]);
                setMore(false);
            } finally {
                setLoading(false);
            }
        },
        [adminClient, realm, filter, search, rows, addError]
    );

    useEffect(() => {
        load(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);

    const signOut = (s: any) =>
        confirm({
            title: "Oturumu kapat",
            message: `${s.username || "Kullanıcı"} oturumu sonlandırılacak.`,
            confirmLabel: "Kapat",
            danger: true,
            onConfirm: async () => {
                setBusy(s.id);
                try {
                    await adminClient.realms.deleteSession({
                        realm,
                        session: s.id,
                        isOffline: (s.type || "").toUpperCase() === "OFFLINE"
                    });
                    addAlert("Oturum kapatıldı.", AlertVariant.success);
                    setRows(rows.filter(r => r.id !== s.id));
                } catch (err) {
                    addError("Oturum kapatılamadı.", err);
                } finally {
                    setBusy(null);
                }
            }
        });

    const logoutAll = () =>
        confirm({
            title: "Tüm oturumları kapat",
            message:
                "Bu realm'deki tüm aktif kullanıcı oturumları sonlandırılacak. Kullanıcılar yeniden giriş yapmak zorunda kalır.",
            confirmLabel: "Tümünü kapat",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.realms.logoutAll({ realm });
                    addAlert("Tüm oturumlar kapatıldı.", AlertVariant.success);
                    load(true);
                } catch (err) {
                    addError("Oturumlar kapatılamadı.", err);
                }
            }
        });

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-5 flex flex-wrap items-center gap-3">
                <SegmentPicker value={filter} onValueChange={setFilter}>
                    {FILTERS.map(f => (
                        <SegmentPickerItem key={f.value} value={f.value} label={f.label} />
                    ))}
                </SegmentPicker>
                <InputGroup className="min-w-50 flex-1">
                    <InputGroupAddon>
                        <MagnifyingGlassIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        value={search}
                        onChange={(e: any) => setSearch(e.target.value)}
                        onKeyDown={(e: any) => e.key === "Enter" && load(true)}
                        placeholder="Kullanıcı veya IP ara…"
                    />
                </InputGroup>
                <Button type="button" variant="destructive" onClick={logoutAll}>
                    <SignOutIcon weight="bold" data-icon="inline-start" />
                    Tümünü kapat
                </Button>
            </div>

            {loading ? (
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            ) : rows.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <UsersThreeIcon />
                        </EmptyMedia>
                        <EmptyTitle>Aktif oturum yok</EmptyTitle>
                        <EmptyDescription>
                            {search
                                ? "Aramanızla eşleşen oturum bulunamadı."
                                : "Şu anda bu realm'de açık kullanıcı oturumu bulunmuyor."}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        {rows.length}+ oturum
                    </h3>
                    <ItemGroup variant="inset">
                        {rows.map((s, i) => (
                            <Fragment key={s.id}>
                                {i > 0 && <ItemSeparator />}
                                <SessionRow
                                    s={s}
                                    busy={busy === s.id}
                                    onSignOut={() => signOut(s)}
                                />
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
                        Bir oturumu kapatmak kullanıcının o cihazdaki erişimini anında
                        sonlandırır.
                    </p>
                </>
            )}
            <Confirm
                open={!!confirmOpts}
                onOpenChange={o => !o && setConfirmOpts(null)}
            >
                <ConfirmContent>
                    <ConfirmHeader>
                        <ConfirmTitle>{confirmOpts?.title}</ConfirmTitle>
                        {confirmOpts?.message && (
                            <ConfirmDescription>{confirmOpts.message}</ConfirmDescription>
                        )}
                    </ConfirmHeader>
                    <ConfirmFooter>
                        <ConfirmCancel>Vazgeç</ConfirmCancel>
                        <ConfirmAction
                            variant={confirmOpts?.danger ? "destructive" : "default"}
                            onClick={() => {
                                const fn = confirmOpts?.onConfirm;
                                setConfirmOpts(null);
                                fn?.();
                            }}
                        >
                            {confirmOpts?.confirmLabel ?? "Onayla"}
                        </ConfirmAction>
                    </ConfirmFooter>
                </ConfirmContent>
            </Confirm>
        </div>
    );
}

function SessionRow({ s, busy, onSignOut }: any) {
    const offline = (s.type || "").toUpperCase() === "OFFLINE";
    const clients = Object.values(s.clients || {}) as string[];
    return (
        <Item size="sm">
            <ItemMedia>
                <Avatar>
                    <AvatarFallback>{initials(s.username)}</AvatarFallback>
                </Avatar>
            </ItemMedia>
            <ItemContent className="min-w-0">
                <ItemTitle>
                    <span className="truncate">{s.username || "Bilinmiyor"}</span>
                    <Badge variant="outline">
                        {offline ? (
                            <DeviceMobileIcon data-icon="inline-start" />
                        ) : (
                            <MonitorIcon data-icon="inline-start" />
                        )}
                        {offline ? "Çevrimdışı" : "Aktif"}
                    </Badge>
                </ItemTitle>
                <ItemDescription className="truncate">
                    {s.ipAddress && <span className="font-mono">{s.ipAddress}</span>}
                    {clients.length > 0 && (
                        <>
                            {" "}
                            · {clients.slice(0, 3).join(", ")}
                            {clients.length > 3 ? ` +${clients.length - 3}` : ""}
                        </>
                    )}
                </ItemDescription>
            </ItemContent>
            <ItemActions>
                <div className="hidden text-end sm:block">
                    <p className="text-sm tabular-nums">{fmtRelative(s.lastAccess)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                        Başl. {fmtDate(s.start)}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onSignOut}
                    disabled={busy}
                    title="Oturumu kapat"
                    aria-label="Oturumu kapat"
                >
                    <SignOutIcon />
                </Button>
            </ItemActions>
        </Item>
    );
}
