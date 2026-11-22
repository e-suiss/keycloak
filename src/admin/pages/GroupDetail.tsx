// @ts-nocheck

import {
    CaretRightIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    ShieldCheckIcon,
    TrashIcon,
    UserPlusIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
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
import { SegmentPicker, SegmentPickerItem } from "@ui/patterns/segment-picker";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";

const PAGE_CLS = "mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8";

function Loading() {
    return (
        <div className="grid place-items-center py-16">
            <Spinner />
        </div>
    );
}

function ConfirmDialog({ opts, onClose }: any) {
    return (
        <Confirm open={!!opts} onOpenChange={o => !o && onClose()}>
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
                        onClick={() => {
                            const fn = opts?.onConfirm;
                            onClose();
                            fn?.();
                        }}
                    >
                        {opts?.confirmLabel ?? "Onayla"}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
}

function EmptyCard({ icon, title, desc }: any) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">{icon}</EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                {desc && <EmptyDescription>{desc}</EmptyDescription>}
            </EmptyHeader>
        </Empty>
    );
}

function EmptyRow({ children }: any) {
    return (
        <Item size="sm">
            <ItemContent>
                <ItemDescription className="text-center">{children}</ItemDescription>
            </ItemContent>
        </Item>
    );
}

const TABS = [
    { value: "members", label: "Üyeler" },
    { value: "attributes", label: "Öznitelikler" },
    { value: "roles", label: "Rol eşlemesi" },
    { value: "children", label: "Alt gruplar" },
    { value: "settings", label: "Ayarlar" }
];

export default function GroupDetail() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { id } = useParams();
    const navigate = useNavigate();
    const { addError } = useAlerts();

    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("members");

    const reload = useCallback(async () => {
        try {
            const g = await adminClient.groups.findOne({ id });
            setGroup(g);
        } catch (e) {
            addError("Grup yüklenemedi.", e);
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
            <div className={PAGE_CLS}>
                <Loading />
            </div>
        );
    if (!group)
        return (
            <div className={PAGE_CLS}>
                <EmptyCard icon={<UsersThreeIcon />} title="Grup bulunamadı" />
            </div>
        );

    return (
        <div className={PAGE_CLS}>
            {/* iOS nav-bar header */}
            <div className="relative mb-7 flex items-center">
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => navigate(`/${realm}/groups`)}
                    aria-label="Geri"
                >
                    <CaretRightIcon className="rotate-180" weight="bold" />
                </Button>
                <div className="absolute left-1/2 -translate-x-1/2 text-center">
                    <p className="font-semibold">{group.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                        {group.path}
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

            {tab === "members" && <MembersTab group={group} />}
            {tab === "attributes" && <AttributesTab group={group} reload={reload} />}
            {tab === "roles" && <RolesTab group={group} />}
            {tab === "children" && (
                <ChildrenTab
                    group={group}
                    onOpen={cid => navigate(`/${realm}/groups/${cid}`)}
                    reload={reload}
                />
            )}
            {tab === "settings" && (
                <SettingsTab
                    group={group}
                    reload={reload}
                    onDeleted={() => navigate(`/${realm}/groups`)}
                />
            )}
        </div>
    );
}

/* ── Members ──────────────────────────────────────────────────────────── */
function MembersTab({ group }: any) {
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
            const m = await adminClient.groups.listMembers({ id: group.id, max: 200 });
            setMembers(Array.isArray(m) ? m : []);
        } catch (e) {
            addError("Üyeler yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, group.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const removeMember = (u: any) =>
        confirm({
            title: "Üyeyi çıkar",
            message: `${u.username} bu gruptan çıkarılacak.`,
            confirmLabel: "Çıkar",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.delFromGroup({ id: u.id, groupId: group.id });
                    addAlert("Üye çıkarıldı.", AlertVariant.success);
                    setMembers(members.filter(m => m.id !== u.id));
                } catch (e) {
                    addError("Üye çıkarılamadı.", e);
                }
            }
        });

    if (loading) return <Loading />;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="ms-1 text-sm font-medium text-muted-foreground">
                    {members.length} üye
                </h3>
                <Button type="button" variant="plain" size="sm" onClick={() => setAdding(true)}>
                    <UserPlusIcon data-icon="inline-start" /> Üye ekle
                </Button>
            </div>
            {members.length === 0 ? (
                <EmptyCard
                    icon={<UsersThreeIcon />}
                    title="Üye yok"
                    desc="Bu gruba henüz kullanıcı eklenmemiş."
                />
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
                                    <ItemTitle>
                                        <span className="truncate">{u.username}</span>
                                    </ItemTitle>
                                    <ItemDescription className="truncate">
                                        {u.email || "—"}
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => removeMember(u)}
                                        title="Gruptan çıkar"
                                        aria-label="Gruptan çıkar"
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
                    group={group}
                    existing={new Set(members.map(m => m.id))}
                    onClose={() => setAdding(false)}
                    onAdded={() => {
                        setAdding(false);
                        load();
                    }}
                />
            )}
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </div>
    );
}

function AddMemberModal({ group, existing, onClose, onAdded }: any) {
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
            await adminClient.users.addToGroup({ id: u.id, groupId: group.id });
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
                            <Loading />
                        ) : (
                            <ItemGroup variant="inset">
                                {results.length === 0 ? (
                                    <EmptyRow>Kullanıcı bulunamadı.</EmptyRow>
                                ) : (
                                    results.map((u, i) => {
                                        const inGroup = existing.has(u.id);
                                        return (
                                            <Fragment key={u.id}>
                                                {i > 0 && <ItemSeparator />}
                                                <Item size="sm">
                                                    <ItemMedia>
                                                        <Avatar>
                                                            <AvatarFallback>
                                                                {initials(u.username)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </ItemMedia>
                                                    <ItemContent className="min-w-0">
                                                        <ItemTitle>
                                                            <span className="truncate">
                                                                {u.username}
                                                            </span>
                                                        </ItemTitle>
                                                        <ItemDescription className="truncate">
                                                            {u.email || "—"}
                                                        </ItemDescription>
                                                    </ItemContent>
                                                    <ItemActions>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={inGroup ? "ghost" : "tinted"}
                                                            disabled={inGroup || busy === u.id}
                                                            onClick={() => add(u)}
                                                        >
                                                            {inGroup ? "Üye" : "Ekle"}
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

/* ── Attributes ───────────────────────────────────────────────────────── */
function AttributesTab({ group, reload }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const toRows = (attrs: any) =>
        Object.entries(attrs || {}).map(([k, v]: any) => ({
            k,
            v: Array.isArray(v) ? v.join(", ") : String(v)
        }));
    const [rows, setRows] = useState<any[]>(toRows(group.attributes));
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
            await adminClient.groups.update(
                { id: group.id },
                { name: group.name, attributes }
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
                    <EmptyRow>Öznitelik yok.</EmptyRow>
                ) : (
                    rows.map((r, i) => (
                        <Fragment key={i}>
                            {i > 0 && <ItemSeparator />}
                            <Item size="sm">
                                <Input
                                    size="sm"
                                    value={r.k}
                                    onChange={(e: any) => setRow(i, "k", e.target.value)}
                                    placeholder="anahtar"
                                    className="w-2/5"
                                />
                                <span className="text-muted-foreground">:</span>
                                <Input
                                    size="sm"
                                    value={r.v}
                                    onChange={(e: any) => setRow(i, "v", e.target.value)}
                                    placeholder="değer (virgülle ayır)"
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => delRow(i)}
                                    title="Sil"
                                    aria-label="Sil"
                                >
                                    <TrashIcon />
                                </Button>
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

/* ── Role mapping (realm roles) ───────────────────────────────────────── */
function RolesTab({ group }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [assigned, setAssigned] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [picking, setPicking] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const a = await adminClient.groups.listRealmRoleMappings({ id: group.id });
            setAssigned(Array.isArray(a) ? a : []);
        } catch (e) {
            addError("Roller yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, group.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const removeRole = (r: any) =>
        confirm({
            title: "Rolü kaldır",
            message: `“${r.name}” rolü bu gruptan kaldırılacak.`,
            confirmLabel: "Kaldır",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.groups.delRealmRoleMappings({
                        id: group.id,
                        roles: [{ id: r.id, name: r.name }]
                    });
                    addAlert("Rol kaldırıldı.", AlertVariant.success);
                    setAssigned(assigned.filter(x => x.id !== r.id));
                } catch (e) {
                    addError("Kaldırılamadı.", e);
                }
            }
        });

    if (loading) return <Loading />;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="ms-1 text-sm font-medium text-muted-foreground">
                    Atanmış realm rolleri
                </h3>
                <Button type="button" variant="plain" size="sm" onClick={() => setPicking(true)}>
                    <PlusIcon data-icon="inline-start" /> Rol ata
                </Button>
            </div>
            {assigned.length === 0 ? (
                <EmptyCard
                    icon={<ShieldCheckIcon />}
                    title="Rol atanmamış"
                    desc="Bu gruba realm rolü atayarak tüm üyelere toplu yetki ver."
                />
            ) : (
                <ItemGroup variant="inset">
                    {assigned.map((r, i) => (
                        <Fragment key={r.id}>
                            {i > 0 && <ItemSeparator />}
                            <Item size="sm">
                                <ItemMedia variant="icon">
                                    <ShieldCheckIcon />
                                </ItemMedia>
                                <ItemContent className="min-w-0">
                                    <ItemTitle>
                                        <span className="truncate">{r.name}</span>
                                    </ItemTitle>
                                    {r.description && (
                                        <ItemDescription className="truncate">
                                            {r.description}
                                        </ItemDescription>
                                    )}
                                </ItemContent>
                                <ItemActions>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => removeRole(r)}
                                        title="Rolü kaldır"
                                        aria-label="Rolü kaldır"
                                    >
                                        <TrashIcon />
                                    </Button>
                                </ItemActions>
                            </Item>
                        </Fragment>
                    ))}
                </ItemGroup>
            )}
            {picking && (
                <PickRoleModal
                    group={group}
                    assigned={new Set(assigned.map(r => r.id))}
                    onClose={() => setPicking(false)}
                    onAdded={() => {
                        setPicking(false);
                        load();
                    }}
                />
            )}
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </div>
    );
}

function PickRoleModal({ group, assigned, onClose, onAdded }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const a = await adminClient.groups.listAvailableRealmRoleMappings({
                    id: group.id
                });
                setRoles(Array.isArray(a) ? a : []);
            } catch (e) {
                addError("Roller yüklenemedi.", e);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [group.id, adminClient.groups.listAvailableRealmRoleMappings, addError]);

    const toggle = (id: string) =>
        setSel(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const save = async () => {
        const chosen = roles
            .filter(r => sel.has(r.id))
            .map(r => ({ id: r.id, name: r.name }));
        if (chosen.length === 0) return;
        setSaving(true);
        try {
            await adminClient.groups.addRealmRoleMappings({
                id: group.id,
                roles: chosen
            });
            addAlert(`${chosen.length} rol atandı.`, AlertVariant.success);
            onAdded();
        } catch (e) {
            addError("Atanamadı.", e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>Rol ata</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {loading ? (
                        <Loading />
                    ) : (
                        <ItemGroup variant="inset">
                            {roles.length === 0 ? (
                                <EmptyRow>Atanabilecek rol yok.</EmptyRow>
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
                                                    <ItemTitle>
                                                        <span className="truncate">{r.name}</span>
                                                    </ItemTitle>
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
                        {saving ? "Atanıyor…" : `Ata (${sel.size})`}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/* ── Child groups ─────────────────────────────────────────────────────── */
function ChildrenTab({ group, onOpen, reload }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [children, setChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const subs = await adminClient.groups.listSubGroups({
                parentId: group.id,
                briefRepresentation: false
            });
            setChildren(Array.isArray(subs) ? subs : []);
        } catch (e) {
            addError("Alt gruplar yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, group.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const create = async () => {
        const n = name.trim();
        if (!n) return;
        try {
            await adminClient.groups.createChildGroup({ id: group.id }, { name: n });
            addAlert("Alt grup oluşturuldu.", AlertVariant.success);
            setCreating(false);
            setName("");
            load();
            reload();
        } catch (e) {
            addError("Oluşturulamadı.", e);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="ms-1 text-sm font-medium text-muted-foreground">
                    {children.length} alt grup
                </h3>
                <Button type="button" variant="plain" size="sm" onClick={() => setCreating(true)}>
                    <PlusIcon data-icon="inline-start" /> Alt grup
                </Button>
            </div>
            {children.length === 0 ? (
                <EmptyCard
                    icon={<UsersThreeIcon />}
                    title="Alt grup yok"
                    desc="Hiyerarşi oluşturmak için alt grup ekle."
                />
            ) : (
                <ItemGroup variant="inset">
                    {children.map((c, i) => (
                        <Fragment key={c.id}>
                            {i > 0 && <ItemSeparator />}
                            <Item size="sm" asChild>
                                <button type="button" onClick={() => onOpen(c.id)}>
                                    <ItemMedia variant="icon">
                                        <UsersThreeIcon />
                                    </ItemMedia>
                                    <ItemContent className="min-w-0">
                                        <ItemTitle>
                                            <span className="truncate">{c.name}</span>
                                        </ItemTitle>
                                    </ItemContent>
                                    <ItemActions>
                                        <CaretRightIcon className="text-muted-foreground" />
                                    </ItemActions>
                                </button>
                            </Item>
                        </Fragment>
                    ))}
                </ItemGroup>
            )}
            <Modal open={creating} onOpenChange={o => !o && setCreating(false)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>Alt grup oluştur</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <Input
                            autoFocus
                            value={name}
                            onChange={(e: any) => setName(e.target.value)}
                            onKeyDown={(e: any) => e.key === "Enter" && create()}
                            placeholder="Alt grup adı"
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button disabled={!name.trim()} onClick={create}>
                            Oluştur
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}

/* ── Settings ─────────────────────────────────────────────────────────── */
function SettingsTab({ group, reload, onDeleted }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [name, setName] = useState(group.name || "");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        const n = name.trim();
        if (!n) return;
        setSaving(true);
        try {
            await adminClient.groups.update({ id: group.id }, { ...group, name: n });
            addAlert("Grup güncellendi.", AlertVariant.success);
            reload();
        } catch (e) {
            addError("Güncellenemedi.", e);
        } finally {
            setSaving(false);
        }
    };

    const remove = () =>
        confirm({
            title: "Grubu sil",
            message: `“${group.name}” ve tüm alt grupları silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.groups.del({ id: group.id });
                    addAlert("Grup silindi.", AlertVariant.success);
                    onDeleted();
                } catch (e) {
                    addError("Silinemedi.", e);
                }
            }
        });

    return (
        <div className="space-y-6">
            <div>
                <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                    Genel
                </h3>
                <ItemGroup variant="inset">
                    <Item size="sm">
                        <ItemContent>
                            <ItemTitle>
                                <label htmlFor="group-settings-name">Grup adı</label>
                            </ItemTitle>
                            <Input
                                id="group-settings-name"
                                size="sm"
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                            />
                        </ItemContent>
                    </Item>
                    <ItemSeparator />
                    <Item size="sm">
                        <ItemContent>
                            <ItemTitle>Yol</ItemTitle>
                        </ItemContent>
                        <ItemActions>
                            <span className="font-mono text-sm text-muted-foreground">
                                {group.path}
                            </span>
                        </ItemActions>
                    </Item>
                    <ItemSeparator />
                    <Item size="sm">
                        <ItemContent>
                            <ItemTitle>Grup ID</ItemTitle>
                        </ItemContent>
                        <ItemActions>
                            <span className="font-mono text-xs text-muted-foreground">
                                {group.id}
                            </span>
                        </ItemActions>
                    </Item>
                </ItemGroup>
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
                                <ItemTitle className="text-destructive">Grubu sil</ItemTitle>
                            </ItemContent>
                        </button>
                    </Item>
                </ItemGroup>
                <p className="mt-2 ms-1 text-sm text-muted-foreground">
                    Grup ve tüm alt grupları kalıcı olarak silinir.
                </p>
            </div>
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </div>
    );
}
