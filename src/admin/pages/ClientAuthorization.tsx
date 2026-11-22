// @ts-nocheck

import {
    CheckCircleIcon,
    DownloadSimpleIcon,
    ExportIcon,
    FlaskIcon,
    KeyIcon,
    LockKeyIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    ScalesIcon,
    ShieldCheckIcon,
    TrashIcon,
    XCircleIcon
} from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { CodeBlock, CodeBlockContent } from "@ui/components/code-block";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
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
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs";
import { Textarea } from "@ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@ui/components/toggle-group";
import { cn } from "@ui/lib/utils";
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
import {
    Children,
    cloneElement,
    Fragment,
    isValidElement,
    type ReactNode,
    useCallback,
    useEffect,
    useState
} from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";

/* ── helpers ────────────────────────────────────────────────────────────── */
const NONE = "__none__";
const lines = (s: string) =>
    (s || "")
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);
const arr = (v: any) => (Array.isArray(v) ? v.join("\n") : "");
const resId = (r: any) => r?._id ?? r?.id;

/** Apple-style multi-select chips inside a StackRow. */
function ChipPicker({
    options,
    selected,
    onToggle,
    getKey,
    getLabel,
    emptyText = "Seçenek yok."
}: any) {
    const sel: string[] = Array.isArray(selected) ? selected : [];
    if (!options || options.length === 0) {
        return <p className="text-sm text-muted-foreground">{emptyText}</p>;
    }
    const keys = options.map((o: any) => String(getKey(o)));
    return (
        <ToggleGroup
            type="multiple"
            variant="outline"
            size="sm"
            spacing={1.5}
            className="flex-wrap justify-start"
            value={sel.map(String).filter(k => keys.includes(k))}
            onValueChange={(next: string[]) => {
                const cur = sel.map(String);
                options.forEach((o: any) => {
                    const k = getKey(o);
                    if (cur.includes(String(k)) !== next.includes(String(k))) onToggle(k);
                });
            }}
        >
            {options.map((o: any) => {
                const k = getKey(o);
                const on = sel.includes(k);
                return (
                    <ToggleGroupItem key={k} value={String(k)}>
                        {on && <CheckCircleIcon weight="fill" />}
                        {getLabel(o)}
                    </ToggleGroupItem>
                );
            })}
        </ToggleGroup>
    );
}

/* ── root ───────────────────────────────────────────────────────────────── */
export default function ClientAuthorization({ id }: { id: string }) {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [tab, setTab] = useState("settings");

    const tabs = [
        { key: "settings", label: "Ayarlar" },
        { key: "resources", label: "Kaynaklar" },
        { key: "scopes", label: "Kapsamlar" },
        { key: "policies", label: "Politikalar" },
        { key: "permissions", label: "İzinler" },
        { key: "evaluate", label: "Değerlendir" },
        { key: "export", label: "Dışa Aktar" }
    ];

    const shared = { id, realm, adminClient, addAlert, addError };

    return (
        <div className="space-y-6">
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList variant="line">
                    {tabs.map(t => (
                        <TabsTrigger key={t.key} value={t.key}>
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            {tab === "settings" && <SettingsTab {...shared} />}
            {tab === "resources" && <ResourcesTab {...shared} />}
            {tab === "scopes" && <ScopesTab {...shared} />}
            {tab === "policies" && <PoliciesTab {...shared} />}
            {tab === "permissions" && <PermissionsTab {...shared} />}
            {tab === "evaluate" && <EvaluateTab {...shared} />}
            {tab === "export" && <ExportTab {...shared} />}
        </div>
    );
}

/* ── 1. Ayarlar (resource server settings) ──────────────────────────────── */
const ENFORCEMENT_MODES = [
    { value: "ENFORCING", label: "Zorlayıcı" },
    { value: "PERMISSIVE", label: "İzin verici" },
    { value: "DISABLED", label: "Devre dışı" }
];
const DECISION_STRATEGIES = [
    { value: "UNANIMOUS", label: "Oybirliği" },
    { value: "AFFIRMATIVE", label: "Olumlu" },
    { value: "CONSENSUS", label: "Uzlaşı" }
];

function SettingsTab({ id, adminClient, addAlert, addError }: any) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const rs = await adminClient.clients.getResourceServer({ id });
            setSettings(rs ?? {});
        } catch (err) {
            addError("Kaynak sunucusu ayarları yüklenemedi.", err);
            setSettings({});
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const set = (key: string, value: any) =>
        setSettings((s: any) => ({ ...(s || {}), [key]: value }));

    const save = async () => {
        setSaving(true);
        try {
            await adminClient.clients.updateResourceServer({ id }, settings);
            addAlert("Ayarlar kaydedildi.", AlertVariant.success);
            await load();
        } catch (err) {
            addError("Ayarlar kaydedilemedi.", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );
    if (!settings)
        return <EmptyCard icon={<LockKeyIcon />} title="Ayarlar yüklenemedi" />;

    return (
        <div className="space-y-6">
            <div>
                <GroupLabel>Kaynak sunucusu</GroupLabel>
                <Group>
                    <SwitchRow
                        label="Uzaktan kaynak yönetimine izin ver"
                        hint="İstemcinin Protection API ile kaynak yönetmesine izin verir."
                        checked={!!settings.allowRemoteResourceManagement}
                        onChange={(v: boolean) => set("allowRemoteResourceManagement", v)}
                    />
                    <Row label="Politika uygulama modu">
                        <Select
                            value={settings.policyEnforcementMode ?? "ENFORCING"}
                            onValueChange={(v: string) => set("policyEnforcementMode", v)}
                        >
                            <SelectTrigger aria-label="Politika uygulama modu">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {ENFORCEMENT_MODES.map(o => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Row>
                    <Row label="Karar stratejisi">
                        <Select
                            value={settings.decisionStrategy ?? "UNANIMOUS"}
                            onValueChange={(v: string) => set("decisionStrategy", v)}
                        >
                            <SelectTrigger aria-label="Karar stratejisi">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {DECISION_STRATEGIES.map(o => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Row>
                </Group>
                <GroupFooter>
                    Karar stratejisi, birden çok izin değerlendirildiğinde nihai kararın
                    nasıl verileceğini belirler.
                </GroupFooter>
            </div>

            <div className="flex justify-end">
                <Button
                    disabled={saving}
                    onClick={save}
                >
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>
        </div>
    );
}

/* ── 2. Kaynaklar (resources) ───────────────────────────────────────────── */
function ResourcesTab({ id, adminClient, addAlert, addError }: any) {
    const [confirm, confirmNode] = useConfirmDialog();
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState<any[]>([]);
    const [scopes, setScopes] = useState<any[]>([]);
    const [editing, setEditing] = useState<any>(null);
    const [open, setOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [res, scp] = await Promise.all([
                adminClient.clients.listResources({ id }).catch(() => []),
                adminClient.clients.listAllScopes({ id }).catch(() => [])
            ]);
            setResources(Array.isArray(res) ? res : []);
            setScopes(Array.isArray(scp) ? scp : []);
        } catch (err) {
            addError("Kaynaklar yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (r: any) =>
        confirm({
            title: "Kaynağı sil",
            message: `“${r.name}” kaynağı silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delResource({ id, resourceId: resId(r) });
                    addAlert("Kaynak silindi.", AlertVariant.success);
                    await load();
                } catch (err) {
                    addError("Kaynak silinemedi.", err);
                }
            }
        });

    if (loading) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <GroupLabel>{resources.length} kaynak</GroupLabel>
                <Button
                    variant="plain"
                    size="sm"
                    onClick={() => {
                        setEditing(null);
                        setOpen(true);
                    }}
                >
                    <PlusIcon /> Kaynak oluştur
                </Button>
            </div>

            {resources.length === 0 ? (
                <EmptyCard
                    icon={<LockKeyIcon />}
                    title="Kaynak yok"
                    desc="Yetkilendirme ile korunacak ilk kaynağı oluştur."
                    action={
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setEditing(null);
                                setOpen(true);
                            }}
                        >
                            Kaynak oluştur
                        </Button>
                    }
                />
            ) : (
                <Group>
                    {resources.map(r => (
                        <Item key={resId(r)} size="sm">
                            <ItemMedia variant="icon">
                                <LockKeyIcon weight="fill" />
                            </ItemMedia>
                            <ItemContent
                                className="min-w-0 cursor-pointer"
                                onClick={() => {
                                    setEditing(r);
                                    setOpen(true);
                                }}
                            >
                                <ItemTitle>{r.displayName || r.name}</ItemTitle>
                                <ItemDescription className="truncate">
                                    {r.type ||
                                        (Array.isArray(r.uris) && r.uris.length
                                            ? r.uris.join(", ")
                                            : "—")}
                                </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                                <RowDelete onClick={() => remove(r)} />
                            </ItemActions>
                        </Item>
                    ))}
                </Group>
            )}

            {open && (
                <ResourceModal
                    id={id}
                    adminClient={adminClient}
                    addAlert={addAlert}
                    addError={addError}
                    resource={editing}
                    scopes={scopes}
                    onClose={() => setOpen(false)}
                    onSaved={async () => {
                        setOpen(false);
                        await load();
                    }}
                />
            )}
            {confirmNode}
        </div>
    );
}

function ResourceModal({
    id,
    adminClient,
    addAlert,
    addError,
    resource,
    scopes,
    onClose,
    onSaved
}: any) {
    const isEdit = !!resId(resource);
    const [name, setName] = useState(resource?.name ?? "");
    const [displayName, setDisplayName] = useState(resource?.displayName ?? "");
    const [type, setType] = useState(resource?.type ?? "");
    const [uris, setUris] = useState(arr(resource?.uris));
    const [selScopes, setSelScopes] = useState<string[]>(
        (Array.isArray(resource?.scopes) ? resource.scopes : []).map(
            (s: any) => s.name ?? s
        )
    );
    const [saving, setSaving] = useState(false);

    const toggleScope = (k: string) =>
        setSelScopes(prev =>
            prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
        );

    const save = async () => {
        if (!name.trim()) {
            addError("Kaynak adı gerekli.", new Error("name"));
            return;
        }
        setSaving(true);
        try {
            const rep: any = {
                name: name.trim(),
                displayName: displayName.trim() || undefined,
                type: type.trim() || undefined,
                uris: lines(uris),
                scopes: selScopes.map(n => {
                    const found = (scopes || []).find((s: any) => s.name === n);
                    return found ? { id: found.id, name: found.name } : { name: n };
                })
            };
            if (isEdit) {
                await adminClient.clients.updateResource(
                    { id, resourceId: resId(resource) },
                    { ...resource, ...rep }
                );
                addAlert("Kaynak güncellendi.", AlertVariant.success);
            } else {
                await adminClient.clients.createResource({ id }, rep);
                addAlert("Kaynak oluşturuldu.", AlertVariant.success);
            }
            await onSaved();
        } catch (err) {
            addError(isEdit ? "Kaynak güncellenemedi." : "Kaynak oluşturulamadı.", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{isEdit ? "Kaynağı düzenle" : "Kaynak oluştur"}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Field>
                            <FieldLabel>Ad <span className="text-destructive">*</span></FieldLabel>
                            <Input
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                                placeholder="resource-name"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>Görünen ad</FieldLabel>
                            <Input
                                value={displayName}
                                onChange={(e: any) => setDisplayName(e.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel>Tür</FieldLabel>
                            <Input
                                value={type}
                                onChange={(e: any) => setType(e.target.value)}
                                placeholder="urn:example:resource"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>URI'ler</FieldLabel>
                            <Textarea
                                rows={3}
                                value={uris}
                                onChange={(e: any) => setUris(e.target.value)}
                                placeholder="/api/resource/*"
                            />
                            <FieldDescription>Her satıra bir URI.</FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel>Kapsamlar</FieldLabel>
                            <ChipPicker
                                options={scopes}
                                selected={selScopes}
                                onToggle={toggleScope}
                                getKey={(s: any) => s.name}
                                getLabel={(s: any) => s.name}
                                emptyText="Henüz kapsam tanımlı değil."
                            />
                        </Field>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={saving}
                        onClick={save}
                    >
                        {isEdit ? "Kaydet" : "Oluştur"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/* ── 3. Kapsamlar (authorization scopes) ────────────────────────────────── */
function ScopesTab({ id, adminClient, addAlert, addError }: any) {
    const [confirm, confirmNode] = useConfirmDialog();
    const [loading, setLoading] = useState(true);
    const [scopes, setScopes] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await adminClient.clients.listAllScopes({ id });
            setScopes(Array.isArray(list) ? list : []);
        } catch (err) {
            addError("Kapsamlar yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (s: any) =>
        confirm({
            title: "Kapsamı sil",
            message: `“${s.name}” kapsamı silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delAuthorizationScope({
                        id,
                        scopeId: s.id
                    });
                    addAlert("Kapsam silindi.", AlertVariant.success);
                    await load();
                } catch (err) {
                    addError("Kapsam silinemedi.", err);
                }
            }
        });

    if (loading) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <GroupLabel>{scopes.length} kapsam</GroupLabel>
                <Button
                    variant="plain"
                    size="sm"
                    onClick={() => {
                        setEditing(null);
                        setOpen(true);
                    }}
                >
                    <PlusIcon /> Kapsam oluştur
                </Button>
            </div>

            {scopes.length === 0 ? (
                <EmptyCard
                    icon={<KeyIcon />}
                    title="Kapsam yok"
                    desc="Kaynaklar üzerinde uygulanabilecek eylemleri tanımla."
                    action={
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setEditing(null);
                                setOpen(true);
                            }}
                        >
                            Kapsam oluştur
                        </Button>
                    }
                />
            ) : (
                <Group>
                    {scopes.map(s => (
                        <Item key={s.id} size="sm">
                            <ItemMedia variant="icon">
                                <KeyIcon weight="fill" />
                            </ItemMedia>
                            <ItemContent
                                className="min-w-0 cursor-pointer"
                                onClick={() => {
                                    setEditing(s);
                                    setOpen(true);
                                }}
                            >
                                <ItemTitle>{s.name}</ItemTitle>
                                {s.displayName && (
                                    <ItemDescription className="truncate">
                                        {s.displayName}
                                    </ItemDescription>
                                )}
                            </ItemContent>
                            <ItemActions>
                                <RowDelete onClick={() => remove(s)} />
                            </ItemActions>
                        </Item>
                    ))}
                </Group>
            )}

            {open && (
                <ScopeModal
                    id={id}
                    adminClient={adminClient}
                    addAlert={addAlert}
                    addError={addError}
                    scope={editing}
                    onClose={() => setOpen(false)}
                    onSaved={async () => {
                        setOpen(false);
                        await load();
                    }}
                />
            )}
            {confirmNode}
        </div>
    );
}

function ScopeModal({
    id,
    adminClient,
    addAlert,
    addError,
    scope,
    onClose,
    onSaved
}: any) {
    const isEdit = !!scope?.id;
    const [name, setName] = useState(scope?.name ?? "");
    const [displayName, setDisplayName] = useState(scope?.displayName ?? "");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!name.trim()) {
            addError("Kapsam adı gerekli.", new Error("name"));
            return;
        }
        setSaving(true);
        try {
            const rep = {
                name: name.trim(),
                displayName: displayName.trim() || undefined
            };
            if (isEdit) {
                await adminClient.clients.updateAuthorizationScope(
                    { id, scopeId: scope.id },
                    { ...scope, ...rep }
                );
                addAlert("Kapsam güncellendi.", AlertVariant.success);
            } else {
                await adminClient.clients.createAuthorizationScope({ id }, rep);
                addAlert("Kapsam oluşturuldu.", AlertVariant.success);
            }
            await onSaved();
        } catch (err) {
            addError(isEdit ? "Kapsam güncellenemedi." : "Kapsam oluşturulamadı.", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{isEdit ? "Kapsamı düzenle" : "Kapsam oluştur"}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Field>
                            <FieldLabel>Ad <span className="text-destructive">*</span></FieldLabel>
                            <Input
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                                placeholder="read"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>Görünen ad</FieldLabel>
                            <Input
                                value={displayName}
                                onChange={(e: any) => setDisplayName(e.target.value)}
                            />
                        </Field>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={saving}
                        onClick={save}
                    >
                        {isEdit ? "Kaydet" : "Oluştur"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/* ── 4. Politikalar (policies) ──────────────────────────────────────────── */
// Per-type dynamic config fields. listPolicyProviders only returns type/name/
// description (no schema), so we describe the well-known providers here.
const POLICY_FIELDS: Record<string, any[]> = {
    role: [{ key: "roles", kind: "roles" }],
    user: [{ key: "users", kind: "users" }],
    group: [
        { key: "groups", kind: "groups" },
        { key: "groupsClaim", kind: "text", label: "Gruplar talebi (claim)" }
    ],
    client: [{ key: "clients", kind: "clients" }],
    "client-scope": [{ key: "clientScopes", kind: "clientScopes" }],
    time: [
        { key: "nbf", kind: "datetime", label: "Şu tarihten sonra (not before)" },
        { key: "noa", kind: "datetime", label: "Şu tarihten önce (not on or after)" },
        { key: "dayMonth", kind: "text", label: "Ayın günü (başlangıç)" },
        { key: "dayMonthEnd", kind: "text", label: "Ayın günü (bitiş)" },
        { key: "month", kind: "text", label: "Ay (başlangıç)" },
        { key: "monthEnd", kind: "text", label: "Ay (bitiş)" },
        { key: "year", kind: "text", label: "Yıl (başlangıç)" },
        { key: "yearEnd", kind: "text", label: "Yıl (bitiş)" },
        { key: "hour", kind: "text", label: "Saat (başlangıç)" },
        { key: "hourEnd", kind: "text", label: "Saat (bitiş)" },
        { key: "minute", kind: "text", label: "Dakika (başlangıç)" },
        { key: "minuteEnd", kind: "text", label: "Dakika (bitiş)" }
    ],
    regex: [
        { key: "targetClaim", kind: "text", label: "Hedef talep (claim)" },
        { key: "pattern", kind: "text", label: "Desen (regex)" }
    ],
    aggregate: [{ key: "applyPolicies", kind: "policies" }]
};

const LOGIC_OPTIONS = [
    { value: "POSITIVE", label: "Olumlu" },
    { value: "NEGATIVE", label: "Olumsuz" }
];
const DECISION_STRAT_OPTIONS = [
    { value: "UNANIMOUS", label: "Oybirliği" },
    { value: "AFFIRMATIVE", label: "Olumlu" },
    { value: "CONSENSUS", label: "Uzlaşı" }
];

function PoliciesTab({ id, adminClient, addAlert, addError }: any) {
    const [confirm, confirmNode] = useConfirmDialog();
    const [loading, setLoading] = useState(true);
    const [policies, setPolicies] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [aux, setAux] = useState<any>({
        roles: [],
        users: [],
        groups: [],
        clients: [],
        clientScopes: [],
        allPolicies: []
    });
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [providerMenu, setProviderMenu] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [pol, prov, roles, users, groups, clients, clientScopes] =
                await Promise.all([
                    adminClient.clients
                        .listPolicies({ id, permission: false })
                        .catch(() => []),
                    adminClient.clients.listPolicyProviders({ id }).catch(() => []),
                    adminClient.roles.find().catch(() => []),
                    adminClient.users.find({ max: 100 }).catch(() => []),
                    adminClient.groups.find().catch(() => []),
                    adminClient.clients.find().catch(() => []),
                    adminClient.clientScopes.find().catch(() => [])
                ]);
            const allPol = Array.isArray(pol) ? pol : [];
            setPolicies(allPol);
            // Drop "resource"/"scope" providers — those are permissions, not policies.
            setProviders(
                (Array.isArray(prov) ? prov : []).filter(
                    (p: any) => p.type !== "resource" && p.type !== "scope"
                )
            );
            setAux({
                roles: Array.isArray(roles) ? roles : [],
                users: Array.isArray(users) ? users : [],
                groups: Array.isArray(groups) ? groups : [],
                clients: Array.isArray(clients) ? clients : [],
                clientScopes: Array.isArray(clientScopes) ? clientScopes : [],
                allPolicies: allPol
            });
        } catch (err) {
            addError("Politikalar yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (p: any) =>
        confirm({
            title: "Politikayı sil",
            message: `“${p.name}” politikası silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delPolicy({ id, policyId: p.id });
                    addAlert("Politika silindi.", AlertVariant.success);
                    await load();
                } catch (err) {
                    addError("Politika silinemedi.", err);
                }
            }
        });

    if (loading) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <GroupLabel>{policies.length} politika</GroupLabel>
                <DropdownMenu open={providerMenu} onOpenChange={setProviderMenu}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="plain"
                            size="sm"
                        >
                            <PlusIcon /> Politika oluştur
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        {providers.length === 0 && (
                            <DropdownMenuItem disabled>Sağlayıcı yok</DropdownMenuItem>
                        )}
                        {providers.map((p: any) => (
                            <DropdownMenuItem
                                key={p.type}
                                onClick={() => {
                                    setEditing({ type: p.type, providerName: p.name });
                                    setOpen(true);
                                }}
                            >
                                {p.name || p.type}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {policies.length === 0 ? (
                <EmptyCard
                    icon={<ScalesIcon />}
                    title="Politika yok"
                    desc="Bir iznin verilip verilmeyeceğine karar veren kuralları tanımla."
                />
            ) : (
                <Group>
                    {policies.map(p => (
                        <Item key={p.id} size="sm">
                            <ItemMedia variant="icon">
                                <ScalesIcon weight="fill" />
                            </ItemMedia>
                            <ItemContent
                                className="min-w-0 cursor-pointer"
                                onClick={() => {
                                    setEditing({ ...p });
                                    setOpen(true);
                                }}
                            >
                                <ItemTitle>{p.name}</ItemTitle>
                                <ItemDescription className="truncate">
                                    {p.type}
                                    {p.description ? ` · ${p.description}` : ""}
                                </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                                <RowDelete onClick={() => remove(p)} />
                            </ItemActions>
                        </Item>
                    ))}
                </Group>
            )}

            {open && (
                <PolicyModal
                    id={id}
                    adminClient={adminClient}
                    addAlert={addAlert}
                    addError={addError}
                    policy={editing}
                    aux={aux}
                    onClose={() => setOpen(false)}
                    onSaved={async () => {
                        setOpen(false);
                        await load();
                    }}
                />
            )}
            {confirmNode}
        </div>
    );
}

function PolicyModal({
    id,
    adminClient,
    addAlert,
    addError,
    policy,
    aux,
    onClose,
    onSaved
}: any) {
    const isEdit = !!policy?.id;
    const type = policy?.type ?? "";
    const fields = POLICY_FIELDS[type] || [];
    const [name, setName] = useState(policy?.name ?? "");
    const [description, setDescription] = useState(policy?.description ?? "");
    const [logic, setLogic] = useState(policy?.logic ?? "POSITIVE");
    const [decisionStrategy, setDecisionStrategy] = useState(
        policy?.decisionStrategy ?? "UNANIMOUS"
    );
    const [config, setConfig] = useState<any>(() => initConfig(policy, fields));
    const [loadingDetail, setLoadingDetail] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    // For edits, pull the full policy (config lives on the type-specific endpoint).
    useEffect(() => {
        let alive = true;
        if (!isEdit) return;
        (async () => {
            try {
                const detail = await adminClient.clients
                    .findOnePolicy({ id, policyId: policy.id, type })
                    .catch(() => null);
                if (alive && detail) {
                    setConfig(initConfig({ ...policy, ...detail }, fields));
                    if (detail.logic) setLogic(detail.logic);
                    if (detail.decisionStrategy)
                        setDecisionStrategy(detail.decisionStrategy);
                }
            } finally {
                if (alive) setLoadingDetail(false);
            }
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, isEdit, policy, fields, adminClient.clients.findOnePolicy, type]);

    const setCfg = (k: string, v: any) => setConfig((c: any) => ({ ...c, [k]: v }));

    const save = async () => {
        if (!name.trim()) {
            addError("Politika adı gerekli.", new Error("name"));
            return;
        }
        setSaving(true);
        try {
            const rep: any = {
                name: name.trim(),
                description: description.trim() || undefined,
                type,
                logic,
                ...buildPolicyPayload(type, fields, config)
            };
            if (type === "aggregate") rep.decisionStrategy = decisionStrategy;
            if (isEdit) {
                await adminClient.clients.updatePolicy(
                    { id, type, policyId: policy.id },
                    { ...policy, ...rep }
                );
                addAlert("Politika güncellendi.", AlertVariant.success);
            } else {
                await adminClient.clients.createPolicy({ id, type }, rep);
                addAlert("Politika oluşturuldu.", AlertVariant.success);
            }
            await onSaved();
        } catch (err) {
            addError(
                isEdit ? "Politika güncellenemedi." : "Politika oluşturulamadı.",
                err
            );
        } finally {
            setSaving(false);
        }
    };

    const title = isEdit
        ? "Politikayı düzenle"
        : `Politika oluştur · ${policy?.providerName || type}`;

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{title}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {loadingDetail ? (
                        <div className="flex justify-center py-16">
                            <Spinner className="size-6" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Field>
                                <FieldLabel>Ad <span className="text-destructive">*</span></FieldLabel>
                                <Input
                                    value={name}
                                    onChange={(e: any) => setName(e.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Açıklama</FieldLabel>
                                <Textarea
                                    rows={2}
                                    value={description}
                                    onChange={(e: any) => setDescription(e.target.value)}
                                />
                            </Field>

                            {fields.map(f => (
                                <PolicyField
                                    key={f.key}
                                    field={f}
                                    value={config[f.key]}
                                    onChange={(v: any) => setCfg(f.key, v)}
                                    aux={aux}
                                />
                            ))}

                            <Field>
                                <FieldLabel>Mantık</FieldLabel>
                                <Select value={logic} onValueChange={setLogic}>
                                    <SelectTrigger className="w-full" aria-label="Mantık">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        {LOGIC_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldDescription>Politika sonucunu uygula (Olumlu) ya da tersine çevir (Olumsuz).</FieldDescription>
                            </Field>

                            {type === "aggregate" && (
                                <Field>
                                    <FieldLabel>Karar stratejisi</FieldLabel>
                                    <Select
                                        value={decisionStrategy}
                                        onValueChange={setDecisionStrategy}
                                    >
                                        <SelectTrigger
                                            className="w-full"
                                            aria-label="Karar stratejisi"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="start">
                                            {DECISION_STRAT_OPTIONS.map(o => (
                                                <SelectItem key={o.value} value={o.value}>
                                                    {o.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={saving}
                        onClick={save}
                    >
                        {isEdit ? "Kaydet" : "Oluştur"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/** Initialise config-field state from an existing policy representation. */
function initConfig(policy: any, fields: any[]) {
    const out: any = {};
    const cfg = policy?.config || {};
    fields.forEach(f => {
        if (f.kind === "roles") {
            out[f.key] = (policy?.roles || parseJson(cfg.roles) || []).map(
                (r: any) => r.id ?? r
            );
        } else if (f.kind === "policies") {
            out[f.key] = policy?.policies || parseJson(cfg.applyPolicies) || [];
        } else if (["users", "groups", "clients", "clientScopes"].includes(f.kind)) {
            const raw = policy?.[f.key] ?? cfg[f.key];
            out[f.key] = Array.isArray(raw) ? raw : parseJson(raw) || [];
        } else {
            out[f.key] = policy?.[f.key] ?? cfg[f.key] ?? "";
        }
    });
    return out;
}

function parseJson(v: any) {
    if (Array.isArray(v)) return v;
    if (typeof v !== "string") return null;
    try {
        return JSON.parse(v);
    } catch {
        return null;
    }
}

/** Convert config-field state into the policy payload Keycloak expects. */
function buildPolicyPayload(_type: string, fields: any[], config: any) {
    const out: any = {};
    fields.forEach(f => {
        const v = config[f.key];
        if (f.kind === "roles") {
            out.roles = (v || []).map((rid: string) => ({ id: rid, required: false }));
        } else if (f.kind === "policies") {
            out.policies = v || [];
        } else if (["users", "groups", "clients", "clientScopes"].includes(f.kind)) {
            out[f.key] = v || [];
        } else if (f.kind === "datetime") {
            if (v) out[f.key] = v;
        } else {
            if (v !== "" && v != null) out[f.key] = v;
        }
    });
    return out;
}

function PolicyField({ field, value, onChange, aux }: any) {
    const toggle = (k: string) => {
        const cur: string[] = Array.isArray(value) ? value : [];
        onChange(cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]);
    };

    switch (field.kind) {
        case "roles":
            return (
                <Field>
                    <FieldLabel>Roller</FieldLabel>
                    <ChipPicker
                        options={aux.roles}
                        selected={value}
                        onToggle={toggle}
                        getKey={(r: any) => r.id}
                        getLabel={(r: any) => r.name}
                        emptyText="Rol yok."
                    />
                </Field>
            );
        case "users":
            return (
                <Field>
                    <FieldLabel>Kullanıcılar</FieldLabel>
                    <ChipPicker
                        options={aux.users}
                        selected={value}
                        onToggle={toggle}
                        getKey={(u: any) => u.id}
                        getLabel={(u: any) => u.username}
                        emptyText="Kullanıcı yok."
                    />
                </Field>
            );
        case "groups":
            return (
                <Field>
                    <FieldLabel>Gruplar</FieldLabel>
                    <ChipPicker
                        options={aux.groups}
                        selected={value}
                        onToggle={toggle}
                        getKey={(g: any) => g.id}
                        getLabel={(g: any) => g.name}
                        emptyText="Grup yok."
                    />
                </Field>
            );
        case "clients":
            return (
                <Field>
                    <FieldLabel>İstemciler</FieldLabel>
                    <ChipPicker
                        options={aux.clients}
                        selected={value}
                        onToggle={toggle}
                        getKey={(c: any) => c.id}
                        getLabel={(c: any) => c.clientId}
                        emptyText="İstemci yok."
                    />
                </Field>
            );
        case "clientScopes":
            return (
                <Field>
                    <FieldLabel>İstemci kapsamları</FieldLabel>
                    <ChipPicker
                        options={aux.clientScopes}
                        selected={value}
                        onToggle={toggle}
                        getKey={(c: any) => c.id}
                        getLabel={(c: any) => c.name}
                        emptyText="İstemci kapsamı yok."
                    />
                </Field>
            );
        case "policies":
            return (
                <Field>
                    <FieldLabel>Uygulanan politikalar</FieldLabel>
                    <ChipPicker
                        options={aux.allPolicies}
                        selected={value}
                        onToggle={toggle}
                        getKey={(p: any) => p.id}
                        getLabel={(p: any) => p.name}
                        emptyText="Politika yok."
                    />
                </Field>
            );
        case "datetime":
            return (
                <Field>
                    {field.label && (
                        <FieldLabel>{field.label}</FieldLabel>
                    )}
                    <Input
                        type="datetime-local"
                        value={value || ""}
                        onChange={(e: any) => onChange(e.target.value)}
                    />
                </Field>
            );
        default:
            return (
                <Field>
                    {field.label && (
                        <FieldLabel>{field.label}</FieldLabel>
                    )}
                    <Input
                        value={value || ""}
                        onChange={(e: any) => onChange(e.target.value)}
                    />
                </Field>
            );
    }
}

/* ── 5. İzinler (permissions) ───────────────────────────────────────────── */
const PERMISSION_TYPES = [
    { value: "resource", label: "Kaynak tabanlı" },
    { value: "scope", label: "Kapsam tabanlı" }
];

function PermissionsTab({ id, adminClient, addAlert, addError }: any) {
    const [confirm, confirmNode] = useConfirmDialog();
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [scopes, setScopes] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [menu, setMenu] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [perms, res, scp, pol] = await Promise.all([
                adminClient.clients.findPermissions({ id }).catch(() => []),
                adminClient.clients.listResources({ id }).catch(() => []),
                adminClient.clients.listAllScopes({ id }).catch(() => []),
                adminClient.clients
                    .listPolicies({ id, permission: false })
                    .catch(() => [])
            ]);
            setPermissions(Array.isArray(perms) ? perms : []);
            setResources(Array.isArray(res) ? res : []);
            setScopes(Array.isArray(scp) ? scp : []);
            setPolicies(Array.isArray(pol) ? pol : []);
        } catch (err) {
            addError("İzinler yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (p: any) =>
        confirm({
            title: "İzni sil",
            message: `“${p.name}” izni silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delPermission({
                        id,
                        type: p.type,
                        permissionId: p.id
                    });
                    addAlert("İzin silindi.", AlertVariant.success);
                    await load();
                } catch (err) {
                    addError("İzin silinemedi.", err);
                }
            }
        });

    if (loading) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <GroupLabel>{permissions.length} izin</GroupLabel>
                <DropdownMenu open={menu} onOpenChange={setMenu}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="plain"
                            size="sm"
                        >
                            <PlusIcon /> İzin oluştur
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {PERMISSION_TYPES.map(t => (
                            <DropdownMenuItem
                                key={t.value}
                                onClick={() => {
                                    setEditing({ type: t.value });
                                    setOpen(true);
                                }}
                            >
                                {t.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {permissions.length === 0 ? (
                <EmptyCard
                    icon={<ShieldCheckIcon />}
                    title="İzin yok"
                    desc="Politikaları kaynaklara ve kapsamlara bağlayarak erişimi kontrol et."
                />
            ) : (
                <Group>
                    {permissions.map(p => (
                        <Item key={p.id} size="sm">
                            <ItemMedia variant="icon">
                                <ShieldCheckIcon weight="fill" />
                            </ItemMedia>
                            <ItemContent
                                className="min-w-0 cursor-pointer"
                                onClick={() => {
                                    setEditing({ ...p });
                                    setOpen(true);
                                }}
                            >
                                <ItemTitle>{p.name}</ItemTitle>
                                <ItemDescription className="truncate">
                                    {p.type === "scope"
                                        ? "Kapsam tabanlı"
                                        : "Kaynak tabanlı"}
                                    {p.description ? ` · ${p.description}` : ""}
                                </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                                <RowDelete onClick={() => remove(p)} />
                            </ItemActions>
                        </Item>
                    ))}
                </Group>
            )}

            {open && (
                <PermissionModal
                    id={id}
                    adminClient={adminClient}
                    addAlert={addAlert}
                    addError={addError}
                    permission={editing}
                    resources={resources}
                    scopes={scopes}
                    policies={policies}
                    onClose={() => setOpen(false)}
                    onSaved={async () => {
                        setOpen(false);
                        await load();
                    }}
                />
            )}
            {confirmNode}
        </div>
    );
}

function PermissionModal({
    id,
    adminClient,
    addAlert,
    addError,
    permission,
    resources,
    scopes,
    policies,
    onClose,
    onSaved
}: any) {
    const isEdit = !!permission?.id;
    const type = permission?.type || "resource";
    const [name, setName] = useState(permission?.name ?? "");
    const [description, setDescription] = useState(permission?.description ?? "");
    const [decisionStrategy, setDecisionStrategy] = useState(
        permission?.decisionStrategy ?? "UNANIMOUS"
    );
    const [selResources, setSelResources] = useState<string[]>([]);
    const [selScopes, setSelScopes] = useState<string[]>([]);
    const [selPolicies, setSelPolicies] = useState<string[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    // Permissions store their associations on separate endpoints.
    useEffect(() => {
        let alive = true;
        if (!isEdit) return;
        (async () => {
            try {
                const [res, scp, pol] = await Promise.all([
                    adminClient.clients
                        .getAssociatedResources({ id, permissionId: permission.id })
                        .catch(() => []),
                    adminClient.clients
                        .getAssociatedScopes({ id, permissionId: permission.id })
                        .catch(() => []),
                    adminClient.clients
                        .getAssociatedPolicies({ id, permissionId: permission.id })
                        .catch(() => [])
                ]);
                if (!alive) return;
                setSelResources(
                    (Array.isArray(res) ? res : []).map((r: any) => resId(r))
                );
                setSelScopes((Array.isArray(scp) ? scp : []).map((s: any) => s.id));
                setSelPolicies((Array.isArray(pol) ? pol : []).map((p: any) => p.id));
            } finally {
                if (alive) setLoadingDetail(false);
            }
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isEdit,
        permission.id,
        id,
        adminClient.clients.getAssociatedResources,
        adminClient.clients.getAssociatedScopes,
        adminClient.clients.getAssociatedPolicies
    ]);

    const toggle = (setter: any) => (k: string) =>
        setter((cur: string[]) =>
            cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]
        );

    const save = async () => {
        if (!name.trim()) {
            addError("İzin adı gerekli.", new Error("name"));
            return;
        }
        setSaving(true);
        try {
            const rep: any = {
                name: name.trim(),
                description: description.trim() || undefined,
                type,
                decisionStrategy,
                policies: selPolicies
            };
            if (type === "resource") {
                rep.resources = selResources;
            } else {
                rep.scopes = selScopes;
                if (selResources.length) rep.resources = selResources;
            }
            if (isEdit) {
                await adminClient.clients.updatePermission(
                    { id, type, permissionId: permission.id },
                    { ...permission, ...rep }
                );
                addAlert("İzin güncellendi.", AlertVariant.success);
            } else {
                await adminClient.clients.createPermission({ id, type }, rep);
                addAlert("İzin oluşturuldu.", AlertVariant.success);
            }
            await onSaved();
        } catch (err) {
            addError(isEdit ? "İzin güncellenemedi." : "İzin oluşturulamadı.", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{`${isEdit ? "İzni düzenle" : "İzin oluştur"} · ${type === "scope" ? "Kapsam tabanlı" : "Kaynak tabanlı"}`}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {loadingDetail ? (
                        <div className="flex justify-center py-16">
                            <Spinner className="size-6" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Field>
                                <FieldLabel>Ad <span className="text-destructive">*</span></FieldLabel>
                                <Input
                                    value={name}
                                    onChange={(e: any) => setName(e.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Açıklama</FieldLabel>
                                <Textarea
                                    rows={2}
                                    value={description}
                                    onChange={(e: any) => setDescription(e.target.value)}
                                />
                            </Field>

                            {type === "scope" ? (
                                <>
                                    <Field>
                                        <FieldLabel>Kapsamlar <span className="text-destructive">*</span></FieldLabel>
                                        <ChipPicker
                                            options={scopes}
                                            selected={selScopes}
                                            onToggle={toggle(setSelScopes)}
                                            getKey={(s: any) => s.id}
                                            getLabel={(s: any) => s.name}
                                            emptyText="Kapsam yok."
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>Kaynaklar (isteğe bağlı)</FieldLabel>
                                        <ChipPicker
                                            options={resources}
                                            selected={selResources}
                                            onToggle={toggle(setSelResources)}
                                            getKey={(r: any) => resId(r)}
                                            getLabel={(r: any) => r.displayName || r.name}
                                            emptyText="Kaynak yok."
                                        />
                                    </Field>
                                </>
                            ) : (
                                <Field>
                                    <FieldLabel>Kaynaklar <span className="text-destructive">*</span></FieldLabel>
                                    <ChipPicker
                                        options={resources}
                                        selected={selResources}
                                        onToggle={toggle(setSelResources)}
                                        getKey={(r: any) => resId(r)}
                                        getLabel={(r: any) => r.displayName || r.name}
                                        emptyText="Kaynak yok."
                                    />
                                </Field>
                            )}

                            <Field>
                                <FieldLabel>Politikalar</FieldLabel>
                                <ChipPicker
                                    options={policies}
                                    selected={selPolicies}
                                    onToggle={toggle(setSelPolicies)}
                                    getKey={(p: any) => p.id}
                                    getLabel={(p: any) => p.name}
                                    emptyText="Önce politika oluşturun."
                                />
                            </Field>

                            <Field>
                                <FieldLabel>Karar stratejisi</FieldLabel>
                                <Select
                                    value={decisionStrategy}
                                    onValueChange={setDecisionStrategy}
                                >
                                    <SelectTrigger
                                        className="w-full"
                                        aria-label="Karar stratejisi"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        {DECISION_STRAT_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldDescription>Seçilen politikalar nasıl birleştirilsin.</FieldDescription>
                            </Field>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={saving}
                        onClick={save}
                    >
                        {isEdit ? "Kaydet" : "Oluştur"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/* ── 6. Değerlendir (evaluate) ──────────────────────────────────────────── */
function EvaluateTab({ id, adminClient, addError }: any) {
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState<any[]>([]);
    const [scopes, setScopes] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);

    const [selResources, setSelResources] = useState<string[]>([]);
    const [selScopes, setSelScopes] = useState<string[]>([]);
    const [selRoles, setSelRoles] = useState<string[]>([]);
    const [clientId, setClientId] = useState(NONE);

    const [userSearch, setUserSearch] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [userId, setUserId] = useState("");
    const [searching, setSearching] = useState(false);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [res, scp, rls, cls] = await Promise.all([
                adminClient.clients.listResources({ id }).catch(() => []),
                adminClient.clients.listAllScopes({ id }).catch(() => []),
                adminClient.roles.find().catch(() => []),
                adminClient.clients.find().catch(() => [])
            ]);
            setResources(Array.isArray(res) ? res : []);
            setScopes(Array.isArray(scp) ? scp : []);
            setRoles(Array.isArray(rls) ? rls : []);
            setClients(Array.isArray(cls) ? cls : []);
        } catch (err) {
            addError("Veriler yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const toggle = (setter: any) => (k: string) =>
        setter((cur: string[]) =>
            cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]
        );

    const searchUsers = async () => {
        setSearching(true);
        try {
            const list = await adminClient.users.find({
                search: userSearch.trim() || undefined,
                max: 10
            });
            setUsers(Array.isArray(list) ? list : []);
        } catch (err) {
            addError("Kullanıcı araması başarısız.", err);
        } finally {
            setSearching(false);
        }
    };

    const evaluate = async () => {
        if (!userId) {
            addError("Değerlendirme için bir kullanıcı seçin.", new Error("userId"));
            return;
        }
        setRunning(true);
        setResult(null);
        try {
            const selectedResources = resources
                .filter(r => selResources.includes(resId(r)))
                .map(r => ({
                    _id: resId(r),
                    name: r.name,
                    scopes: selScopes.length
                        ? scopes
                              .filter(s => selScopes.includes(s.id))
                              .map(s => ({ id: s.id, name: s.name }))
                        : r.scopes
                }));
            const evalRequest: any = {
                roleIds: selRoles,
                userId,
                clientId: clientId === NONE ? id : clientId,
                resources: selectedResources.length ? selectedResources : undefined,
                entitlements: false,
                context: { attributes: {} }
            };
            const res = await adminClient.clients.evaluateResource({ id }, evalRequest);
            setResult(res ?? {});
        } catch (err) {
            addError("Değerlendirme yapılamadı.", err);
        } finally {
            setRunning(false);
        }
    };

    if (loading) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    const granted = result && String(result.status).toUpperCase() === "PERMIT";

    return (
        <div className="space-y-6">
            <div>
                <GroupLabel>Kimlik</GroupLabel>
                <Group>
                    <StackRow label="Kullanıcı ara">
                        <div className="flex gap-2">
                            <InputGroup className="flex-1">
                                <InputGroupAddon>
                                    <MagnifyingGlassIcon />
                                </InputGroupAddon>
                                <InputGroupInput
                                    value={userSearch}
                                    onChange={(e: any) => setUserSearch(e.target.value)}
                                    onKeyDown={(e: any) =>
                                        e.key === "Enter" && searchUsers()
                                    }
                                    placeholder="kullanıcı adı veya e-posta"
                                />
                            </InputGroup>
                            <Button
                                variant="secondary"
                                disabled={searching}
                                onClick={searchUsers}
                            >
                                {searching ? "Aranıyor…" : "Ara"}
                            </Button>
                        </div>
                    </StackRow>
                    {users.length > 0 && (
                        <Row label="Kullanıcı">
                            <Select
                                value={userId || NONE}
                                onValueChange={(v: string) =>
                                    setUserId(v === NONE ? "" : v)
                                }
                            >
                                <SelectTrigger aria-label="Kullanıcı">
                                    <SelectValue placeholder="Seçin…" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value={NONE}>Seçin…</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.username}
                                            {u.email ? ` (${u.email})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Row>
                    )}
                    <Row label="İstemci (audience)">
                        <Select value={clientId} onValueChange={setClientId}>
                            <SelectTrigger aria-label="İstemci">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value={NONE}>Bu istemci</SelectItem>
                                {clients.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.clientId}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Row>
                    <StackRow
                        label="Roller"
                        hint="İsteğe bağlı: değerlendirmeye dahil edilecek roller."
                    >
                        <ChipPicker
                            options={roles}
                            selected={selRoles}
                            onToggle={toggle(setSelRoles)}
                            getKey={(r: any) => r.id}
                            getLabel={(r: any) => r.name}
                            emptyText="Rol yok."
                        />
                    </StackRow>
                </Group>
            </div>

            <div>
                <GroupLabel>İzinler</GroupLabel>
                <Group>
                    <StackRow label="Kaynaklar">
                        <ChipPicker
                            options={resources}
                            selected={selResources}
                            onToggle={toggle(setSelResources)}
                            getKey={(r: any) => resId(r)}
                            getLabel={(r: any) => r.displayName || r.name}
                            emptyText="Kaynak yok."
                        />
                    </StackRow>
                    <StackRow label="Kapsamlar">
                        <ChipPicker
                            options={scopes}
                            selected={selScopes}
                            onToggle={toggle(setSelScopes)}
                            getKey={(s: any) => s.id}
                            getLabel={(s: any) => s.name}
                            emptyText="Kapsam yok."
                        />
                    </StackRow>
                </Group>
                <GroupFooter>
                    Kaynak seçilmezse, kullanıcının erişebildiği tüm kaynaklar
                    değerlendirilir.
                </GroupFooter>
            </div>

            <div className="flex justify-end">
                <Button
                    disabled={running}
                    onClick={evaluate}
                >
                    {running ? "Değerlendiriliyor…" : "Değerlendir"}
                </Button>
            </div>

            {result && (
                <div>
                    <GroupLabel>Sonuç</GroupLabel>
                    <Group>
                        <Item size="sm">
                            <ItemMedia variant="icon">
                                {granted ? (
                                    <CheckCircleIcon weight="fill" className="text-primary" />
                                ) : (
                                    <XCircleIcon weight="fill" className="text-destructive" />
                                )}
                            </ItemMedia>
                            <ItemContent className="min-w-0">
                                <ItemTitle>{granted ? "İzin verildi" : "Reddedildi"}</ItemTitle>
                                <ItemDescription>
                                    Genel karar: {result.status || "—"}
                                </ItemDescription>
                            </ItemContent>
                        </Item>
                        {(result.results || []).map((r: any, i: number) => (
                            <Item key={i} size="sm">
                                <ItemMedia variant="icon">
                                    {String(r.status).toUpperCase() === "PERMIT" ? (
                                        <CheckCircleIcon weight="fill" className="text-primary" />
                                    ) : (
                                        <XCircleIcon weight="fill" className="text-destructive" />
                                    )}
                                </ItemMedia>
                                <ItemContent className="min-w-0">
                                    <ItemTitle>{r.resource?.name || "Genel"}</ItemTitle>
                                    <ItemDescription className="truncate">
                                        {(r.allowedScopes || r.scopes || [])
                                            .map((s: any) => s.name ?? s)
                                            .join(", ") || "—"}
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <Badge
                                        variant={
                                            String(r.status).toUpperCase() === "PERMIT"
                                                ? "outline"
                                                : "destructive"
                                        }
                                    >
                                        {r.status}
                                    </Badge>
                                </ItemActions>
                            </Item>
                        ))}
                    </Group>
                </div>
            )}
        </div>
    );
}

/* ── 7. Dışa Aktar (export) ─────────────────────────────────────────────── */
function ExportTab({ id, adminClient, addAlert, addError }: any) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    const run = async () => {
        setLoading(true);
        try {
            const res = await adminClient.clients.exportResource({ id });
            setData(res ?? {});
        } catch (err) {
            addError("Ayarlar dışa aktarılamadı.", err);
        } finally {
            setLoading(false);
        }
    };

    const download = () => {
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${id}-authz.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        addAlert("Yapılandırma indirildi.", AlertVariant.success);
    };

    return (
        <div className="space-y-4">
            <div>
                <GroupLabel>Yapılandırmayı dışa aktar</GroupLabel>
                <Group>
                    <ActionRow onClick={run} disabled={loading}>
                        <ExportIcon />
                        {loading ? "Dışa aktarılıyor…" : "Yapılandırmayı dışa aktar"}
                    </ActionRow>
                    {data && (
                        <ActionRow onClick={download}>
                            <DownloadSimpleIcon />
                            JSON indir
                        </ActionRow>
                    )}
                </Group>
                <GroupFooter>
                    Bu istemcinin tüm yetkilendirme yapılandırmasını (kaynaklar,
                    kapsamlar, politikalar, izinler) JSON olarak dışa aktarır.
                </GroupFooter>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Spinner className="size-6" />
                </div>
            ) : data ? (
                <CodeBlock size="sm">
                    <CodeBlockContent className="max-h-120 scroll-fade-y">
                        {JSON.stringify(data, null, 2)}
                    </CodeBlockContent>
                </CodeBlock>
            ) : (
                <EmptyCard
                    icon={<FlaskIcon />}
                    title="Henüz dışa aktarılmadı"
                    desc="Yapılandırmayı görüntülemek için yukarıdaki düğmeye bas."
                />
            )}
        </div>
    );
}

/* ── esuiss inset-list helpers (thin compositions of @ui Item/Empty/Confirm) ── */

/** Confirm dialog — returns a [confirm(opts), node] pair (built on @ui/patterns/confirm). */
function useConfirmDialog() {
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<any>(null);
    const confirm = (opts: {
        title: ReactNode;
        message?: ReactNode;
        confirmLabel?: ReactNode;
        danger?: boolean;
        onConfirm: () => void;
    }) => {
        setState(opts);
        setOpen(true);
    };
    const node = (
        <Confirm open={open} onOpenChange={setOpen}>
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{state?.title}</ConfirmTitle>
                    {state?.message && (
                        <ConfirmDescription>{state.message}</ConfirmDescription>
                    )}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>Vazgeç</ConfirmCancel>
                    <ConfirmAction
                        variant={state?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = state?.onConfirm;
                            setOpen(false);
                            fn?.();
                        }}
                    >
                        {state?.confirmLabel ?? "Onayla"}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}

/** Flattens fragments so every row of a group gets its own separator. */
function flattenRows(children: any, prefix = ""): any[] {
    return Children.toArray(children).flatMap((c: any) =>
        isValidElement(c) && c.type === Fragment
            ? flattenRows((c.props as any).children, `${prefix}${c.key}/`)
            : [prefix && isValidElement(c) ? cloneElement(c, { key: prefix + c.key }) : c]
    );
}

/** Quiet caption above a group. */
function GroupLabel({ children, className }: any) {
    return (
        <h3 className={cn("mb-2 ms-1 text-sm font-medium text-muted-foreground", className)}>
            {children}
        </h3>
    );
}

/** Footnote below a group. */
function GroupFooter({ children }: any) {
    return <p className="mt-2 ms-1 text-sm text-muted-foreground">{children}</p>;
}

/** Inset list — rows separated by ItemSeparator. */
function Group({ children, className }: any) {
    const rows = flattenRows(children);
    return (
        <ItemGroup variant="inset" className={className}>
            {rows.map((row: any, i: number) => (
                <Fragment key={row?.key ?? i}>
                    {i > 0 && <ItemSeparator />}
                    {row}
                </Fragment>
            ))}
        </ItemGroup>
    );
}

/** Label-left / control-right row. */
function Row({ label, hint, children }: any) {
    return (
        <Item size="sm">
            <ItemContent className="flex-none">
                <ItemTitle>{label}</ItemTitle>
                {hint && <ItemDescription>{hint}</ItemDescription>}
            </ItemContent>
            <ItemActions className="min-w-0 flex-1 justify-end">{children}</ItemActions>
        </Item>
    );
}

/** Label on top, full-width control below. */
function StackRow({ label, hint, children }: any) {
    return (
        <Item size="sm">
            {(label || hint) && (
                <ItemContent>
                    {label && <ItemTitle>{label}</ItemTitle>}
                    {hint && <ItemDescription>{hint}</ItemDescription>}
                </ItemContent>
            )}
            <div className="basis-full">{children}</div>
        </Item>
    );
}

/** Switch row (label-left / switch-right). */
function SwitchRow({ label, hint, checked, onChange, disabled }: any) {
    return (
        <Item size="sm">
            <ItemContent>
                <ItemTitle>{label}</ItemTitle>
                {hint && <ItemDescription>{hint}</ItemDescription>}
            </ItemContent>
            <ItemActions>
                <Switch
                    checked={!!checked}
                    disabled={disabled}
                    aria-label={typeof label === "string" ? label : undefined}
                    onCheckedChange={(v: boolean) => onChange(v)}
                />
            </ItemActions>
        </Item>
    );
}

/** Full-width tappable action row. */
function ActionRow({ onClick, disabled, danger, children }: any) {
    return (
        <Item size="sm" asChild>
            <button type="button" onClick={onClick} disabled={disabled}>
                <ItemContent>
                    <ItemTitle className={danger ? "text-destructive" : "text-primary"}>
                        {children}
                    </ItemTitle>
                </ItemContent>
            </button>
        </Item>
    );
}

/** Delete icon button for list rows. */
function RowDelete({ onClick, title = "Sil" }: any) {
    return (
        <Button variant="ghost" size="icon-sm" onClick={onClick} title={title} aria-label={title}>
            <TrashIcon />
        </Button>
    );
}

/** Empty state. */
function EmptyCard({ icon, title, desc, action }: any) {
    return (
        <Empty>
            <EmptyHeader>
                {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
                <EmptyTitle>{title}</EmptyTitle>
                {desc && <EmptyDescription>{desc}</EmptyDescription>}
            </EmptyHeader>
            {action && <EmptyContent>{action}</EmptyContent>}
        </Empty>
    );
}
