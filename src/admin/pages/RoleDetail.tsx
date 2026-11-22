// @ts-nocheck

import {
    CaretLeftIcon,
    PlusIcon,
    ShieldCheckIcon,
    StackIcon,
    TrashIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet
} from "@ui/components/field";
import { Input } from "@ui/components/input";
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
    { value: "details", label: "Ayrıntılar" },
    { value: "attributes", label: "Öznitelikler" },
    { value: "composite", label: "Bileşik roller" },
    { value: "users", label: "Kullanıcılar" }
];

export default function RoleDetail() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { id } = useParams();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();

    const isNew = id === "new";
    const [loading, setLoading] = useState(!isNew);
    const [role, setRole] = useState<any>(null);
    const [tab, setTab] = useState("details");

    const reload = useCallback(async () => {
        try {
            const found = await adminClient.roles
                .findOneByName({ name: id })
                .catch(() => null);
            setRole(found);
        } catch (e) {
            addError("Rol yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        if (isNew) {
            setLoading(false);
            return;
        }
        setLoading(true);
        reload();
    }, [reload, isNew]);

    if (isNew) return <NewRole />;
    if (loading)
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            </div>
        );
    if (!role?.id)
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShieldCheckIcon />
                        </EmptyMedia>
                        <EmptyTitle>Rol bulunamadı</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            </div>
        );

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="relative mb-7 flex items-center">
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => navigate(`/${realm}/roles`)}
                    aria-label="Geri"
                >
                    <CaretLeftIcon weight="bold" />
                </Button>
                <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-center">
                    <p className="font-semibold text-foreground">{role.name}</p>
                    {role.composite && <Badge variant="outline">Bileşik</Badge>}
                </div>
            </div>

            <div className="mb-5 flex justify-center">
                <SegmentPicker value={tab} onValueChange={setTab}>
                    {TABS.map(t => (
                        <SegmentPickerItem key={t.value} value={t.value} label={t.label} />
                    ))}
                </SegmentPicker>
            </div>

            {tab === "details" && (
                <DetailsTab
                    role={role}
                    reload={reload}
                    onDeleted={() => navigate(`/${realm}/roles`)}
                    onRenamed={n => navigate(`/${realm}/roles/${encodeURIComponent(n)}`)}
                />
            )}
            {tab === "attributes" && <AttributesTab role={role} reload={reload} />}
            {tab === "composite" && <CompositeTab role={role} reload={reload} />}
            {tab === "users" && <UsersTab role={role} />}
        </div>
    );
}

function NewRole() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    const create = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await adminClient.roles.create({
                name: name.trim(),
                description: description.trim() || undefined
            });
            addAlert("Rol oluşturuldu.", AlertVariant.success);
            navigate(`/${realm}/roles/${encodeURIComponent(name.trim())}`);
        } catch (e) {
            addError("Rol oluşturulamadı.", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="relative mb-7 flex items-center">
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => navigate(`/${realm}/roles`)}
                    aria-label="Geri"
                >
                    <CaretLeftIcon weight="bold" />
                </Button>
                <p className="absolute left-1/2 -translate-x-1/2 font-semibold text-foreground">
                    Yeni rol
                </p>
            </div>
            <div className="mx-auto max-w-xl space-y-6">
                <FieldSet>
                    <FieldLegend variant="label">Rol bilgileri</FieldLegend>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="role-name">Rol adı</FieldLabel>
                            <Input
                                id="role-name"
                                autoFocus
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                                placeholder="örn. realm-admin"
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="role-description">Açıklama</FieldLabel>
                            <Textarea
                                id="role-description"
                                rows={2}
                                value={description}
                                onChange={(e: any) => setDescription(e.target.value)}
                                placeholder="İsteğe bağlı"
                            />
                        </Field>
                    </FieldGroup>
                </FieldSet>
                <div className="flex justify-end">
                    <Button disabled={saving || !name.trim()} onClick={create}>
                        {saving ? "Oluşturuluyor…" : "Oluştur"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function DetailsTab({ role, reload, onDeleted, onRenamed }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [name, setName] = useState(role.name || "");
    const [description, setDescription] = useState(role.description || "");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await adminClient.roles.updateById(
                { id: role.id },
                {
                    ...role,
                    name: name.trim(),
                    description: description.trim() || undefined
                }
            );
            addAlert("Rol kaydedildi.", AlertVariant.success);
            if (name.trim() !== role.name) onRenamed(name.trim());
            else reload();
        } catch (e) {
            addError("Kaydedilemedi.", e);
        } finally {
            setSaving(false);
        }
    };

    const remove = () =>
        confirm({
            title: "Rolü sil",
            message: `“${role.name}” rolü silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.roles.delById({ id: role.id });
                    addAlert("Rol silindi.", AlertVariant.success);
                    onDeleted();
                } catch (e) {
                    addError("Silinemedi.", e);
                }
            }
        });

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <div>
                <FieldSet>
                    <FieldLegend variant="label">Rol bilgileri</FieldLegend>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="role-name">Rol adı</FieldLabel>
                            <Input
                                id="role-name"
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="role-description">Açıklama</FieldLabel>
                            <Textarea
                                id="role-description"
                                rows={2}
                                value={description}
                                onChange={(e: any) => setDescription(e.target.value)}
                                placeholder="İsteğe bağlı"
                            />
                        </Field>
                        <Field orientation="horizontal">
                            <FieldLabel>Rol ID</FieldLabel>
                            <span className="font-mono text-xs text-muted-foreground">
                                {role.id}
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
                                <ItemTitle className="text-destructive">Rolü sil</ItemTitle>
                            </ItemContent>
                        </button>
                    </Item>
                </ItemGroup>
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

function AttributesTab({ role, reload }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const toRows = (attrs: any) =>
        Object.entries(attrs || {}).map(([k, v]: any) => ({
            k,
            v: Array.isArray(v) ? v.join(", ") : String(v)
        }));
    const [rows, setRows] = useState<any[]>(toRows(role.attributes));
    const [saving, setSaving] = useState(false);

    const setRow = (i: number, field: string, val: string) =>
        setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));

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
            await adminClient.roles.updateById({ id: role.id }, { ...role, attributes });
            addAlert("Öznitelikler kaydedildi.", AlertVariant.success);
            reload();
        } catch (e) {
            addError("Kaydedilemedi.", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-xl space-y-3">
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
                                        onClick={() =>
                                            setRows(rows.filter((_, idx) => idx !== i))
                                        }
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
                    <button
                        type="button"
                        onClick={() => setRows([...rows, { k: "", v: "" }])}
                    >
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

function CompositeTab({ role, reload }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [composites, setComposites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [picking, setPicking] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const c = await adminClient.roles.getCompositeRoles({ id: role.id });
            setComposites(Array.isArray(c) ? c : []);
        } catch (e) {
            addError("Bileşik roller yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, role.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const removeComposite = (r: any) =>
        confirm({
            title: "Bileşenden kaldır",
            message: `“${r.name}” bu bileşik rolden kaldırılacak.`,
            confirmLabel: "Kaldır",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.roles.delCompositeRoles({ id: role.id }, [r]);
                    addAlert("Kaldırıldı.", AlertVariant.success);
                    setComposites(composites.filter(x => x.id !== r.id));
                    reload();
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
        <div className="mx-auto max-w-xl space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="ms-1 text-sm font-medium text-muted-foreground">
                    İçerdiği roller
                </h3>
                <Button
                    type="button"
                    variant="plain"
                    size="sm"
                    onClick={() => setPicking(true)}
                >
                    <PlusIcon data-icon="inline-start" /> Rol ekle
                </Button>
            </div>
            {composites.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <StackIcon />
                        </EmptyMedia>
                        <EmptyTitle>Bileşen yok</EmptyTitle>
                        <EmptyDescription>
                            Bu role başka roller ekleyerek bileşik (composite) rol yap.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <ItemGroup variant="inset">
                    {composites.map((r, i) => (
                        <Fragment key={r.id}>
                            {i > 0 && <ItemSeparator />}
                            <Item size="sm">
                                <ItemMedia variant="icon">
                                    <ShieldCheckIcon />
                                </ItemMedia>
                                <ItemContent className="min-w-0">
                                    <ItemTitle>{r.name}</ItemTitle>
                                    {r.clientRole && (
                                        <ItemDescription>İstemci rolü</ItemDescription>
                                    )}
                                </ItemContent>
                                <ItemActions>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        title="Sil"
                                        aria-label="Sil"
                                        onClick={() => removeComposite(r)}
                                    >
                                        <TrashIcon />
                                    </Button>
                                </ItemActions>
                            </Item>
                        </Fragment>
                    ))}
                </ItemGroup>
            )}
            <p className="mt-2 ms-1 text-sm text-muted-foreground">
                Bileşik rol, içerdiği tüm rollerin yetkilerini taşır.
            </p>
            {picking && (
                <PickCompositeModal
                    role={role}
                    existing={new Set(composites.map(r => r.id))}
                    onClose={() => setPicking(false)}
                    onAdded={() => {
                        setPicking(false);
                        load();
                        reload();
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

function PickCompositeModal({ role, existing, onClose, onAdded }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const all = await adminClient.roles.find({ max: 1000 });
                setRoles(
                    (all || []).filter(
                        (r: any) => r.id !== role.id && !existing.has(r.id)
                    )
                );
            } catch (e) {
                addError("Roller yüklenemedi.", e);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role.id, addError, existing.has, adminClient.roles.find]);

    const toggle = (id: string) =>
        setSel(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });

    const save = async () => {
        const chosen = roles.filter(r => sel.has(r.id));
        if (chosen.length === 0) return;
        setSaving(true);
        try {
            await adminClient.roles.createComposite({ roleId: role.id }, chosen);
            addAlert(`${chosen.length} rol eklendi.`, AlertVariant.success);
            onAdded();
        } catch (e) {
            addError("Eklenemedi.", e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>Bileşene rol ekle</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {loading ? (
                        <div className="grid place-items-center py-16">
                            <Spinner />
                        </div>
                    ) : (
                        <ItemGroup variant="inset">
                            {roles.length === 0 ? (
                                <Item size="sm">
                                    <ItemContent>
                                        <ItemDescription className="text-center">
                                            Eklenebilecek rol yok.
                                        </ItemDescription>
                                    </ItemContent>
                                </Item>
                            ) : (
                                roles.map((r, i) => (
                                    <Fragment key={r.id}>
                                        {i > 0 && <ItemSeparator />}
                                        <Item size="sm" asChild>
                                            <label>
                                                <ItemMedia>
                                                    <Checkbox
                                                        checked={sel.has(r.id)}
                                                        onCheckedChange={() => toggle(r.id)}
                                                    />
                                                </ItemMedia>
                                                <ItemContent className="min-w-0">
                                                    <ItemTitle>{r.name}</ItemTitle>
                                                    {r.description && (
                                                        <ItemDescription className="truncate">
                                                            {r.description}
                                                        </ItemDescription>
                                                    )}
                                                </ItemContent>
                                            </label>
                                        </Item>
                                    </Fragment>
                                ))
                            )}
                        </ItemGroup>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving || sel.size === 0} onClick={save}>
                        {saving ? "Ekleniyor…" : `Ekle (${sel.size})`}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function UsersTab({ role }: any) {
    const { adminClient } = useAdminClient();
    const { addError } = useAlerts();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [more, setMore] = useState(false);

    const load = useCallback(
        async (reset = true) => {
            setLoading(reset);
            try {
                const first = reset ? 0 : users.length;
                const u = await adminClient.roles.findUsersWithRole({
                    name: role.name,
                    first,
                    max: 50
                });
                const list = Array.isArray(u) ? u : [];
                setUsers(reset ? list : [...users, ...list]);
                setMore(list.length === 50);
            } catch (e) {
                addError("Kullanıcılar yüklenemedi.", e);
            } finally {
                setLoading(false);
            }
        },
        [adminClient, role.name, users, addError]
    );

    useEffect(() => {
        load(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);

    if (loading)
        return (
            <div className="grid place-items-center py-16">
                <Spinner />
            </div>
        );

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                {users.length}
                {more ? "+" : ""} kullanıcı
            </h3>
            {users.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <UsersThreeIcon />
                        </EmptyMedia>
                        <EmptyTitle>Kimse yok</EmptyTitle>
                        <EmptyDescription>
                            Bu role doğrudan sahip kullanıcı bulunmuyor.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <ItemGroup variant="inset">
                    {users.map((u, i) => (
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
                            </Item>
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
            )}
        </div>
    );
}
