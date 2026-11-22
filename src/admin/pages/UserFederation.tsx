// @ts-nocheck

import {
    ArrowsClockwiseIcon,
    CaretLeftIcon,
    CaretRightIcon,
    DatabaseIcon,
    DotsThreeIcon,
    FlowArrowIcon,
    KeyIcon,
    LightningIcon,
    PlugsConnectedIcon,
    PlusIcon,
    SlidersHorizontalIcon,
    StackIcon,
    TrashIcon
} from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
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
    Children,
    Fragment,
    isValidElement,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";
import { fmtDate } from "../ui/util";

const PROVIDER_TYPE = "org.keycloak.storage.UserStorageProvider";
const MAPPER_TYPE = "org.keycloak.storage.ldap.mappers.LDAPStorageMapper";

const get = (cfg: any, k: string, d = "") => cfg?.[k]?.[0] ?? d;
const arr = (v: any) => [v == null ? "" : String(v)];
const bool = (cfg: any, k: string, d = false) => {
    const v = cfg?.[k]?.[0];
    return v == null ? d : v === "true";
};

/* ── Root page ────────────────────────────────────────────────────────── */
export default function UserFederation() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();

    const [loading, setLoading] = useState(true);
    const [parentId, setParentId] = useState<string | undefined>();
    const [providers, setProviders] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [creating, setCreating] = useState<string | null>(null); // "ldap" | "kerberos"

    const load = useCallback(
        async (pId?: string) => {
            const pid = pId ?? parentId;
            if (!pid) {
                setProviders([]);
                return [];
            }
            try {
                const list = await adminClient.components
                    .find({ type: PROVIDER_TYPE, parent: pid })
                    .catch(() => []);
                const safe = Array.isArray(list) ? list : [];
                setProviders(safe);
                return safe;
            } catch (e) {
                addError("Federasyon sağlayıcılar yüklenemedi.", e);
                setProviders([]);
                return [];
            }
        },
        [adminClient, parentId, addError]
    );

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const realmRep = await adminClient.realms
                    .findOne({ realm })
                    .catch(() => null);
                const pid = realmRep?.id;
                if (!alive) return;
                setParentId(pid);
                const list = pid
                    ? await adminClient.components
                          .find({ type: PROVIDER_TYPE, parent: pid })
                          .catch(() => [])
                    : [];
                if (!alive) return;
                setProviders(Array.isArray(list) ? list : []);
            } catch (e) {
                if (alive) addError("Federasyon sağlayıcılar yüklenemedi.", e);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, realm, addError]);

    const remove = (p: any) =>
        confirm({
            title: "Sağlayıcı silinsin mi?",
            message: `“${p.name}” federasyon sağlayıcısı ve içe aktarılan kullanıcılar etkilenebilir.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.components.del({ id: p.id });
                    addAlert("Federasyon sağlayıcı silindi.", AlertVariant.success);
                    if (selected?.id === p.id) setSelected(null);
                    await load();
                } catch (e) {
                    addError("Federasyon sağlayıcı silinemedi.", e);
                }
            }
        });

    if (loading)
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <div className="flex justify-center py-16">
                    <Spinner className="size-6" />
                </div>
            </div>
        );

    if (selected)
        return (
            <ProviderDetail
                parentId={parentId}
                provider={selected}
                onBack={() => setSelected(null)}
                onChanged={async () => {
                    const list = await load();
                    const fresh = list.find((p: any) => p.id === selected.id);
                    if (fresh) setSelected(fresh);
                }}
                onDeleted={async () => {
                    setSelected(null);
                    await load();
                }}
            />
        );

    const sorted = [...providers].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
    );

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button>
                            <PlusIcon /> Sağlayıcı ekle
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setCreating("ldap")}>
                            <DatabaseIcon /> LDAP
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCreating("kerberos")}>
                            <KeyIcon /> Kerberos
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {sorted.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <DatabaseIcon />
                        </EmptyMedia>
                        <EmptyTitle>Federasyon sağlayıcı yok</EmptyTitle>
                        <EmptyDescription>
                            LDAP veya Kerberos ekleyerek harici kullanıcı kaynaklarını
                            bağla.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {sorted.map(p => {
                        const enabled = get(p.config, "enabled", "true") !== "false";
                        const isKerberos = p.providerId === "kerberos";
                        return (
                            <Item key={p.id} variant="outline" size="sm">
                                <ItemMedia variant="icon">
                                    {isKerberos ? <KeyIcon /> : <DatabaseIcon />}
                                </ItemMedia>
                                <ItemContent className="min-w-0">
                                    <ItemTitle>
                                        <Button
                                            variant="link"
                                            className="h-auto p-0"
                                            onClick={() => setSelected(p)}
                                        >
                                            {p.name}
                                        </Button>
                                    </ItemTitle>
                                    <ItemDescription className="truncate">
                                        {p.providerId} ·{" "}
                                        {enabled ? "Etkin" : "Kapalı"}
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        title="Sil"
                                        aria-label="Sil"
                                        onClick={() => remove(p)}
                                    >
                                        <TrashIcon />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={p.name}
                                        onClick={() => setSelected(p)}
                                    >
                                        <CaretRightIcon className="rtl:rotate-180" />
                                    </Button>
                                </ItemActions>
                            </Item>
                        );
                    })}
                </div>
            )}

            {creating && parentId && (
                <CreateProviderModal
                    kind={creating}
                    parentId={parentId}
                    onClose={() => setCreating(null)}
                    onCreated={async id => {
                        setCreating(null);
                        const list = await load();
                        const fresh = list.find((p: any) => p.id === id);
                        if (fresh) setSelected(fresh);
                    }}
                />
            )}
            {confirmNode}
        </div>
    );
}

/* ── Create modal ─────────────────────────────────────────────────────── */
function CreateProviderModal({ kind, parentId, onClose, onCreated }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [name, setName] = useState(kind);
    const [saving, setSaving] = useState(false);
    const isLdap = kind === "ldap";

    const [f, setF] = useState(
        isLdap
            ? {
                  connectionUrl: "",
                  bindDn: "",
                  bindCredential: "",
                  usersDn: "",
                  usernameLDAPAttribute: "uid",
                  rdnLDAPAttribute: "uid",
                  uuidLDAPAttribute: "entryUUID",
                  userObjectClasses: "inetOrgPerson, organizationalPerson"
              }
            : {
                  kerberosRealm: "",
                  serverPrincipal: "",
                  keyTab: ""
              }
    );
    const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

    const create = async () => {
        const n = name.trim();
        if (!n) {
            addAlert("Ad zorunludur.", AlertVariant.warning);
            return;
        }
        const config = isLdap
            ? {
                  enabled: ["true"],
                  editMode: ["READ_ONLY"],
                  importEnabled: ["true"],
                  connectionUrl: arr(f.connectionUrl),
                  bindDn: arr(f.bindDn),
                  bindCredential: arr(f.bindCredential),
                  usersDn: arr(f.usersDn),
                  usernameLDAPAttribute: arr(f.usernameLDAPAttribute),
                  rdnLDAPAttribute: arr(f.rdnLDAPAttribute),
                  uuidLDAPAttribute: arr(f.uuidLDAPAttribute),
                  userObjectClasses: arr(f.userObjectClasses),
                  searchScope: ["1"],
                  authType: [f.bindDn ? "simple" : "none"]
              }
            : {
                  enabled: ["true"],
                  kerberosRealm: arr(f.kerberosRealm),
                  serverPrincipal: arr(f.serverPrincipal),
                  keyTab: arr(f.keyTab),
                  debug: ["false"],
                  allowPasswordAuthentication: ["false"],
                  updateProfileFirstLogin: ["false"]
              };
        setSaving(true);
        try {
            const res = await adminClient.components.create({
                name: n,
                providerId: kind,
                providerType: PROVIDER_TYPE,
                parentId,
                config
            });
            addAlert("Federasyon sağlayıcı oluşturuldu.", AlertVariant.success);
            onCreated(res?.id);
        } catch (e) {
            addError("Federasyon sağlayıcı oluşturulamadı.", e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>
                        {isLdap ? "LDAP sağlayıcı ekle" : "Kerberos sağlayıcı ekle"}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody className="flex flex-col gap-4">
                <SettingsGroup>
                    <StackField label="Görünen ad">
                        <Input
                            size="md"
                            autoFocus
                            value={name}
                            onChange={(e: any) => setName(e.target.value)}
                        />
                    </StackField>
                </SettingsGroup>

                {isLdap ? (
                    <SettingsGroup>
                        <StackField label="Bağlantı URL'i">
                            <Input
                                size="md"
                                value={f.connectionUrl}
                                onChange={(e: any) =>
                                    set("connectionUrl", e.target.value)
                                }
                                placeholder="ldap://host:389"
                            />
                        </StackField>
                        <StackField label="Bind DN">
                            <Input
                                size="md"
                                value={f.bindDn}
                                onChange={(e: any) => set("bindDn", e.target.value)}
                                placeholder="cn=admin,dc=example,dc=org"
                            />
                        </StackField>
                        <StackField label="Bind kimlik bilgisi">
                            <Input
                                size="md"
                                type="password"
                                value={f.bindCredential}
                                onChange={(e: any) =>
                                    set("bindCredential", e.target.value)
                                }
                            />
                        </StackField>
                        <StackField label="Kullanıcılar DN">
                            <Input
                                size="md"
                                value={f.usersDn}
                                onChange={(e: any) => set("usersDn", e.target.value)}
                                placeholder="ou=users,dc=example,dc=org"
                            />
                        </StackField>
                        <StackField label="Kullanıcı adı LDAP özniteliği">
                            <Input
                                size="md"
                                value={f.usernameLDAPAttribute}
                                onChange={(e: any) =>
                                    set("usernameLDAPAttribute", e.target.value)
                                }
                            />
                        </StackField>
                    </SettingsGroup>
                ) : (
                    <SettingsGroup>
                        <StackField label="Kerberos realm">
                            <Input
                                size="md"
                                value={f.kerberosRealm}
                                onChange={(e: any) =>
                                    set("kerberosRealm", e.target.value)
                                }
                                placeholder="EXAMPLE.ORG"
                            />
                        </StackField>
                        <StackField label="Server principal">
                            <Input
                                size="md"
                                value={f.serverPrincipal}
                                onChange={(e: any) =>
                                    set("serverPrincipal", e.target.value)
                                }
                                placeholder="HTTP/host@EXAMPLE.ORG"
                            />
                        </StackField>
                        <StackField label="Keytab">
                            <Input
                                size="md"
                                value={f.keyTab}
                                onChange={(e: any) => set("keyTab", e.target.value)}
                                placeholder="/etc/krb5.keytab"
                            />
                        </StackField>
                    </SettingsGroup>
                )}
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving || !name.trim()} onClick={create}>
                        {saving ? "Oluşturuluyor…" : "Oluştur"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/* ── Provider detail ──────────────────────────────────────────────────── */
const LDAP_TABS = [
    { value: "connection", label: "Bağlantı" },
    { value: "searching", label: "Arama" },
    { value: "sync", label: "Senkron" },
    { value: "cache", label: "Önbellek" },
    { value: "advanced", label: "Gelişmiş" },
    { value: "mappers", label: "Eşleyiciler" }
];
const KERBEROS_TABS = [
    { value: "connection", label: "Genel" },
    { value: "cache", label: "Önbellek" }
];

function ProviderDetail({ parentId, provider, onBack, onChanged, onDeleted }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const isLdap = provider.providerId === "ldap";
    const [tab, setTab] = useState("connection");

    const remove = () =>
        confirm({
            title: "Sağlayıcı silinsin mi?",
            message: `“${provider.name}” kalıcı olarak silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.components.del({ id: provider.id });
                    addAlert("Federasyon sağlayıcı silindi.", AlertVariant.success);
                    onDeleted();
                } catch (e) {
                    addError("Silinemedi.", e);
                }
            }
        });

    const runSync = async (action?: string) => {
        try {
            const res = await adminClient.userStorageProvider.sync({
                id: provider.id,
                action
            });
            addAlert(
                `Senkronizasyon tamamlandı: ${res?.added ?? 0} eklendi, ${res?.updated ?? 0} güncellendi, ${res?.removed ?? 0} kaldırıldı, ${res?.failed ?? 0} hata.`,
                res?.failed ? AlertVariant.warning : AlertVariant.success
            );
            onChanged();
        } catch (e) {
            addError("Senkronizasyon başarısız.", e);
        }
    };

    const removeImported = () =>
        confirm({
            title: "İçe aktarılan kullanıcıları kaldır",
            message:
                "Bu sağlayıcıdan içe aktarılmış tüm kullanıcılar Keycloak'tan kaldırılacak.",
            confirmLabel: "Kaldır",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.userStorageProvider.removeImportedUsers({
                        id: provider.id
                    });
                    addAlert(
                        "İçe aktarılan kullanıcılar kaldırıldı.",
                        AlertVariant.success
                    );
                } catch (e) {
                    addError("Kaldırılamadı.", e);
                }
            }
        });

    const unlink = () =>
        confirm({
            title: "Kullanıcı bağlantılarını çöz",
            message:
                "İçe aktarılan kullanıcıların federasyon bağlantısı kaldırılır; yerel hesap olarak kalırlar.",
            confirmLabel: "Bağlantıları çöz",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.userStorageProvider.unlinkUsers({
                        id: provider.id
                    });
                    addAlert("Kullanıcı bağlantıları çözüldü.", AlertVariant.success);
                } catch (e) {
                    addError("İşlem başarısız.", e);
                }
            }
        });

    const tabs = isLdap ? LDAP_TABS : KERBEROS_TABS;
    const enabled = get(provider.config, "enabled", "true") !== "false";

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="relative mb-6 flex items-center">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={onBack}
                    aria-label="Geri"
                >
                    <CaretLeftIcon weight="bold" />
                </Button>
                <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-center">
                    <p className="font-semibold">{provider.name}</p>
                    {!enabled && <Badge variant="destructive">Kapalı</Badge>}
                </div>
                <div className="ms-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" aria-label="Eylemler">
                                <DotsThreeIcon className="size-5" weight="bold" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {isLdap && (
                                <>
                                    <DropdownMenuItem
                                        onClick={() => runSync("triggerFullSync")}
                                    >
                                        <ArrowsClockwiseIcon /> Tüm kullanıcıları
                                        senkronize et
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => runSync("triggerChangedUsersSync")}
                                    >
                                        <ArrowsClockwiseIcon /> Değişenleri senkronize et
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem onClick={unlink}>
                                <FlowArrowIcon /> Kullanıcı bağlantılarını çöz
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={removeImported}>
                                <StackIcon /> İçe aktarılanları kaldır
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={remove}>
                                <TrashIcon /> Sil
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="mb-5 flex justify-center">
                <SegmentPicker value={tab} onValueChange={setTab} aria-label="Sekmeler">
                    {tabs.map(t => (
                        <SegmentPickerItem key={t.value} value={t.value} label={t.label} />
                    ))}
                </SegmentPicker>
            </div>

            {tab === "connection" &&
                (isLdap ? (
                    <ConnectionTab provider={provider} onChanged={onChanged} />
                ) : (
                    <KerberosTab provider={provider} onChanged={onChanged} />
                ))}
            {tab === "searching" && isLdap && (
                <SearchingTab provider={provider} onChanged={onChanged} />
            )}
            {tab === "sync" && isLdap && (
                <SyncTab provider={provider} onChanged={onChanged} onRunSync={runSync} />
            )}
            {tab === "cache" && <CacheTab provider={provider} onChanged={onChanged} />}
            {tab === "advanced" && isLdap && (
                <AdvancedTab provider={provider} onChanged={onChanged} />
            )}
            {tab === "mappers" && isLdap && (
                <MappersTab provider={provider} parentId={parentId} />
            )}

            {confirmNode}
        </div>
    );
}

/* ── Save helper ──────────────────────────────────────────────────────── */
function useSaver(provider: any, onChanged: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [saving, setSaving] = useState(false);
    const save = async (patch: Record<string, string[]>) => {
        setSaving(true);
        try {
            await adminClient.components.update(
                { id: provider.id },
                { ...provider, config: { ...(provider.config ?? {}), ...patch } }
            );
            addAlert("Kaydedildi.", AlertVariant.success);
            await onChanged();
        } catch (e) {
            addError("Kaydedilemedi.", e);
        } finally {
            setSaving(false);
        }
    };
    return { save, saving };
}

/* ── LDAP: Connection ─────────────────────────────────────────────────── */
function ConnectionTab({ provider, onChanged }: any) {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const { save, saving } = useSaver(provider, onChanged);
    const c = provider.config ?? {};

    const [f, setF] = useState({
        connectionUrl: get(c, "connectionUrl"),
        bindDn: get(c, "bindDn"),
        bindCredential: get(c, "bindCredential"),
        authType: get(c, "authType", "simple"),
        useTruststoreSpi: get(c, "useTruststoreSpi", "always"),
        startTls: bool(c, "startTls"),
        connectionPooling: bool(c, "connectionPooling"),
        enabled: get(c, "enabled", "true") !== "false"
    });
    const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
    const [testing, setTesting] = useState<string | null>(null);

    const test = async (action: "testConnection" | "testAuthentication") => {
        setTesting(action);
        try {
            await adminClient.realms.testLDAPConnection(
                { realm },
                {
                    action,
                    connectionUrl: f.connectionUrl,
                    bindDn: f.bindDn,
                    bindCredential:
                        f.bindCredential === "**********" ? "" : f.bindCredential,
                    useTruststoreSpi: f.useTruststoreSpi,
                    connectionTimeout: "",
                    startTls: String(f.startTls),
                    authType: f.authType,
                    componentId: provider.id
                }
            );
            addAlert(
                action === "testConnection"
                    ? "Bağlantı başarılı."
                    : "Kimlik doğrulama başarılı.",
                AlertVariant.success
            );
        } catch (e) {
            addError(
                action === "testConnection"
                    ? "Bağlantı başarısız."
                    : "Kimlik doğrulama başarısız.",
                e
            );
        } finally {
            setTesting(null);
        }
    };

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <div>
                <Caption>Bağlantı</Caption>
                <SettingsGroup>
                    <ToggleRow
                        label="Etkin"
                        checked={f.enabled}
                        onCheckedChange={(v: boolean) => set("enabled", v)}
                    />
                    <StackField label="Bağlantı URL'i">
                        <Input
                            size="md"
                            value={f.connectionUrl}
                            onChange={(e: any) => set("connectionUrl", e.target.value)}
                            placeholder="ldap://host:389"
                        />
                    </StackField>
                    <SettingRow label="Kimlik doğrulama türü">
                        <Select
                            value={f.authType}
                            onValueChange={(v: string) => set("authType", v)}
                        >
                            <SelectTrigger size="sm" className="w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="simple">simple</SelectItem>
                                <SelectItem value="none">none</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingRow>
                    {f.authType === "simple" && (
                        <>
                            <StackField label="Bind DN">
                                <Input
                                    size="md"
                                    value={f.bindDn}
                                    onChange={(e: any) => set("bindDn", e.target.value)}
                                />
                            </StackField>
                            <StackField label="Bind kimlik bilgisi">
                                <Input
                                    size="md"
                                    type="password"
                                    value={f.bindCredential}
                                    onChange={(e: any) =>
                                        set("bindCredential", e.target.value)
                                    }
                                />
                            </StackField>
                        </>
                    )}
                    <SettingRow label="Truststore SPI">
                        <Select
                            value={f.useTruststoreSpi}
                            onValueChange={(v: string) => set("useTruststoreSpi", v)}
                        >
                            <SelectTrigger size="sm" className="w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="always">Her zaman</SelectItem>
                                <SelectItem value="ldapsOnly">Yalnızca ldaps</SelectItem>
                                <SelectItem value="never">Asla</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingRow>
                    <ToggleRow
                        label="StartTLS"
                        checked={f.startTls}
                        onCheckedChange={(v: boolean) => set("startTls", v)}
                    />
                    <ToggleRow
                        label="Bağlantı havuzu"
                        checked={f.connectionPooling}
                        onCheckedChange={(v: boolean) => set("connectionPooling", v)}
                    />
                </SettingsGroup>
            </div>

            <div>
                <Caption>Doğrulama</Caption>
                <SettingsGroup>
                    <ActionItem
                        disabled={!!testing}
                        onClick={() => test("testConnection")}
                    >
                        <PlugsConnectedIcon />
                        {testing === "testConnection"
                            ? "Test ediliyor…"
                            : "Bağlantıyı test et"}
                    </ActionItem>
                    <ActionItem
                        disabled={!!testing}
                        onClick={() => test("testAuthentication")}
                    >
                        <KeyIcon />
                        {testing === "testAuthentication"
                            ? "Test ediliyor…"
                            : "Kimlik doğrulamayı test et"}
                    </ActionItem>
                </SettingsGroup>
                <Footnote>
                    Test, kaydetmeden önce mevcut form değerlerini kullanır.
                </Footnote>
            </div>

            <div className="flex justify-end">
                <Button
                    disabled={saving}
                    onClick={() =>
                        save({
                            enabled: [String(f.enabled)],
                            connectionUrl: arr(f.connectionUrl),
                            bindDn: arr(f.bindDn),
                            bindCredential: arr(f.bindCredential),
                            authType: arr(f.authType),
                            useTruststoreSpi: arr(f.useTruststoreSpi),
                            startTls: [String(f.startTls)],
                            connectionPooling: [String(f.connectionPooling)]
                        })
                    }
                >
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>
        </div>
    );
}

/* ── LDAP: Searching ──────────────────────────────────────────────────── */
function SearchingTab({ provider, onChanged }: any) {
    const { save, saving } = useSaver(provider, onChanged);
    const c = provider.config ?? {};
    const [f, setF] = useState({
        editMode: get(c, "editMode", "READ_ONLY"),
        usersDn: get(c, "usersDn"),
        usernameLDAPAttribute: get(c, "usernameLDAPAttribute", "uid"),
        rdnLDAPAttribute: get(c, "rdnLDAPAttribute", "uid"),
        uuidLDAPAttribute: get(c, "uuidLDAPAttribute", "entryUUID"),
        userObjectClasses: get(
            c,
            "userObjectClasses",
            "inetOrgPerson, organizationalPerson"
        ),
        searchScope: get(c, "searchScope", "1")
    });
    const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <Caption>Arama ve kullanıcı eşleme</Caption>
            <SettingsGroup>
                <SettingRow label="Düzenleme modu">
                    <Select
                        value={f.editMode}
                        onValueChange={(v: string) => set("editMode", v)}
                    >
                        <SelectTrigger size="sm" className="w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="READ_ONLY">READ_ONLY</SelectItem>
                            <SelectItem value="WRITABLE">WRITABLE</SelectItem>
                            <SelectItem value="UNSYNCED">UNSYNCED</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingRow>
                <StackField label="Kullanıcılar DN">
                    <Input
                        size="md"
                        value={f.usersDn}
                        onChange={(e: any) => set("usersDn", e.target.value)}
                        placeholder="ou=users,dc=example,dc=org"
                    />
                </StackField>
                <StackField label="Kullanıcı adı LDAP özniteliği">
                    <Input
                        size="md"
                        value={f.usernameLDAPAttribute}
                        onChange={(e: any) =>
                            set("usernameLDAPAttribute", e.target.value)
                        }
                    />
                </StackField>
                <StackField label="RDN LDAP özniteliği">
                    <Input
                        size="md"
                        value={f.rdnLDAPAttribute}
                        onChange={(e: any) => set("rdnLDAPAttribute", e.target.value)}
                    />
                </StackField>
                <StackField label="UUID LDAP özniteliği">
                    <Input
                        size="md"
                        value={f.uuidLDAPAttribute}
                        onChange={(e: any) => set("uuidLDAPAttribute", e.target.value)}
                    />
                </StackField>
                <StackField label="Kullanıcı nesne sınıfları" hint="Virgülle ayrılmış.">
                    <Input
                        size="md"
                        value={f.userObjectClasses}
                        onChange={(e: any) => set("userObjectClasses", e.target.value)}
                    />
                </StackField>
                <SettingRow label="Arama kapsamı">
                    <Select
                        value={f.searchScope}
                        onValueChange={(v: string) => set("searchScope", v)}
                    >
                        <SelectTrigger size="sm" className="w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Tek seviye</SelectItem>
                            <SelectItem value="2">Alt ağaç</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingRow>
            </SettingsGroup>
            <div className="flex justify-end">
                <Button
                    disabled={saving}
                    onClick={() =>
                        save({
                            editMode: arr(f.editMode),
                            usersDn: arr(f.usersDn),
                            usernameLDAPAttribute: arr(f.usernameLDAPAttribute),
                            rdnLDAPAttribute: arr(f.rdnLDAPAttribute),
                            uuidLDAPAttribute: arr(f.uuidLDAPAttribute),
                            userObjectClasses: arr(f.userObjectClasses),
                            searchScope: arr(f.searchScope)
                        })
                    }
                >
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>
        </div>
    );
}

/* ── LDAP: Sync ───────────────────────────────────────────────────────── */
function SyncTab({ provider, onChanged, onRunSync }: any) {
    const { save, saving } = useSaver(provider, onChanged);
    const c = provider.config ?? {};
    const [f, setF] = useState({
        importEnabled: bool(c, "importEnabled", true),
        syncRegistrations: bool(c, "syncRegistrations"),
        batchSizeForSync: get(c, "batchSizeForSync", "1000"),
        fullSyncPeriod: get(c, "fullSyncPeriod", "-1"),
        changedSyncPeriod: get(c, "changedSyncPeriod", "-1")
    });
    const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <div>
                <Caption>Senkronizasyon ayarları</Caption>
                <SettingsGroup>
                    <ToggleRow
                        label="İçe aktarma etkin"
                        checked={f.importEnabled}
                        onCheckedChange={(v: boolean) => set("importEnabled", v)}
                    />
                    <ToggleRow
                        label="Kayıtları senkronize et"
                        checked={f.syncRegistrations}
                        onCheckedChange={(v: boolean) => set("syncRegistrations", v)}
                    />
                    <SettingRow label="Senkron parti boyutu">
                        <Input
                            size="md"
                            type="number"
                            className="w-28"
                            value={f.batchSizeForSync}
                            onChange={(e: any) => set("batchSizeForSync", e.target.value)}
                        />
                    </SettingRow>
                    <SettingRow label="Tam senkron periyodu (sn)" hint="-1 = kapalı">
                        <Input
                            size="md"
                            type="number"
                            className="w-28"
                            value={f.fullSyncPeriod}
                            onChange={(e: any) => set("fullSyncPeriod", e.target.value)}
                        />
                    </SettingRow>
                    <SettingRow label="Değişen senkron periyodu (sn)" hint="-1 = kapalı">
                        <Input
                            size="md"
                            type="number"
                            className="w-28"
                            value={f.changedSyncPeriod}
                            onChange={(e: any) =>
                                set("changedSyncPeriod", e.target.value)
                            }
                        />
                    </SettingRow>
                </SettingsGroup>
                <div className="mt-3 flex justify-end">
                    <Button
                        disabled={saving}
                        onClick={() =>
                            save({
                                importEnabled: [String(f.importEnabled)],
                                syncRegistrations: [String(f.syncRegistrations)],
                                batchSizeForSync: arr(f.batchSizeForSync),
                                fullSyncPeriod: arr(f.fullSyncPeriod),
                                changedSyncPeriod: arr(f.changedSyncPeriod)
                            })
                        }
                    >
                        {saving ? "Kaydediliyor…" : "Kaydet"}
                    </Button>
                </div>
            </div>

            <div>
                <Caption>Manuel senkronizasyon</Caption>
                <SettingsGroup>
                    <ActionItem onClick={() => onRunSync("triggerFullSync")}>
                        <ArrowsClockwiseIcon /> Tüm kullanıcıları
                        senkronize et
                    </ActionItem>
                    <ActionItem onClick={() => onRunSync("triggerChangedUsersSync")}>
                        <ArrowsClockwiseIcon /> Değişen
                        kullanıcıları senkronize et
                    </ActionItem>
                </SettingsGroup>
            </div>
        </div>
    );
}

/* ── Cache (LDAP + Kerberos) ──────────────────────────────────────────── */
function CacheTab({ provider, onChanged }: any) {
    const { save, saving } = useSaver(provider, onChanged);
    const c = provider.config ?? {};
    const [policy, setPolicy] = useState(get(c, "cachePolicy", "DEFAULT"));
    const [evictionDay, setEvictionDay] = useState(get(c, "evictionDay"));
    const [evictionHour, setEvictionHour] = useState(get(c, "evictionHour"));
    const [evictionMinute, setEvictionMinute] = useState(get(c, "evictionMinute"));
    const [maxLifespan, setMaxLifespan] = useState(get(c, "maxLifespan"));

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <Caption>Önbellek politikası</Caption>
            <SettingsGroup>
                <SettingRow label="Önbellek politikası">
                    <Select value={policy} onValueChange={setPolicy}>
                        <SelectTrigger size="sm" className="w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DEFAULT">DEFAULT</SelectItem>
                            <SelectItem value="EVICT_DAILY">EVICT_DAILY</SelectItem>
                            <SelectItem value="EVICT_WEEKLY">EVICT_WEEKLY</SelectItem>
                            <SelectItem value="MAX_LIFESPAN">MAX_LIFESPAN</SelectItem>
                            <SelectItem value="NO_CACHE">NO_CACHE</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingRow>
                {policy === "EVICT_WEEKLY" && (
                    <SettingRow label="Tahliye günü (1-7)">
                        <Input
                            size="md"
                            type="number"
                            className="w-28"
                            value={evictionDay}
                            onChange={(e: any) => setEvictionDay(e.target.value)}
                        />
                    </SettingRow>
                )}
                {(policy === "EVICT_DAILY" || policy === "EVICT_WEEKLY") && (
                    <>
                        <SettingRow label="Tahliye saati (0-23)">
                            <Input
                                size="md"
                                type="number"
                                className="w-28"
                                value={evictionHour}
                                onChange={(e: any) => setEvictionHour(e.target.value)}
                            />
                        </SettingRow>
                        <SettingRow label="Tahliye dakikası (0-59)">
                            <Input
                                size="md"
                                type="number"
                                className="w-28"
                                value={evictionMinute}
                                onChange={(e: any) => setEvictionMinute(e.target.value)}
                            />
                        </SettingRow>
                    </>
                )}
                {policy === "MAX_LIFESPAN" && (
                    <SettingRow label="Maks. ömür (ms)">
                        <Input
                            size="md"
                            type="number"
                            className="w-32"
                            value={maxLifespan}
                            onChange={(e: any) => setMaxLifespan(e.target.value)}
                        />
                    </SettingRow>
                )}
            </SettingsGroup>
            <div className="flex justify-end">
                <Button
                    disabled={saving}
                    onClick={() =>
                        save({
                            cachePolicy: arr(policy),
                            evictionDay: arr(evictionDay),
                            evictionHour: arr(evictionHour),
                            evictionMinute: arr(evictionMinute),
                            maxLifespan: arr(maxLifespan)
                        })
                    }
                >
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>
        </div>
    );
}

/* ── LDAP: Advanced ───────────────────────────────────────────────────── */
function AdvancedTab({ provider, onChanged }: any) {
    const { save, saving } = useSaver(provider, onChanged);
    const c = provider.config ?? {};
    const [f, setF] = useState({
        validatePasswordPolicy: bool(c, "validatePasswordPolicy"),
        trustEmail: bool(c, "trustEmail"),
        pagination: bool(c, "pagination", true),
        usePasswordModifyExtendedOp: bool(c, "usePasswordModifyExtendedOp"),
        ldapsOnly: bool(c, "ldapsOnly"),
        priority: get(c, "priority", "0")
    });
    const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <Caption>Gelişmiş</Caption>
            <SettingsGroup>
                <ToggleRow
                    label="Şifre politikasını doğrula"
                    checked={f.validatePasswordPolicy}
                    onCheckedChange={(v: boolean) => set("validatePasswordPolicy", v)}
                />
                <ToggleRow
                    label="E-postaya güven"
                    hint="LDAP'tan gelen e-postayı doğrulanmış say."
                    checked={f.trustEmail}
                    onCheckedChange={(v: boolean) => set("trustEmail", v)}
                />
                <ToggleRow
                    label="Sayfalama"
                    checked={f.pagination}
                    onCheckedChange={(v: boolean) => set("pagination", v)}
                />
                <ToggleRow
                    label="Password Modify uzantısı"
                    checked={f.usePasswordModifyExtendedOp}
                    onCheckedChange={(v: boolean) => set("usePasswordModifyExtendedOp", v)}
                />
                <SettingRow label="Öncelik">
                    <Input
                        size="md"
                        type="number"
                        className="w-28"
                        value={f.priority}
                        onChange={(e: any) => set("priority", e.target.value)}
                    />
                </SettingRow>
            </SettingsGroup>
            <div className="flex justify-end">
                <Button
                    disabled={saving}
                    onClick={() =>
                        save({
                            validatePasswordPolicy: [String(f.validatePasswordPolicy)],
                            trustEmail: [String(f.trustEmail)],
                            pagination: [String(f.pagination)],
                            usePasswordModifyExtendedOp: [
                                String(f.usePasswordModifyExtendedOp)
                            ],
                            priority: arr(f.priority)
                        })
                    }
                >
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>
        </div>
    );
}

/* ── Kerberos: General ────────────────────────────────────────────────── */
function KerberosTab({ provider, onChanged }: any) {
    const { save, saving } = useSaver(provider, onChanged);
    const c = provider.config ?? {};
    const [f, setF] = useState({
        enabled: get(c, "enabled", "true") !== "false",
        kerberosRealm: get(c, "kerberosRealm"),
        serverPrincipal: get(c, "serverPrincipal"),
        keyTab: get(c, "keyTab"),
        debug: bool(c, "debug"),
        allowPasswordAuthentication: bool(c, "allowPasswordAuthentication"),
        updateProfileFirstLogin: bool(c, "updateProfileFirstLogin")
    });
    const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <Caption>Kerberos</Caption>
            <SettingsGroup>
                <ToggleRow
                    label="Etkin"
                    checked={f.enabled}
                    onCheckedChange={(v: boolean) => set("enabled", v)}
                />
                <StackField label="Kerberos realm">
                    <Input
                        size="md"
                        value={f.kerberosRealm}
                        onChange={(e: any) => set("kerberosRealm", e.target.value)}
                        placeholder="EXAMPLE.ORG"
                    />
                </StackField>
                <StackField label="Server principal">
                    <Input
                        size="md"
                        value={f.serverPrincipal}
                        onChange={(e: any) => set("serverPrincipal", e.target.value)}
                        placeholder="HTTP/host@EXAMPLE.ORG"
                    />
                </StackField>
                <StackField label="Keytab">
                    <Input
                        size="md"
                        value={f.keyTab}
                        onChange={(e: any) => set("keyTab", e.target.value)}
                        placeholder="/etc/krb5.keytab"
                    />
                </StackField>
                <ToggleRow
                    label="Şifre kimlik doğrulamasına izin ver"
                    checked={f.allowPasswordAuthentication}
                    onCheckedChange={(v: boolean) => set("allowPasswordAuthentication", v)}
                />
                <ToggleRow
                    label="İlk girişte profili güncelle"
                    checked={f.updateProfileFirstLogin}
                    onCheckedChange={(v: boolean) => set("updateProfileFirstLogin", v)}
                />
                <ToggleRow
                    label="Hata ayıklama"
                    checked={f.debug}
                    onCheckedChange={(v: boolean) => set("debug", v)}
                />
            </SettingsGroup>
            <div className="flex justify-end">
                <Button
                    disabled={saving}
                    onClick={() =>
                        save({
                            enabled: [String(f.enabled)],
                            kerberosRealm: arr(f.kerberosRealm),
                            serverPrincipal: arr(f.serverPrincipal),
                            keyTab: arr(f.keyTab),
                            debug: [String(f.debug)],
                            allowPasswordAuthentication: [
                                String(f.allowPasswordAuthentication)
                            ],
                            updateProfileFirstLogin: [String(f.updateProfileFirstLogin)]
                        })
                    }
                >
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>
        </div>
    );
}

/* ── Mappers ──────────────────────────────────────────────────────────── */
function MappersTab({ provider, parentId }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const [mappers, setMappers] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<any>(null); // mapper or {__new:true}

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await adminClient.components
                .find({ type: MAPPER_TYPE, parent: provider.id })
                .catch(() => []);
            setMappers(Array.isArray(list) ? list : []);
        } catch (e) {
            addError("Eşleyiciler yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, provider.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        (async () => {
            try {
                const si = await adminClient.serverInfo.find();
                setTypes(si?.componentTypes?.[MAPPER_TYPE] ?? []);
            } catch {
                setTypes([]);
            }
        })();
    }, [adminClient]);

    const del = (m: any) =>
        confirm({
            title: "Eşleyici silinsin mi?",
            message: `“${m.name}” eşleyicisi silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.components.del({ id: m.id });
                    addAlert("Eşleyici silindi.", AlertVariant.success);
                    setMappers(mappers.filter(x => x.id !== m.id));
                } catch (e) {
                    addError("Silinemedi.", e);
                }
            }
        });

    const syncMapper = async (m: any, direction: "fedToKeycloak" | "keycloakToFed") => {
        try {
            const res = await adminClient.userStorageProvider.mappersSync({
                id: m.id,
                parentId: provider.id,
                direction
            });
            addAlert(
                `Eşleyici senkronu: ${res?.added ?? 0} eklendi, ${res?.updated ?? 0} güncellendi, ${res?.failed ?? 0} hata.`,
                res?.failed ? AlertVariant.warning : AlertVariant.success
            );
        } catch (e) {
            addError("Eşleyici senkronu başarısız.", e);
        }
    };

    const syncable = (m: any) =>
        ["group-ldap-mapper", "role-ldap-mapper"].includes(m.providerId);

    if (loading)
        return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="ms-1 text-sm font-medium text-muted-foreground">
                    {mappers.length} eşleyici
                </h3>
                <Button
                    variant="plain"
                    size="sm"
                    onClick={() => setEditing({ __new: true })}
                >
                    <PlusIcon /> Eşleyici ekle
                </Button>
            </div>
            {mappers.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <SlidersHorizontalIcon />
                        </EmptyMedia>
                        <EmptyTitle>Eşleyici yok</EmptyTitle>
                        <EmptyDescription>
                            LDAP öznitelikleri ile Keycloak alanlarını bağlamak için
                            eşleyici ekle.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <SettingsGroup>
                    {[...mappers]
                        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                        .map(m => (
                            <Item key={m.id} size="sm">
                                <ItemMedia variant="icon">
                                    <SlidersHorizontalIcon />
                                </ItemMedia>
                                <ItemContent className="min-w-0">
                                    <ItemTitle>
                                        <Button
                                            variant="link"
                                            className="h-auto p-0"
                                            onClick={() => setEditing(m)}
                                        >
                                            {m.name}
                                        </Button>
                                    </ItemTitle>
                                    <ItemDescription className="truncate">
                                        {m.providerId}
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                {syncable(m) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label="Senkronize et"
                                            >
                                                <LightningIcon />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    syncMapper(m, "fedToKeycloak")
                                                }
                                            >
                                                <ArrowsClockwiseIcon /> LDAP → Keycloak
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    syncMapper(m, "keycloakToFed")
                                                }
                                            >
                                                <ArrowsClockwiseIcon /> Keycloak → LDAP
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    title="Sil"
                                    aria-label="Sil"
                                    onClick={() => del(m)}
                                >
                                    <TrashIcon />
                                </Button>
                                </ItemActions>
                            </Item>
                        ))}
                </SettingsGroup>
            )}

            {editing && (
                <MapperModal
                    provider={provider}
                    types={types}
                    mapper={editing.__new ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}
            {confirmNode}
        </div>
    );
}

function MapperModal({ provider, types, mapper, onClose, onSaved }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const isNew = !mapper;

    const sortedTypes = useMemo(
        () => [...(types || [])].sort((a, b) => (a.id || "").localeCompare(b.id || "")),
        [types]
    );

    const [providerId, setProviderId] = useState(
        mapper?.providerId ?? sortedTypes[0]?.id ?? ""
    );
    const [name, setName] = useState(mapper?.name ?? "");
    const [config, setConfig] = useState<Record<string, string>>(() => {
        const c = mapper?.config ?? {};
        const out: Record<string, string> = {};
        Object.keys(c).forEach(k => {
            out[k] = Array.isArray(c[k]) ? c[k][0] : String(c[k] ?? "");
        });
        return out;
    });
    const [saving, setSaving] = useState(false);

    const type = sortedTypes.find(t => t.id === providerId);
    const props = type?.properties ?? [];

    const setCfg = (k: string, v: any) => setConfig(p => ({ ...p, [k]: String(v) }));

    // seed defaults when switching type on a new mapper
    useEffect(() => {
        if (!isNew || !type) return;
        setConfig(prev => {
            const next = { ...prev };
            props.forEach((p: any) => {
                if (next[p.name] === undefined && p.defaultValue != null) {
                    next[p.name] = String(p.defaultValue);
                }
            });
            return next;
        });
        if (!name) setName(providerId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [providerId, type, props.forEach, name, isNew]);

    const save = async () => {
        const n = name.trim();
        if (!n) {
            addAlert("Ad zorunludur.", AlertVariant.warning);
            return;
        }
        const cfg: Record<string, string[]> = {};
        props.forEach((p: any) => {
            const v = config[p.name];
            if (v !== undefined && v !== "") cfg[p.name] = [v];
        });
        setSaving(true);
        try {
            if (isNew) {
                await adminClient.components.create({
                    name: n,
                    providerId,
                    providerType: MAPPER_TYPE,
                    parentId: provider.id,
                    config: cfg
                });
                addAlert("Eşleyici oluşturuldu.", AlertVariant.success);
            } else {
                await adminClient.components.update(
                    { id: mapper.id },
                    { ...mapper, name: n, config: { ...(mapper.config ?? {}), ...cfg } }
                );
                addAlert("Eşleyici güncellendi.", AlertVariant.success);
            }
            onSaved();
        } catch (e) {
            addError("Eşleyici kaydedilemedi.", e);
            setSaving(false);
        }
    };

    const renderProp = (p: any) => {
        const val =
            config[p.name] ?? (p.defaultValue != null ? String(p.defaultValue) : "");
        if (p.type === "boolean") {
            return (
                <ToggleRow
                    key={p.name}
                    label={p.label || p.name}
                    hint={p.helpText}
                    checked={val === "true"}
                    onCheckedChange={(v: boolean) => setCfg(p.name, v)}
                />
            );
        }
        if (p.type === "List" && Array.isArray(p.options) && p.options.length) {
            return (
                <SettingRow key={p.name} label={p.label || p.name} hint={p.helpText}>
                    <Select
                        value={val || p.options[0]}
                        onValueChange={(v: string) => setCfg(p.name, v)}
                    >
                        <SelectTrigger size="sm" className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {p.options.map((o: string) => (
                                <SelectItem key={o} value={o}>
                                    {o}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </SettingRow>
            );
        }
        return (
            <StackField key={p.name} label={p.label || p.name} hint={p.helpText}>
                <Input
                    size="md"
                    type={p.secret ? "password" : "text"}
                    value={val}
                    onChange={(e: any) => setCfg(p.name, e.target.value)}
                />
            </StackField>
        );
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{isNew ? "Eşleyici ekle" : "Eşleyici düzenle"}</ModalTitle>
                </ModalHeader>
                <ModalBody className="flex flex-col gap-4">
                <SettingsGroup>
                    <SettingRow label="Eşleyici türü">
                        {isNew ? (
                            <Select value={providerId} onValueChange={setProviderId}>
                                <SelectTrigger size="sm" className="w-56">
                                    <SelectValue placeholder="Tür seç…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedTypes.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <span className="text-sm text-muted-foreground">
                                {providerId}
                            </span>
                        )}
                    </SettingRow>
                    <StackField label="Ad">
                        <Input
                            size="md"
                            value={name}
                            onChange={(e: any) => setName(e.target.value)}
                        />
                    </StackField>
                </SettingsGroup>

                {type?.helpText && <Footnote>{type.helpText}</Footnote>}

                {props.length > 0 ? (
                    <SettingsGroup>{props.map(renderProp)}</SettingsGroup>
                ) : (
                    <SettingsGroup>
                        <NoteRow>Bu eşleyici türü için yapılandırma alanı yok.</NoteRow>
                    </SettingsGroup>
                )}

                {!isNew && (
                    <Footnote>
                        Eşleyici ID: {mapper.id} · Oluşturuldu{" "}
                        {fmtDate(provider.createdTimestamp)}
                    </Footnote>
                )}
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving || !name.trim()} onClick={save}>
                        {saving ? "Kaydediliyor…" : isNew ? "Oluştur" : "Kaydet"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/* ── Local layout helpers (composed only from esuiss components) ──────── */
function flatChildren(children: ReactNode): ReactNode[] {
    const out: ReactNode[] = [];
    Children.toArray(children).forEach(c => {
        if (isValidElement(c) && c.type === Fragment) {
            out.push(...flatChildren((c.props as any).children));
        } else {
            out.push(c);
        }
    });
    return out;
}

/** Inset list of rows separated by ItemSeparator. */
function SettingsGroup({ children }: { children?: ReactNode }) {
    const items = flatChildren(children);
    return (
        <ItemGroup variant="inset">
            {items.map((c: any, i) => (
                <Fragment key={c?.key ?? i}>
                    {i > 0 && <ItemSeparator />}
                    {c}
                </Fragment>
            ))}
        </ItemGroup>
    );
}

/** Caption above a group. */
function Caption({ children }: { children?: ReactNode }) {
    return <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">{children}</h3>;
}

/** Footnote below a group. */
function Footnote({ children }: { children?: ReactNode }) {
    return <p className="mt-2 ms-1 text-sm text-muted-foreground">{children}</p>;
}

/** Label-left / control-right row. */
function SettingRow({ label, hint, children }: any) {
    return (
        <Item size="sm">
            <ItemContent>
                <ItemTitle className="text-sm font-normal">{label}</ItemTitle>
                {hint && <ItemDescription>{hint}</ItemDescription>}
            </ItemContent>
            <ItemActions>{children}</ItemActions>
        </Item>
    );
}

/** Label on top, full-width control below. */
function StackField({ label, hint, children }: any) {
    return (
        <Item size="sm">
            <ItemContent className="min-w-0">
                {label && <ItemTitle className="text-sm font-normal">{label}</ItemTitle>}
                {hint && <ItemDescription>{hint}</ItemDescription>}
                <div className="mt-1.5">{children}</div>
            </ItemContent>
        </Item>
    );
}

/** Switch row. */
function ToggleRow({ label, hint, checked, onCheckedChange, disabled }: any) {
    return (
        <Item size="sm">
            <ItemContent>
                <ItemTitle className="text-sm font-normal">{label}</ItemTitle>
                {hint && <ItemDescription>{hint}</ItemDescription>}
            </ItemContent>
            <ItemActions>
                <Switch
                    checked={!!checked}
                    onCheckedChange={onCheckedChange}
                    disabled={disabled}
                    aria-label={typeof label === "string" ? label : undefined}
                />
            </ItemActions>
        </Item>
    );
}

/** Full-width action row inside a group. */
function ActionItem({ onClick, disabled, children }: any) {
    return (
        <Item size="sm">
            <Button variant="plain" size="sm" onClick={onClick} disabled={disabled}>
                {children}
            </Button>
        </Item>
    );
}

/** "No items" placeholder row inside a group. */
function NoteRow({ children }: { children?: ReactNode }) {
    return (
        <Item size="sm">
            <ItemContent>
                <ItemDescription className="text-center">{children}</ItemDescription>
            </ItemContent>
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
                    {opts?.message && <ConfirmDescription>{opts.message}</ConfirmDescription>}
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
