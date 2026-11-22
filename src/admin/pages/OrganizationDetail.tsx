// @ts-nocheck

import {
    BuildingsIcon,
    CaretLeftIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    ShareNetworkIcon,
    TrashIcon,
    UserPlusIcon,
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
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet
} from "@ui/components/field";
import { Input } from "@ui/components/input";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Spinner } from "@ui/components/spinner";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
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
import { SegmentPicker, SegmentPickerItem } from "@ui/patterns/segment-picker";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";

const TABS = [
    { value: "settings", label: "Ayarlar" },
    { value: "attributes", label: "Öznitelikler" },
    { value: "members", label: "Üyeler" },
    { value: "idps", label: "Kimlik sağlayıcılar" }
];

const lines = (s: string) =>
    s
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);
const domainNames = (org: any) =>
    (org?.domains || [])
        .map((d: any) => (typeof d === "string" ? d : d?.name))
        .filter(Boolean);

export default function OrganizationDetail() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { id } = useParams();
    const navigate = useNavigate();
    const { addError } = useAlerts();

    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("settings");

    const reload = useCallback(async () => {
        try {
            const o = await adminClient.organizations.findOne({ id });
            setOrg(o);
        } catch (e) {
            addError("Organizasyon yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        setLoading(true);
        reload();
    }, [reload]);

    if (loading)
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            </div>
        );
    if (!org)
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <BuildingsIcon />
                        </EmptyMedia>
                        <EmptyTitle>Organizasyon bulunamadı</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            </div>
        );

    const domains = domainNames(org);

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            {/* iOS nav-bar header */}
            <div className="relative mb-7 flex items-center">
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => navigate(`/${realm}/organizations`)}
                    aria-label="Geri"
                >
                    <CaretLeftIcon weight="bold" />
                </Button>
                <div className="absolute left-1/2 -translate-x-1/2 text-center">
                    <p className="font-semibold text-foreground">{org.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                        {org.alias || org.id}
                    </p>
                </div>
            </div>

            <div className="mb-5 flex justify-center">
                <SegmentPicker value={tab} onValueChange={setTab}>
                    {TABS.map(t => (
                        <SegmentPickerItem key={t.value} value={t.value} label={t.label} />
                    ))}
                </SegmentPicker>
            </div>

            {tab === "settings" && (
                <SettingsTab
                    org={org}
                    domains={domains}
                    reload={reload}
                    onDeleted={() => navigate(`/${realm}/organizations`)}
                />
            )}
            {tab === "attributes" && <AttributesTab org={org} reload={reload} />}
            {tab === "members" && <MembersTab org={org} />}
            {tab === "idps" && <IdpTab org={org} />}
        </div>
    );
}

/* ── Settings ─────────────────────────────────────────────────────────── */
function SettingsTab({ org, domains, reload, onDeleted }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [name, setName] = useState(org.name || "");
    const [description, setDescription] = useState(org.description || "");
    const [domainsText, setDomainsText] = useState(domains.join("\n"));
    const [saving, setSaving] = useState(false);

    const save = async () => {
        const n = name.trim();
        if (!n) return;
        setSaving(true);
        try {
            const existing = org.domains || [];
            const verifiedBy = new Map(
                existing.map((d: any) => [
                    typeof d === "string" ? d : d?.name,
                    typeof d === "string" ? false : !!d?.verified
                ])
            );
            const rep = {
                ...org,
                name: n,
                description: description.trim() || undefined,
                domains: lines(domainsText).map(d => ({
                    name: d,
                    verified: !!verifiedBy.get(d)
                }))
            };
            await adminClient.organizations.updateById({ id: org.id }, rep);
            addAlert("Organizasyon güncellendi.", AlertVariant.success);
            reload();
        } catch (e) {
            addError("Güncellenemedi.", e);
        } finally {
            setSaving(false);
        }
    };

    const remove = () =>
        confirm({
            title: "Organizasyonu sil",
            message: `“${org.name}” kalıcı olarak silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.organizations.delById({ id: org.id });
                    addAlert("Organizasyon silindi.", AlertVariant.success);
                    onDeleted();
                } catch (e) {
                    addError("Silinemedi.", e);
                }
            }
        });

    return (
        <div className="space-y-6">
            <div>
                <FieldSet>
                    <FieldLegend variant="label">Genel</FieldLegend>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="org-name">Ad</FieldLabel>
                            <Input
                                id="org-name"
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                            />
                        </Field>
                        <Field orientation="horizontal">
                            <FieldLabel>Takma ad</FieldLabel>
                            <span className="font-mono text-sm text-muted-foreground">
                                {org.alias || "—"}
                            </span>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="org-domains">Alan adları</FieldLabel>
                            <Textarea
                                id="org-domains"
                                rows={3}
                                value={domainsText}
                                onChange={(e: any) => setDomainsText(e.target.value)}
                                placeholder={"acme.com\nacme.org"}
                            />
                            <FieldDescription>Her satıra bir alan adı.</FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="org-description">Açıklama</FieldLabel>
                            <Textarea
                                id="org-description"
                                rows={2}
                                value={description}
                                onChange={(e: any) => setDescription(e.target.value)}
                                placeholder="Kısa açıklama"
                            />
                        </Field>
                        <Field orientation="horizontal">
                            <FieldLabel>Organizasyon ID</FieldLabel>
                            <span className="font-mono text-xs text-muted-foreground">
                                {org.id}
                            </span>
                        </Field>
                    </FieldGroup>
                </FieldSet>
                <div className="mt-3 flex justify-end">
                    <Button disabled={saving || !name.trim()} onClick={save}>
                        {saving ? "Kaydediliyor…" : "Kaydet"}
                    </Button>
                </div>
            </div>

            <div>
                <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                    Tehlikeli bölge
                </h3>
                <ItemGroup variant="inset">
                    <Item size="sm" asChild>
                        <button type="button" onClick={remove}>
                            <ItemContent>
                                <ItemTitle className="text-destructive">
                                    Organizasyonu sil
                                </ItemTitle>
                            </ItemContent>
                        </button>
                    </Item>
                </ItemGroup>
                <p className="mt-2 ms-1 text-sm text-muted-foreground">
                    Organizasyon ve üyelik bağları kalıcı olarak silinir.
                </p>
            </div>
            <Confirm open={!!confirmOpts} onOpenChange={o => !o && setConfirmOpts(null)}>
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

/* ── Attributes ───────────────────────────────────────────────────────── */
function AttributesTab({ org, reload }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const toRows = (attrs: any) =>
        Object.entries(attrs || {}).map(([k, v]: any) => ({
            k,
            v: Array.isArray(v) ? v.join(", ") : String(v)
        }));
    const [rows, setRows] = useState<any[]>(toRows(org.attributes));
    const [saving, setSaving] = useState(false);

    const setRow = (i: number, field: string, val: string) =>
        setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
    const addRow = () => setRows([...rows, { k: "", v: "" }]);
    const delRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

    const save = async () => {
        setSaving(true);
        try {
            const attributes: any = {};
            rows.forEach(r => {
                const key = r.k.trim();
                if (key)
                    attributes[key] = String(r.v)
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean);
            });
            await adminClient.organizations.updateById(
                { id: org.id },
                { ...org, attributes }
            );
            addAlert("Öznitelikler kaydedildi.", AlertVariant.success);
            reload();
        } catch (e) {
            addError("Kaydedilemedi.", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                Öznitelikler
            </h3>
            <ItemGroup variant="inset">
                {rows.length === 0 ? (
                    <Item size="sm">
                        <ItemContent>
                            <ItemDescription className="text-center">
                                Öznitelik yok.
                            </ItemDescription>
                        </ItemContent>
                    </Item>
                ) : (
                    rows.map((r, i) => (
                        <Fragment key={i}>
                            {i > 0 && <ItemSeparator />}
                            <Item size="sm" className="flex-nowrap gap-2">
                                <Input
                                    size="sm"
                                    value={r.k}
                                    onChange={(e: any) => setRow(i, "k", e.target.value)}
                                    placeholder="anahtar"
                                    className="w-2/5 min-w-0 font-medium"
                                />
                                <span className="text-muted-foreground">:</span>
                                <Input
                                    size="sm"
                                    value={r.v}
                                    onChange={(e: any) => setRow(i, "v", e.target.value)}
                                    placeholder="değer (virgülle ayır)"
                                    className="min-w-0 flex-1"
                                />
                                <ItemActions>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        title="Sil"
                                        aria-label="Sil"
                                        onClick={() => delRow(i)}
                                    >
                                        <TrashIcon />
                                    </Button>
                                </ItemActions>
                            </Item>
                        </Fragment>
                    ))
                )}
                <ItemSeparator />
                <Item size="sm" asChild>
                    <button type="button" onClick={addRow}>
                        <ItemMedia variant="icon" className="text-primary">
                            <PlusIcon />
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle className="text-primary">Öznitelik ekle</ItemTitle>
                        </ItemContent>
                    </button>
                </Item>
            </ItemGroup>
            <div className="flex justify-end">
                <Button disabled={saving} onClick={save}>
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>
        </div>
    );
}

/* ── Members ──────────────────────────────────────────────────────────── */
function MembersTab({ org }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const m = await adminClient.organizations.listMembers({
                orgId: org.id,
                max: 200
            });
            setMembers(Array.isArray(m) ? m : []);
        } catch (e) {
            addError("Üyeler yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, org.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const removeMember = (u: any) =>
        confirm({
            title: "Üyeyi çıkar",
            message: `${u.username} bu organizasyondan çıkarılacak.`,
            confirmLabel: "Çıkar",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.organizations.delMember({
                        orgId: org.id,
                        userId: u.id
                    });
                    addAlert("Üye çıkarıldı.", AlertVariant.success);
                    setMembers(members.filter(m => m.id !== u.id));
                } catch (e) {
                    addError("Üye çıkarılamadı.", e);
                }
            }
        });

    if (loading)
        return (
            <div className="grid place-items-center py-16">
                <Spinner />
            </div>
        );

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="ms-1 text-sm font-medium text-muted-foreground">
                    {members.length} üye
                </h3>
                <Button
                    type="button"
                    variant="plain"
                    size="sm"
                    onClick={() => setAdding(true)}
                >
                    <UserPlusIcon data-icon="inline-start" /> Üye ekle
                </Button>
            </div>
            {members.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <UsersThreeIcon />
                        </EmptyMedia>
                        <EmptyTitle>Üye yok</EmptyTitle>
                        <EmptyDescription>
                            Bu organizasyona henüz kullanıcı eklenmemiş.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <ItemGroup variant="inset">
                    {members.map((u, i) => (
                        <Fragment key={u.id}>
                            {i > 0 && <ItemSeparator />}
                            <Item size="sm">
                                <ItemMedia>
                                    <Avatar>
                                        <AvatarFallback>{initials(u.username)}</AvatarFallback>
                                    </Avatar>
                                </ItemMedia>
                                <ItemContent className="min-w-0">
                                    <ItemTitle>{u.username}</ItemTitle>
                                    <ItemDescription className="truncate">
                                        {u.email || "—"}
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    {u.membershipType && (
                                        <Badge variant="secondary">{u.membershipType}</Badge>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        title="Organizasyondan çıkar"
                                        aria-label="Organizasyondan çıkar"
                                        onClick={() => removeMember(u)}
                                    >
                                        <TrashIcon />
                                    </Button>
                                </ItemActions>
                            </Item>
                        </Fragment>
                    ))}
                </ItemGroup>
            )}
            {adding && (
                <AddMemberModal
                    org={org}
                    existing={new Set(members.map(m => m.id))}
                    onClose={() => setAdding(false)}
                    onAdded={() => {
                        setAdding(false);
                        load();
                    }}
                />
            )}
            <Confirm open={!!confirmOpts} onOpenChange={o => !o && setConfirmOpts(null)}>
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

function AddMemberModal({ org, existing, onClose, onAdded }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [q, setQ] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    const search = async () => {
        setLoading(true);
        try {
            const r = await adminClient.users.find({
                search: q.trim() || undefined,
                max: 20
            });
            setResults(Array.isArray(r) ? r : []);
        } catch (e) {
            addError("Arama başarısız.", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        search();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const add = async (u: any) => {
        setBusy(u.id);
        try {
            await adminClient.organizations.addMember({ orgId: org.id, userId: u.id });
            addAlert(`${u.username} eklendi.`, AlertVariant.success);
            onAdded();
        } catch (e) {
            addError("Eklenemedi.", e);
            setBusy(null);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>Üye ekle</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-3">
                        <InputGroup>
                            <InputGroupAddon>
                                <MagnifyingGlassIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                                autoFocus
                                value={q}
                                onChange={(e: any) => setQ(e.target.value)}
                                onKeyDown={(e: any) => e.key === "Enter" && search()}
                                placeholder="Kullanıcı ara…"
                            />
                        </InputGroup>
                        {loading ? (
                            <div className="grid place-items-center py-16">
                                <Spinner />
                            </div>
                        ) : (
                            <ItemGroup variant="inset">
                                {results.length === 0 ? (
                                    <Item size="sm">
                                        <ItemContent>
                                            <ItemDescription className="text-center">
                                                Kullanıcı bulunamadı.
                                            </ItemDescription>
                                        </ItemContent>
                                    </Item>
                                ) : (
                                    results.map((u, i) => {
                                        const inOrg = existing.has(u.id);
                                        return (
                                            <Fragment key={u.id}>
                                                {i > 0 && <ItemSeparator />}
                                                <Item size="sm">
                                                    <ItemMedia>
                                                        <Avatar size="sm">
                                                            <AvatarFallback>
                                                                {initials(u.username)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </ItemMedia>
                                                    <ItemContent className="min-w-0">
                                                        <ItemTitle>{u.username}</ItemTitle>
                                                        <ItemDescription className="truncate">
                                                            {u.email || "—"}
                                                        </ItemDescription>
                                                    </ItemContent>
                                                    <ItemActions>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={inOrg ? "ghost" : "tinted"}
                                                            disabled={inOrg || busy === u.id}
                                                            onClick={() => add(u)}
                                                        >
                                                            {inOrg ? "Üye" : "Ekle"}
                                                        </Button>
                                                    </ItemActions>
                                                </Item>
                                            </Fragment>
                                        );
                                    })
                                )}
                            </ItemGroup>
                        )}
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

/* ── Identity providers ───────────────────────────────────────────────── */
function IdpTab({ org }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [linked, setLinked] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [linking, setLinking] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await adminClient.organizations.listIdentityProviders({
                orgId: org.id
            });
            setLinked(Array.isArray(list) ? list : []);
        } catch (e) {
            addError("Kimlik sağlayıcılar yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, org.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const SHOWN_KEY = "kc.org.broker.public";

    const toggleShown = async (idp: any) => {
        const cfg = { ...(idp.config || {}) };
        const next = cfg[SHOWN_KEY] === "true" ? "false" : "true";
        cfg[SHOWN_KEY] = next;
        try {
            await adminClient.identityProviders.update(
                { alias: idp.alias },
                { ...idp, config: cfg }
            );
            addAlert("Güncellendi.", AlertVariant.success);
            setLinked(
                linked.map(x => (x.alias === idp.alias ? { ...x, config: cfg } : x))
            );
        } catch (e) {
            addError("Güncellenemedi.", e);
        }
    };

    const unlink = (idp: any) =>
        confirm({
            title: "Bağlantıyı kaldır",
            message: `“${idp.displayName || idp.alias}” bu organizasyondan ayrılacak.`,
            confirmLabel: "Kaldır",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.organizations.unLinkIdp({
                        orgId: org.id,
                        alias: idp.alias
                    });
                    addAlert("Bağlantı kaldırıldı.", AlertVariant.success);
                    setLinked(linked.filter(x => x.alias !== idp.alias));
                } catch (e) {
                    addError("Kaldırılamadı.", e);
                }
            }
        });

    if (loading)
        return (
            <div className="grid place-items-center py-16">
                <Spinner />
            </div>
        );

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="ms-1 text-sm font-medium text-muted-foreground">
                    {linked.length} kimlik sağlayıcı
                </h3>
                <Button
                    type="button"
                    variant="plain"
                    size="sm"
                    onClick={() => setLinking(true)}
                >
                    <PlusIcon data-icon="inline-start" /> Bağla
                </Button>
            </div>
            {linked.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShareNetworkIcon />
                        </EmptyMedia>
                        <EmptyTitle>Kimlik sağlayıcı yok</EmptyTitle>
                        <EmptyDescription>
                            Bu organizasyon için kullanıcıları bir kimlik sağlayıcıyla doğrula.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <ItemGroup variant="inset">
                    {linked.map((idp, i) => {
                        const _shown = idp.config?.[SHOWN_KEY] === "true";
                        return (
                            <Fragment key={idp.alias}>
                                {i > 0 && <ItemSeparator />}
                                <Item size="sm">
                                    <ItemMedia variant="icon">
                                        <ShareNetworkIcon />
                                    </ItemMedia>
                                    <ItemContent className="min-w-0">
                                        <ItemTitle>{idp.displayName || idp.alias}</ItemTitle>
                                        <ItemDescription className="truncate font-mono">
                                            {idp.alias} · {idp.providerId}
                                        </ItemDescription>
                                    </ItemContent>
                                    <ItemActions>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            title="Bağlantıyı kaldır"
                                            aria-label="Bağlantıyı kaldır"
                                            onClick={() => unlink(idp)}
                                        >
                                            <TrashIcon />
                                        </Button>
                                    </ItemActions>
                                </Item>
                            </Fragment>
                        );
                    })}
                </ItemGroup>
            )}
            {linked.length > 0 && (
                <ItemGroup variant="inset">
                    {linked.map((idp, i) => (
                        <Fragment key={idp.alias}>
                            {i > 0 && <ItemSeparator />}
                            <Item size="sm">
                                <ItemContent>
                                    <ItemTitle>{idp.displayName || idp.alias}</ItemTitle>
                                    <ItemDescription>Giriş ekranında göster</ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <Switch
                                        checked={idp.config?.[SHOWN_KEY] === "true"}
                                        onCheckedChange={() => toggleShown(idp)}
                                    />
                                </ItemActions>
                            </Item>
                        </Fragment>
                    ))}
                </ItemGroup>
            )}
            {linking && (
                <LinkIdpModal
                    org={org}
                    linked={new Set(linked.map(i => i.alias))}
                    onClose={() => setLinking(false)}
                    onLinked={() => {
                        setLinking(false);
                        load();
                    }}
                />
            )}
            <Confirm open={!!confirmOpts} onOpenChange={o => !o && setConfirmOpts(null)}>
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

function LinkIdpModal({ org, linked, onClose, onLinked }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [all, setAll] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [alias, setAlias] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const list = await adminClient.identityProviders.find();
                setAll(
                    Array.isArray(list)
                        ? list.filter((i: any) => !linked.has(i.alias))
                        : []
                );
            } catch (e) {
                addError("Kimlik sağlayıcılar yüklenemedi.", e);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [linked.has, adminClient.identityProviders.find, addError]);

    const link = async () => {
        if (!alias) return;
        setSaving(true);
        try {
            await adminClient.organizations.linkIdp({ orgId: org.id, alias });
            addAlert("Kimlik sağlayıcı bağlandı.", AlertVariant.success);
            onLinked();
        } catch (e) {
            addError("Bağlanamadı.", e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>Kimlik sağlayıcı bağla</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {loading ? (
                        <div className="grid place-items-center py-16">
                            <Spinner />
                        </div>
                    ) : all.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyDescription>
                                    Bağlanabilecek kimlik sağlayıcı yok.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <Field>
                            <FieldLabel>Kimlik sağlayıcı</FieldLabel>
                            <Select
                                value={alias || "__none__"}
                                onValueChange={(v: string) =>
                                    setAlias(v === "__none__" ? "" : v)
                                }
                            >
                                <SelectTrigger size="sm" className="flex-1">
                                    <SelectValue placeholder="Kimlik sağlayıcı seç…" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">
                                        Kimlik sağlayıcı seç…
                                    </SelectItem>
                                    {all.map(i => (
                                        <SelectItem key={i.alias} value={i.alias}>
                                            {i.displayName || i.alias} ({i.providerId})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        type="button"
                        disabled={saving || !alias}
                        onClick={link}
                    >
                        {saving ? "Bağlanıyor…" : "Bağla"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
