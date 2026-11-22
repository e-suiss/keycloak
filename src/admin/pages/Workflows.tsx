// @ts-nocheck
// Workflows — list page (Apple-style). Create/edit happens on a dedicated
// detail page (lots of content), not a dialog. Requires `--features=workflows`.

import {
    CopyIcon,
    FlowArrowIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    TrashIcon
} from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@ui/components/input-group";
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
import { Switch } from "@ui/components/switch";
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
import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import yaml from "yaml";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";
import { rawWorkflow } from "./workflow-lib";

export default function Workflows() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const navigate = useNavigate();

    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [available, setAvailable] = useState(true);
    const [diag, setDiag] = useState("");
    const [search, setSearch] = useState("");
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const url = `${adminClient.baseUrl}/admin/realms/${realm}/workflows`;
        try {
            const token = await adminClient.getAccessToken();
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
            });
            if (res.status === 404) {
                setRows([]);
                setAvailable(true);
                setDiag("");
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            let data: any = [];
            if (text.trim()) {
                try {
                    data = JSON.parse(text);
                } catch {
                    data = yaml.parse(text);
                }
            }
            const list = Array.isArray(data) ? data : data?.workflows || [];
            list.sort((a: any, b: any) => (a.name ?? "").localeCompare(b.name ?? ""));
            setRows(list);
            setAvailable(true);
            setDiag("");
        } catch (err: any) {
            console.error("[workflows] GET failed:", url, err);
            setDiag(`${url} → ${err?.message || err}`);
            setAvailable(false);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [adminClient, realm]);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(
            w =>
                (w.name ?? "").toLowerCase().includes(q) ||
                (w.id ?? "").toLowerCase().includes(q)
        );
    }, [rows, search]);

    const toggleEnabled = async (w: any) => {
        const enabled = !(w.enabled ?? true);
        setBusy(w.id);
        try {
            await rawWorkflow(adminClient, realm, "PUT", w.id, { ...w, enabled });
            setRows(rs => rs.map(r => (r.id === w.id ? { ...r, enabled } : r)));
            addAlert(
                enabled ? "Workflow etkinleştirildi." : "Workflow devre dışı bırakıldı.",
                AlertVariant.success
            );
        } catch (err: any) {
            addError(`Workflow güncellenemedi: ${err?.message || err}`, err);
        } finally {
            setBusy(null);
        }
    };

    const remove = (w: any) =>
        confirm({
            title: "Workflow'u sil",
            message: `${w.name ?? "Bu workflow"} kalıcı olarak silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                setBusy(w.id);
                try {
                    await rawWorkflow(adminClient, realm, "DELETE", w.id);
                    setRows(rs => rs.filter(r => r.id !== w.id));
                    addAlert("Workflow silindi.", AlertVariant.success);
                } catch (err: any) {
                    addError(`Workflow silinemedi: ${err?.message || err}`, err);
                } finally {
                    setBusy(null);
                }
            }
        });

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            {available && !loading && (
                <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
                    <Button onClick={() => navigate(`/${realm}/workflows/new`)}>
                        <PlusIcon weight="bold" />
                        Yeni workflow
                    </Button>
                </div>
            )}
            {available && !loading && rows.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-3">
                    <InputGroup className="min-w-50 flex-1">
                        <InputGroupAddon>
                            <MagnifyingGlassIcon />
                        </InputGroupAddon>
                        <InputGroupInput
                            value={search}
                            onChange={(e: any) => setSearch(e.target.value)}
                            placeholder="Ada veya ID'ye göre ara…"
                        />
                    </InputGroup>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16">
                    <Spinner className="size-6" />
                </div>
            ) : !available ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FlowArrowIcon />
                        </EmptyMedia>
                        <EmptyTitle>Workflows özelliği kapalı</EmptyTitle>
                        <EmptyDescription>
                            {diag ||
                                "Bu özellik kullanılamıyor. Keycloak sunucusunu --features=workflows ile başlatın, ardından bu sayfayı yenileyin."}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : rows.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FlowArrowIcon />
                        </EmptyMedia>
                        <EmptyTitle>Henüz workflow yok</EmptyTitle>
                        <EmptyDescription>
                            Bir olay gerçekleştiğinde otomatik çalışacak ilk akışını oluştur.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button onClick={() => navigate(`/${realm}/workflows/new`)}>
                            <PlusIcon weight="bold" />
                            Yeni workflow
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : filtered.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <MagnifyingGlassIcon />
                        </EmptyMedia>
                        <EmptyTitle>Sonuç yok</EmptyTitle>
                        <EmptyDescription>
                            Aramanızla eşleşen workflow bulunamadı.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        {filtered.length} workflow
                    </h3>
                    <ItemGroup variant="inset">
                        {filtered.map((w, i) => (
                            <Fragment key={w.id}>
                                {i > 0 && <ItemSeparator />}
                                <WorkflowRow
                                    w={w}
                                    busy={busy === w.id}
                                    onToggle={() => toggleEnabled(w)}
                                    onOpen={() => navigate(`/${realm}/workflows/${w.id}`)}
                                    onCopy={() =>
                                        navigate(`/${realm}/workflows/copy/${w.id}`)
                                    }
                                    onDelete={() => remove(w)}
                                />
                            </Fragment>
                        ))}
                    </ItemGroup>
                </>
            )}
            {confirmNode}
        </div>
    );
}

function WorkflowRow({ w, busy, onToggle, onOpen, onCopy, onDelete }: any) {
    const enabled = w.enabled ?? true;
    const stepCount = (w.steps || []).length;
    return (
        <Item size="sm">
            <ItemMedia variant="icon">
                <FlowArrowIcon />
            </ItemMedia>
            <ItemContent className="min-w-0">
                <Item size="xs" asChild className="p-0">
                    <button type="button" onClick={onOpen} className="text-start">
                        <ItemContent className="min-w-0">
                            <ItemTitle>
                                <span className="truncate">{w.name || "(adsız)"}</span>
                                <Badge variant={enabled ? "outline" : "secondary"}>
                                    {enabled ? "Etkin" : "Pasif"}
                                </Badge>
                            </ItemTitle>
                            <ItemDescription className="truncate">
                                {stepCount} adım
                                {w.id && (
                                    <>
                                        {" "}
                                        · <span className="font-mono">{w.id.slice(0, 8)}</span>
                                    </>
                                )}
                            </ItemDescription>
                        </ItemContent>
                    </button>
                </Item>
            </ItemContent>
            <ItemActions>
                <Switch checked={enabled} disabled={busy} onCheckedChange={onToggle} />
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onCopy}
                    aria-label="Çoğalt"
                >
                    <CopyIcon />
                </Button>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onDelete}
                    title="Sil"
                    aria-label="Sil"
                >
                    <TrashIcon />
                </Button>
            </ItemActions>
        </Item>
    );
}

/** Confirm dialog — returns a [confirm(opts), node] pair (built on @ui/patterns/confirm). */
function useConfirm() {
    const [opts, setOpts] = useState<any>(null);
    const [open, setOpen] = useState(false);
    const confirm = (o: {
        title: ReactNode;
        message?: ReactNode;
        confirmLabel?: ReactNode;
        danger?: boolean;
        onConfirm: () => void;
    }) => {
        setOpts(o);
        setOpen(true);
    };
    const node = (
        <Confirm open={open} onOpenChange={setOpen}>
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{opts?.title}</ConfirmTitle>
                    {opts?.message && (
                        <ConfirmDescription>{opts.message}</ConfirmDescription>
                    )}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>Vazgeç</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => opts?.onConfirm?.()}
                    >
                        {opts?.confirmLabel ?? "Onayla"}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}
