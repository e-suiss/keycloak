// @ts-nocheck
/**
 * Admin Permissions (V2) — realm-level fine-grained admin authorization.
 *
 * Detects availability (feature ADMIN_FINE_GRAINED_AUTHZ_V2 enabled AND
 * realm.adminPermissionsEnabled). When available, the special `admin-permissions`
 * client hosts the resource-server: we list permission configs, authorization
 * policies, and run policy evaluations against it.
 *
 * Sub-tabs (Segmented): İzinler · Politikalar · Değerlendirme.
 */

import {
    CaretDownIcon,
    CaretRightIcon,
    CheckCircleIcon,
    GavelIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    ScalesIcon,
    ShieldCheckIcon,
    TrashIcon,
    XCircleIcon
} from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
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
import {
    Fragment,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";

const ADMIN_PERMISSIONS_CLIENT_ID = "admin-permissions";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Root: availability detection + sub-tab shell                              */
/* ────────────────────────────────────────────────────────────────────────── */
export default function Permissions() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();

    const [loading, setLoading] = useState(true);
    const [v2On, setV2On] = useState(false);
    const [realmEnabled, setRealmEnabled] = useState(false);
    const [client, setClient] = useState<any>(null);
    const [tab, setTab] = useState("permissions");

    const detect = useCallback(async () => {
        setLoading(true);
        try {
            const [serverInfo, realmRep] = await Promise.all([
                adminClient.serverInfo.find().catch(() => null),
                adminClient.realms.findOne({ realm }).catch(() => null)
            ]);
            const features = Array.isArray(serverInfo?.features)
                ? serverInfo.features
                : [];
            const v2 = features.some(
                (f: any) => f?.name === "ADMIN_FINE_GRAINED_AUTHZ_V2" && f?.enabled
            );
            const rEnabled = !!realmRep?.adminPermissionsEnabled;
            setV2On(v2);
            setRealmEnabled(rEnabled);

            if (v2 && rEnabled) {
                const clients = await adminClient.clients
                    .find({ clientId: ADMIN_PERMISSIONS_CLIENT_ID })
                    .catch(() => []);
                setClient(Array.isArray(clients) ? (clients[0] ?? null) : null);
            }
        } catch (err) {
            addError("Yönetici izinleri yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, realm, addError]);

    useEffect(() => {
        detect();
    }, [detect]);

    const header = (
        <div className="mb-7 flex items-center gap-3">
            <ShieldCheckIcon weight="fill" className="size-7 shrink-0 text-primary" />
            <div className="min-w-0">
                <h1 className="font-semibold text-xl tracking-tight">
                    Yönetici İzinleri
                </h1>
                <p className="text-sm text-muted-foreground">
                    Realm seviyesinde ince taneli yönetim yetkilendirmesi (V2).
                </p>
            </div>
        </div>
    );

    if (loading) {
        return (
            <PageShell>
                {header}
                <Loading />
            </PageShell>
        );
    }

    // Not available → guide the admin to enable feature + realm setting.
    if (!v2On || !realmEnabled || !client) {
        return (
            <PageShell>
                {header}
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShieldCheckIcon />
                        </EmptyMedia>
                        <EmptyTitle>Admin Permissions (V2) kullanılamıyor</EmptyTitle>
                        <EmptyDescription>
                            {!v2On
                            ? "Sunucuyu admin-fine-grained-authz:v2 özelliğiyle başlatın (--features=admin-fine-grained-authz:v2), ardından Realm Ayarları → Yönetici İzinleri'ni açın."
                            : !realmEnabled
                              ? "Realm Ayarları → Yönetici İzinleri'ni açın; izinler ancak o zaman bu realm için yönetilebilir."
                              : "admin-permissions istemcisi bulunamadı. Realm Ayarları'ndan Yönetici İzinleri'ni açtığınızdan emin olun."}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
                {(!v2On || !realmEnabled) && (
                    <div className="mx-auto mt-4 max-w-xl">
                        <ItemGroup variant="inset">
                            <Item size="sm">
                                <ItemContent>
                                    <ItemTitle className="font-normal">
                                        Özellik bayrağı
                                    </ItemTitle>
                                </ItemContent>
                                <ItemActions>
                                    <code className="font-mono text-sm text-muted-foreground">
                                        admin-fine-grained-authz:v2
                                    </code>
                                </ItemActions>
                            </Item>
                            <ItemSeparator />
                            <Item size="sm">
                                <ItemContent>
                                    <ItemTitle className="font-normal">Realm Ayarı</ItemTitle>
                                </ItemContent>
                                <ItemActions>
                                    <span className="text-sm text-muted-foreground">
                                        Realm Settings → Admin Permissions
                                    </span>
                                </ItemActions>
                            </Item>
                        </ItemGroup>
                        <p className="mt-2 ms-1 text-sm text-muted-foreground">
                            Her ikisi de etkin olduğunda izinler, politikalar ve
                            değerlendirme sekmeleri görünür.
                        </p>
                    </div>
                )}
            </PageShell>
        );
    }

    const clientPk = client.id; // resource-server id (the client's UUID)

    return (
        <>
            <PageShell>
                {header}
                <div className="mb-6 flex justify-center">
                    <SegmentPicker value={tab} onValueChange={setTab}>
                        <SegmentPickerItem value="permissions" label="İzinler" />
                        <SegmentPickerItem value="policies" label="Politikalar" />
                        <SegmentPickerItem value="evaluate" label="Değerlendirme" />
                    </SegmentPicker>
                </div>

                {tab === "permissions" && (
                    <PermissionsTab
                        clientPk={clientPk}
                        adminClient={adminClient}
                        realm={realm}
                        addAlert={addAlert}
                        addError={addError}
                        confirm={confirm}
                    />
                )}
                {tab === "policies" && (
                    <PoliciesTab
                        clientPk={clientPk}
                        adminClient={adminClient}
                        realm={realm}
                        addAlert={addAlert}
                        addError={addError}
                        confirm={confirm}
                    />
                )}
                {tab === "evaluate" && (
                    <EvaluateTab
                        clientPk={clientPk}
                        adminClient={adminClient}
                        realm={realm}
                        addError={addError}
                    />
                )}
            </PageShell>
            {confirmNode}
        </>
    );
}

/** Page layout wrapper (centered content column). */
function PageShell({ children }: { children?: ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            {children}
        </div>
    );
}

/** Centered loading indicator. */
function Loading() {
    return (
        <div className="flex justify-center py-16">
            <Spinner className="size-6" />
        </div>
    );
}

/** Caption above an inset group. */
function GroupCaption({ children }: { children?: ReactNode }) {
    return (
        <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">{children}</h3>
    );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Shared: resource-type schema (from the admin-permissions resource server) */
/* ────────────────────────────────────────────────────────────────────────── */
function useResourceTypes(adminClient: any, clientPk: string) {
    const [types, setTypes] = useState<any[] | null>(null);
    useEffect(() => {
        let alive = true;
        adminClient.clients
            .getResourceServer({ id: clientPk })
            .then((rs: any) => {
                // Keycloak returns resourceTypes as an object map keyed by type
                // name (the typings say array — handle both shapes defensively).
                const raw = rs?.authorizationSchema?.resourceTypes;
                const list = (Array.isArray(raw) ? raw : Object.values(raw || {})).sort(
                    (a: any, b: any) => (a?.type || "").localeCompare(b?.type || "")
                );
                if (alive) setTypes(list);
            })
            .catch(() => alive && setTypes([]));
        return () => {
            alive = false;
        };
    }, [adminClient, clientPk]);
    return types;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  1. İzinler — permission configs (resource type · scopes · policies)        */
/* ────────────────────────────────────────────────────────────────────────── */
function PermissionsTab({
    clientPk,
    adminClient,
    realm,
    addAlert,
    addError,
    confirm
}: any) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [createOpen, setCreateOpen] = useState(false);
    const resourceTypes = useResourceTypes(adminClient, clientPk);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const perms = await adminClient.clients.listPermissionScope({ id: clientPk });
            const list = Array.isArray(perms) ? perms : [];
            const enriched = await Promise.all(
                list.map(async (p: any) => {
                    const [policies, scopes, resources] = await Promise.all([
                        adminClient.clients
                            .getAssociatedPolicies({ id: clientPk, permissionId: p.id })
                            .catch(() => []),
                        adminClient.clients
                            .getAssociatedScopes({ id: clientPk, permissionId: p.id })
                            .catch(() => []),
                        adminClient.clients
                            .getAssociatedResources({ id: clientPk, permissionId: p.id })
                            .catch(() => [])
                    ]);
                    return { ...p, policies, scopes, resources };
                })
            );
            setItems(enriched);
        } catch (err) {
            addError("İzinler yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, clientPk, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (p: any) =>
        confirm({
            title: "İzni sil",
            message: `“${p.name}” izni kalıcı olarak silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delPermission({
                        id: clientPk,
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

    if (loading) return <Loading />;

    if (items.length === 0) {
        return (
            <>
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShieldCheckIcon />
                        </EmptyMedia>
                        <EmptyTitle>Henüz izin yok</EmptyTitle>
                        <EmptyDescription>
                            Bir kaynak türü seçip kapsam bazlı yönetici izinleri
                            tanımlayın.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button onClick={() => setCreateOpen(true)}>İzin oluştur</Button>
                    </EmptyContent>
                </Empty>
                {createOpen && (
                    <PermissionModal
                        clientPk={clientPk}
                        adminClient={adminClient}
                        resourceTypes={resourceTypes}
                        addAlert={addAlert}
                        addError={addError}
                        onClose={() => setCreateOpen(false)}
                        onSaved={async () => {
                            setCreateOpen(false);
                            await load();
                        }}
                    />
                )}
            </>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="font-semibold tracking-tight">İzinler</p>
                    <p className="text-sm text-muted-foreground">
                        Kaynak türü, kapsamlar ve atanan politikalar.
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <PlusIcon /> İzin oluştur
                </Button>
            </div>

            <ItemGroup variant="inset">
                {items.map((p, i) => {
                    const open = !!expanded[p.id];
                    return (
                        <Fragment key={p.id}>
                            {i > 0 && <ItemSeparator />}
                            <div className="flex items-center gap-2 pe-3">
                                <Item size="sm" asChild className="min-w-0 flex-1">
                                    <button
                                        type="button"
                                        aria-expanded={open}
                                        onClick={() =>
                                            setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))
                                        }
                                    >
                                        {open ? (
                                            <CaretDownIcon
                                                className="size-4 shrink-0 text-muted-foreground"
                                                weight="bold"
                                            />
                                        ) : (
                                            <CaretRightIcon
                                                className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
                                                weight="bold"
                                            />
                                        )}
                                        <ItemContent className="min-w-0 text-start">
                                            <ItemTitle className="truncate font-medium text-sm">
                                                {p.name}
                                            </ItemTitle>
                                            <ItemDescription className="truncate">
                                                {p.resourceType || "—"}
                                                {p.scopes?.length
                                                    ? ` · ${p.scopes.map((s: any) => s.name).join(", ")}`
                                                    : ""}
                                            </ItemDescription>
                                        </ItemContent>
                                    </button>
                                </Item>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    title="Sil"
                                    aria-label="Sil"
                                    onClick={() => remove(p)}
                                >
                                    <TrashIcon />
                                </Button>
                            </div>
                            {open && (
                                <>
                                    <ItemSeparator />
                                    <Item size="sm">
                                        <ItemContent className="ps-7 text-sm">
                                            {p.description && (
                                                <p className="mb-2 text-muted-foreground">
                                                    {p.description}
                                                </p>
                                            )}
                                            <DetailLine
                                                label="Kaynaklar"
                                                value={
                                                    p.resources?.length
                                                        ? p.resources
                                                              .map((r: any) => r.name)
                                                              .join(", ")
                                                        : "Tüm kaynaklar"
                                                }
                                            />
                                            <DetailLine
                                                label="Kapsamlar"
                                                value={
                                                    p.scopes
                                                        ?.map((s: any) => s.name)
                                                        .join(", ") || "—"
                                                }
                                            />
                                            <DetailLine
                                                label="Politikalar"
                                                value={
                                                    p.policies
                                                        ?.map((pol: any) => pol.name)
                                                        .join(", ") || "—"
                                                }
                                            />
                                        </ItemContent>
                                    </Item>
                                </>
                            )}
                        </Fragment>
                    );
                })}
            </ItemGroup>

            {createOpen && (
                <PermissionModal
                    clientPk={clientPk}
                    adminClient={adminClient}
                    resourceTypes={resourceTypes}
                    addAlert={addAlert}
                    addError={addError}
                    onClose={() => setCreateOpen(false)}
                    onSaved={async () => {
                        setCreateOpen(false);
                        await load();
                    }}
                />
            )}
        </div>
    );
}

function DetailLine({ label, value }: any) {
    return (
        <p className="flex gap-2 py-0.5">
            <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
            <span className="min-w-0 flex-1">{value}</span>
        </p>
    );
}

/* Create / edit a permission config. */
function PermissionModal({
    clientPk,
    adminClient,
    resourceTypes,
    addAlert,
    addError,
    onClose,
    onSaved
}: any) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [resourceType, setResourceType] = useState("");
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    const types = resourceTypes || [];
    const current = useMemo(
        () => types.find((t: any) => t.type === resourceType),
        [types, resourceType]
    );
    const scopeOptions = current?.scopes || [];

    // Default to the first resource type once schema loads.
    useEffect(() => {
        if (!resourceType && types.length) setResourceType(types[0].type);
    }, [types, resourceType]);

    // Authorization policies available to assign.
    useEffect(() => {
        adminClient.clients
            .listPolicies({ id: clientPk, permission: false })
            .then((res: any) => setPolicies(Array.isArray(res) ? res : []))
            .catch(() => setPolicies([]));
    }, [adminClient, clientPk]);

    const toggle = (arr: string[], setArr: any, v: string) =>
        setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

    const save = async () => {
        if (!name.trim()) {
            addError("İzin adı gerekli.", new Error("name"));
            return;
        }
        if (!resourceType) {
            addError("Kaynak türü seçin.", new Error("resourceType"));
            return;
        }
        setSaving(true);
        try {
            await adminClient.clients.createPermission(
                { id: clientPk, type: "scope" },
                {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    resourceType,
                    scopes: selectedScopes,
                    policies: selectedPolicies
                }
            );
            addAlert("İzin oluşturuldu.", AlertVariant.success);
            await onSaved();
        } catch (err) {
            addError("İzin oluşturulamadı.", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>İzin oluştur</ModalTitle>
                </ModalHeader>
                <ModalBody>
            <FieldGroup>
                <Field>
                    <FieldLabel>
                        Ad<span className="text-destructive"> *</span>
                    </FieldLabel>
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="manage-users"
                    />
                </Field>
                <Field>
                    <FieldLabel>Açıklama</FieldLabel>
                    <Textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={2}
                        resizable="inside"
                    />
                </Field>
                <Field>
                    <FieldLabel>
                        Kaynak türü<span className="text-destructive"> *</span>
                    </FieldLabel>
                    <Select value={resourceType} onValueChange={setResourceType}>
                        <SelectTrigger className="w-full" aria-label="Kaynak türü">
                            <SelectValue placeholder="Tür seçin…" />
                        </SelectTrigger>
                        <SelectContent>
                            {types.map((t: any) => (
                                <SelectItem key={t.type} value={t.type}>
                                    {t.type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                {scopeOptions.length > 0 && (
                    <div>
                        <GroupCaption>Yetkilendirme kapsamları</GroupCaption>
                        <ItemGroup variant="inset">
                            {scopeOptions.map((s: string, i: number) => (
                                <CheckRow
                                    key={s}
                                    first={i === 0}
                                    label={s}
                                    checked={selectedScopes.includes(s)}
                                    onToggle={() =>
                                        toggle(selectedScopes, setSelectedScopes, s)
                                    }
                                />
                            ))}
                        </ItemGroup>
                    </div>
                )}

                <div>
                    <GroupCaption>Politikalar</GroupCaption>
                    <ItemGroup variant="inset">
                        {policies.length === 0 ? (
                            <Item size="sm">
                                <ItemContent>
                                    <ItemDescription className="text-center">
                                        Atanabilir politika yok.
                                    </ItemDescription>
                                </ItemContent>
                            </Item>
                        ) : (
                            policies.map((pol: any, i: number) => (
                                <CheckRow
                                    key={pol.id}
                                    first={i === 0}
                                    label={pol.name}
                                    hint={pol.type}
                                    checked={selectedPolicies.includes(pol.id)}
                                    onToggle={() =>
                                        toggle(
                                            selectedPolicies,
                                            setSelectedPolicies,
                                            pol.id
                                        )
                                    }
                                />
                            ))
                        )}
                    </ItemGroup>
                </div>
            </FieldGroup>
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving} onClick={save}>
                        {saving ? "Kaydediliyor…" : "Oluştur"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function CheckRow({ label, hint, checked, onToggle, first }: any) {
    return (
        <>
            {!first && <ItemSeparator />}
            <Item size="sm" asChild>
                <label>
                    <Checkbox checked={!!checked} onCheckedChange={() => onToggle()} />
                    <ItemContent className="min-w-0">
                        <ItemTitle className="truncate font-normal text-sm">
                            {label}
                        </ItemTitle>
                        {hint && (
                            <ItemDescription className="truncate">{hint}</ItemDescription>
                        )}
                    </ItemContent>
                </label>
            </Item>
        </>
    );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  2. Politikalar — authorization policies                                    */
/* ────────────────────────────────────────────────────────────────────────── */
function PoliciesTab({ clientPk, adminClient, realm, addAlert, addError, confirm }: any) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [createOpen, setCreateOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [pols, provs] = await Promise.all([
                adminClient.clients
                    .listPolicies({ id: clientPk, permission: false })
                    .catch(() => []),
                adminClient.clients.listPolicyProviders({ id: clientPk }).catch(() => [])
            ]);
            setItems(Array.isArray(pols) ? pols : []);
            // Exclude resource/scope/uma — these are permission types, not policies.
            setProviders(
                (Array.isArray(provs) ? provs : []).filter(
                    (p: any) => !["resource", "scope", "uma"].includes(p.type)
                )
            );
        } catch (err) {
            addError("Politikalar yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, clientPk, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (pol: any) =>
        confirm({
            title: "Politikayı sil",
            message: `“${pol.name}” politikası silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delPolicy({
                        id: clientPk,
                        policyId: pol.id
                    });
                    addAlert("Politika silindi.", AlertVariant.success);
                    await load();
                } catch (err) {
                    addError("Politika silinemedi.", err);
                }
            }
        });

    if (loading) return <Loading />;

    if (items.length === 0) {
        return (
            <>
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <GavelIcon />
                        </EmptyMedia>
                        <EmptyTitle>Henüz politika yok</EmptyTitle>
                        <EmptyDescription>
                            İzinlere atanmak üzere yetkilendirme politikaları oluşturun
                            (rol, grup, kullanıcı, istemci…).
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button onClick={() => setCreateOpen(true)}>
                            Politika oluştur
                        </Button>
                    </EmptyContent>
                </Empty>
                {createOpen && (
                    <PolicyModal
                        clientPk={clientPk}
                        adminClient={adminClient}
                        providers={providers}
                        addAlert={addAlert}
                        addError={addError}
                        onClose={() => setCreateOpen(false)}
                        onSaved={async () => {
                            setCreateOpen(false);
                            await load();
                        }}
                    />
                )}
            </>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="font-semibold tracking-tight">Politikalar</p>
                    <p className="text-sm text-muted-foreground">
                        İzinlere atanabilen yetkilendirme politikaları.
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <PlusIcon /> Politika oluştur
                </Button>
            </div>

            <ItemGroup variant="inset">
                {items.map((pol, i) => (
                    <Fragment key={pol.id}>
                        {i > 0 && <ItemSeparator />}
                        <Item size="sm">
                            <ItemMedia variant="icon">
                                <GavelIcon weight="fill" className="size-5" />
                            </ItemMedia>
                            <ItemContent className="min-w-0">
                                <ItemTitle className="truncate font-medium text-sm">
                                    {pol.name}
                                </ItemTitle>
                                <ItemDescription className="truncate">
                                    {pol.type}
                                    {pol.description ? ` · ${pol.description}` : ""}
                                </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    title="Sil"
                                    aria-label="Sil"
                                    onClick={() => remove(pol)}
                                >
                                    <TrashIcon />
                                </Button>
                            </ItemActions>
                        </Item>
                    </Fragment>
                ))}
            </ItemGroup>
        </div>
    );
}

/* Create a new policy (type picked from the provider list). */
function PolicyModal({
    clientPk,
    adminClient,
    providers,
    addAlert,
    addError,
    onClose,
    onSaved
}: any) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState(providers?.[0]?.type || "");
    const [logic, setLogic] = useState("POSITIVE");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!type && providers?.length) setType(providers[0].type);
    }, [providers, type]);

    const save = async () => {
        if (!name.trim()) {
            addError("Politika adı gerekli.", new Error("name"));
            return;
        }
        if (!type) {
            addError("Politika türü seçin.", new Error("type"));
            return;
        }
        setSaving(true);
        try {
            await adminClient.clients.createPolicy(
                { id: clientPk, type },
                {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    type,
                    logic,
                    decisionStrategy: "UNANIMOUS"
                }
            );
            addAlert("Politika oluşturuldu.", AlertVariant.success);
            await onSaved();
        } catch (err) {
            addError("Politika oluşturulamadı.", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>Politika oluştur</ModalTitle>
                </ModalHeader>
                <ModalBody>
            <FieldGroup>
                <Field>
                    <FieldLabel>
                        Ad<span className="text-destructive"> *</span>
                    </FieldLabel>
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="only-admins"
                    />
                </Field>
                <Field>
                    <FieldLabel>Açıklama</FieldLabel>
                    <Textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={2}
                        resizable="inside"
                    />
                </Field>
                <Field>
                    <FieldLabel>
                        Politika türü<span className="text-destructive"> *</span>
                    </FieldLabel>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="w-full" aria-label="Politika türü">
                            <SelectValue placeholder="Tür seçin…" />
                        </SelectTrigger>
                        <SelectContent>
                            {(providers || []).map((p: any) => (
                                <SelectItem key={p.type} value={p.type}>
                                    {p.name || p.type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldDescription>
                        Türe özgü detaylar oluşturduktan sonra düzenlenebilir.
                    </FieldDescription>
                </Field>
                <Field>
                    <FieldLabel>Mantık</FieldLabel>
                    <Select value={logic} onValueChange={setLogic}>
                        <SelectTrigger className="w-full" aria-label="Mantık">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="POSITIVE">Pozitif</SelectItem>
                            <SelectItem value="NEGATIVE">Negatif</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
            </FieldGroup>
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving} onClick={save}>
                        {saving ? "Kaydediliyor…" : "Oluştur"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  3. Değerlendirme — run an evaluation, show permit/deny                      */
/* ────────────────────────────────────────────────────────────────────────── */
function EvaluateTab({ clientPk, adminClient, realm, addError }: any) {
    const resourceTypes = useResourceTypes(adminClient, clientPk);

    const [userQuery, setUserQuery] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [userId, setUserId] = useState("");
    const [userLabel, setUserLabel] = useState("");

    const [resourceType, setResourceType] = useState("");
    const [scopes, setScopes] = useState<string[]>([]);
    const [resourceName, setResourceName] = useState("");

    // Optional subject: roles / groups / clients picked by name.
    const [roleIds, _setRoleIds] = useState<string[]>([]);

    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<any>(null);

    const types = resourceTypes || [];
    const current = useMemo(
        () => types.find((t: any) => t.type === resourceType),
        [types, resourceType]
    );
    const scopeOptions = current?.scopes || [];

    useEffect(() => {
        if (!resourceType && types.length) setResourceType(types[0].type);
    }, [types, resourceType]);

    // Reset selected scopes when the resource type changes.
    useEffect(() => {
        setScopes([]);
    }, []);

    const searchUsers = useCallback(async () => {
        try {
            const list = await adminClient.users.find({
                search: userQuery.trim() || undefined,
                max: 10
            });
            setUsers(Array.isArray(list) ? list : []);
        } catch (err) {
            addError("Kullanıcılar aranamadı.", err);
        }
    }, [adminClient, userQuery, addError]);

    const toggleScope = (s: string) =>
        setScopes(arr => (arr.includes(s) ? arr.filter(x => x !== s) : [...arr, s]));

    const evaluate = async () => {
        if (!userId) {
            addError("Bir kullanıcı seçin.", new Error("user"));
            return;
        }
        if (!resourceType) {
            addError("Kaynak türü seçin.", new Error("resourceType"));
            return;
        }
        setRunning(true);
        setResult(null);
        try {
            const payload = {
                roleIds,
                userId,
                resourceType,
                resources: [
                    {
                        name: resourceName.trim() || undefined,
                        scopes: scopes.map(s => ({ name: s }))
                    }
                ],
                entitlements: false,
                context: { attributes: {} }
            };
            const res = await adminClient.clients.evaluateResource(
                { id: clientPk, realm },
                payload
            );
            setResult(res ?? {});
        } catch (err) {
            addError("Değerlendirme yapılamadı.", err);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Form ── */}
            <div className="space-y-5">
                <div>
                    <GroupCaption>Konu (Subject)</GroupCaption>
                    <ItemGroup variant="inset">
                        <Item size="sm">
                            <ItemContent className="min-w-0">
                                <ItemTitle className="font-normal text-sm">Kullanıcı</ItemTitle>
                                <ItemDescription>
                                    Değerlendirilecek kullanıcıyı arayıp seçin.
                                </ItemDescription>
                                <div className="mt-2 flex gap-2">
                                    <Input
                                        size="md"
                                        value={userQuery}
                                        onChange={e => setUserQuery(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && searchUsers()}
                                        placeholder="kullanıcı adı / e-posta"
                                    />
                                    <Button variant="secondary" onClick={searchUsers}>
                                        <MagnifyingGlassIcon /> Ara
                                    </Button>
                                </div>
                                {users.length > 0 && (
                                    <ItemGroup className="mt-2 gap-0!">
                                        {users.map(u => (
                                            <Item
                                                key={u.id}
                                                size="xs"
                                                variant="outline"
                                                asChild
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUserId(u.id);
                                                        setUserLabel(
                                                            u.username || u.email || u.id
                                                        );
                                                        setUsers([]);
                                                        setUserQuery(
                                                            u.username || u.email || ""
                                                        );
                                                    }}
                                                >
                                                    <ItemContent className="min-w-0">
                                                        <ItemTitle className="truncate font-medium text-sm">
                                                            {u.username || u.email || u.id}
                                                        </ItemTitle>
                                                    </ItemContent>
                                                    {u.email && (
                                                        <ItemActions>
                                                            <span className="truncate text-xs text-muted-foreground">
                                                                {u.email}
                                                            </span>
                                                        </ItemActions>
                                                    )}
                                                </button>
                                            </Item>
                                        ))}
                                    </ItemGroup>
                                )}
                                {userId && (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Seçili:{" "}
                                        <span className="font-medium text-foreground">
                                            {userLabel}
                                        </span>
                                    </p>
                                )}
                            </ItemContent>
                        </Item>
                    </ItemGroup>
                </div>

                <div>
                    <GroupCaption>Kaynak</GroupCaption>
                    <ItemGroup variant="inset">
                        <Item size="sm">
                            <ItemContent>
                                <ItemTitle className="font-normal text-sm">Kaynak türü</ItemTitle>
                            </ItemContent>
                            <ItemActions>
                                <Select value={resourceType} onValueChange={setResourceType}>
                                    <SelectTrigger aria-label="Kaynak türü">
                                        <SelectValue placeholder="Tür seçin…" />
                                    </SelectTrigger>
                                    <SelectContent align="end">
                                        {types.map((t: any) => (
                                            <SelectItem key={t.type} value={t.type}>
                                                {t.type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </ItemActions>
                        </Item>
                        <ItemSeparator />
                        <Item size="sm">
                            <ItemContent className="min-w-0">
                                <ItemTitle className="font-normal text-sm">Kaynak adı</ItemTitle>
                                <ItemDescription>
                                    Boş bırakılırsa tür içindeki tüm kaynaklar
                                    değerlendirilir.
                                </ItemDescription>
                                <Input
                                    size="md"
                                    className="mt-2"
                                    value={resourceName}
                                    onChange={e => setResourceName(e.target.value)}
                                    placeholder="(opsiyonel)"
                                />
                            </ItemContent>
                        </Item>
                    </ItemGroup>
                </div>

                {scopeOptions.length > 0 && (
                    <div>
                        <GroupCaption>Kapsamlar</GroupCaption>
                        <ItemGroup variant="inset">
                            {scopeOptions.map((s: string, i: number) => (
                                <CheckRow
                                    key={s}
                                    first={i === 0}
                                    label={s}
                                    checked={scopes.includes(s)}
                                    onToggle={() => toggleScope(s)}
                                />
                            ))}
                        </ItemGroup>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button disabled={running} onClick={evaluate}>
                        <ScalesIcon /> {running ? "Değerlendiriliyor…" : "Değerlendir"}
                    </Button>
                </div>
            </div>

            {/* ── Result ── */}
            <div>
                <GroupCaption>Sonuç</GroupCaption>
                {result === null ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <ScalesIcon />
                            </EmptyMedia>
                            <EmptyDescription>
                                Bir konu ve kaynak seçip değerlendirin.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <EvaluationResult result={result} />
                )}
            </div>
        </div>
    );
}

function EvaluationResult({ result }: any) {
    const results = result?.results || [];
    const first = results[0] || {};
    const permit = result?.status === "PERMIT" || first?.status === "PERMIT";
    const allowed = (first?.allowedScopes || [])
        .slice()
        .sort((a: any, b: any) => (a?.name || "").localeCompare(b?.name || ""));
    const denied = (first?.deniedScopes || [])
        .slice()
        .sort((a: any, b: any) => (a?.name || "").localeCompare(b?.name || ""));
    const policies = first?.policies || [];

    return (
        <div className="space-y-4">
            <Alert variant={permit ? "default" : "destructive"}>
                {permit ? <CheckCircleIcon weight="fill" /> : <XCircleIcon weight="fill" />}
                <AlertTitle>
                    {permit ? "İzin verildi (PERMIT)" : "Reddedildi (DENY)"}
                </AlertTitle>
                <AlertDescription>
                    {first?.resource?.name || "Tüm kaynaklar"}
                </AlertDescription>
            </Alert>

            {allowed.length > 0 && (
                <div>
                    <GroupCaption>İzin verilen kapsamlar</GroupCaption>
                    <ItemGroup variant="inset">
                        {allowed.map((s: any, i: number) => (
                            <Fragment key={s.id || s.name}>
                                {i > 0 && <ItemSeparator />}
                                <Item size="sm">
                                    <ItemContent>
                                        <ItemTitle className="font-normal text-sm">
                                            {s.name}
                                        </ItemTitle>
                                    </ItemContent>
                                    <ItemActions>
                                        <CheckCircleIcon
                                            className="size-5 text-primary"
                                            weight="fill"
                                        />
                                    </ItemActions>
                                </Item>
                            </Fragment>
                        ))}
                    </ItemGroup>
                </div>
            )}

            {denied.length > 0 && (
                <div>
                    <GroupCaption>Reddedilen kapsamlar</GroupCaption>
                    <ItemGroup variant="inset">
                        {denied.map((s: any, i: number) => (
                            <Fragment key={s.id || s.name}>
                                {i > 0 && <ItemSeparator />}
                                <Item size="sm">
                                    <ItemContent>
                                        <ItemTitle className="font-normal text-sm">
                                            {s.name}
                                        </ItemTitle>
                                    </ItemContent>
                                    <ItemActions>
                                        <XCircleIcon
                                            className="size-5 text-destructive"
                                            weight="fill"
                                        />
                                    </ItemActions>
                                </Item>
                            </Fragment>
                        ))}
                    </ItemGroup>
                </div>
            )}

            {policies.length > 0 && (
                <div>
                    <GroupCaption>Politika sonuçları</GroupCaption>
                    <ItemGroup variant="inset">
                        {policies.map((p: any, i: number) => (
                            <Fragment key={p?.policy?.id || i}>
                                {i > 0 && <ItemSeparator />}
                                <Item size="sm">
                                    <ItemContent>
                                        <ItemTitle className="font-normal text-sm">
                                            {p?.policy?.name || "—"}
                                        </ItemTitle>
                                    </ItemContent>
                                    <ItemActions>
                                        <Badge
                                            variant={
                                                p?.status === "PERMIT"
                                                    ? "outline"
                                                    : "destructive"
                                            }
                                        >
                                            {p?.status}
                                        </Badge>
                                    </ItemActions>
                                </Item>
                            </Fragment>
                        ))}
                    </ItemGroup>
                </div>
            )}
        </div>
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
