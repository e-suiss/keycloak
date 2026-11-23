// @ts-nocheck

import {
    ArrowsClockwiseIcon,
    DatabaseIcon,
    DotsThreeIcon,
    FlowArrowIcon,
    KeyIcon,
    PlugsConnectedIcon,
    StackIcon,
    TrashIcon
} from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { Input } from "@ui/components/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
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
import {
    Children,
    Fragment,
    isValidElement,
    type ReactNode,
    useEffect,
    useMemo,
    useState
} from "react";
import { useSearchParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { i18n } from "../i18n/i18n";
import { useT } from "../ui/i18n";
import {
    AdminPage,
    Chip,
    GROUP,
    ListSkeleton,
    Notice,
    SegmentTabs,
    Section,
    SEPARATOR,
    TextAction
} from "../ui/kit";
import { useRealm } from "../ui/realm";

const PROVIDER_TYPE = "org.keycloak.storage.UserStorageProvider";
const MAPPER_TYPE = "org.keycloak.storage.ldap.mappers.LDAPStorageMapper";
const PAGE_TITLE = "sxFederationTitle";

const fmtDate = (v: any) =>
    v
        ? new Date(typeof v === "number" ? v : Number(v) || v).toLocaleString(i18n.language)
        : "—";

const get = (cfg: any, k: string, d = "") => cfg?.[k]?.[0] ?? d;
const arr = (v: any) => [v == null ? "" : String(v)];
const bool = (cfg: any, k: string, d = false) => {
    const v = cfg?.[k]?.[0];
    return v == null ? d : v === "true";
};

export default function UserFederation() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const t = useT();
    const [confirm, confirmNode] = useConfirm();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedId = searchParams.get("provider");

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [parentId, setParentId] = useState<string | undefined>();
    const [providers, setProviders] = useState<any[]>([]);
    const [creating, setCreating] = useState<string | null>(null);

    const load = async () => {
        if (!parentId) {
            setProviders([]);
            return [];
        }
        try {
            const list = await adminClient.components.find({
                type: PROVIDER_TYPE,
                parent: parentId
            });
            const safe = Array.isArray(list) ? list : [];
            setProviders(safe);
            return safe;
        } catch (e) {
            addError(t("sxFederationProvidersLoadError"), e);
            return providers;
        }
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            setStatus("loading");
            try {
                const realmRep = await adminClient.realms.findOne({ realm });
                const pid = realmRep?.id;
                if (!alive) return;
                setParentId(pid);
                const list = pid
                    ? await adminClient.components.find({ type: PROVIDER_TYPE, parent: pid })
                    : [];
                if (!alive) return;
                setProviders(Array.isArray(list) ? list : []);
                setStatus("ready");
            } catch (e) {
                console.error("[user-federation] load failed:", e);
                if (!alive) return;
                setStatus("error");
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, realm, attempt]);

    const openProvider = (id?: string) =>
        setSearchParams(id ? { provider: id } : {});

    const remove = (p: any) =>
        confirm({
            title: t("sxFederationDeleteProviderTitle"),
            message: t("sxFederationDeleteProviderMessage", { name: p.name }),
            confirmLabel: t("sxFederationDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.components.del({ id: p.id });
                    addAlert(t("sxFederationProviderDeleted"), AlertVariant.success);
                    if (selectedId === p.id) openProvider();
                    await load();
                } catch (e) {
                    addError(t("sxFederationProviderDeleteError"), e);
                }
            }
        });

    const listPath = `/${realm}/user-federation`;
    const selected = selectedId ? providers.find(p => p.id === selectedId) : null;

    if (selectedId && status === "ready" && selected)
        return (
            <ProviderDetail
                key={selected.id}
                parentId={parentId}
                provider={selected}
                backTo={listPath}
                onChanged={async () => {
                    await load();
                }}
                onDeleted={async () => {
                    openProvider();
                    await load();
                }}
            />
        );

    if (selectedId && status !== "error")
        return (
            <AdminPage title={t(PAGE_TITLE)} back={{ label: t(PAGE_TITLE), to: listPath }}>
                {status === "loading" ? (
                    <ListSkeleton />
                ) : (
                    <Notice
                        title={t("sxFederationProviderNotFoundTitle")}
                        description={t("sxFederationProviderNotFoundDescription")}
                        action={
                            <Button size="sm" variant="plain" onClick={() => openProvider()}>
                                {t("sxFederationBackToProviders")}
                            </Button>
                        }
                    />
                )}
            </AdminPage>
        );

    const sorted = [...providers].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
    );

    const addMenu = (size?: string) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size={size}>{t("sxFederationAddProvider")}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={size ? "center" : "end"}>
                <DropdownMenuItem onClick={() => setCreating("ldap")}>
                    <DatabaseIcon /> LDAP
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreating("kerberos")}>
                    <KeyIcon /> Kerberos
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <AdminPage
            title={t(PAGE_TITLE)}
            description={t("sxFederationDescription")}
            actions={status === "ready" && addMenu()}
        >
            <Section label={t("sxFederationProviders")}>
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice
                        title={t("sxFederationProvidersLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && sorted.length === 0 && (
                    <Notice
                        title={t("sxFederationEmptyTitle")}
                        description={t("sxFederationEmptyDescription")}
                        action={parentId ? addMenu("sm") : undefined}
                    />
                )}
                {status === "ready" && sorted.length > 0 && (
                    <SettingsGroup>
                        {sorted.map(p => {
                            const enabled = get(p.config, "enabled", "true") !== "false";
                            const isKerberos = p.providerId === "kerberos";
                            return (
                                <ListRow
                                    key={p.id}
                                    onOpen={() => openProvider(p.id)}
                                    leading={
                                        <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-white dark:bg-[#48484a]">
                                            {isKerberos ? (
                                                <KeyIcon className="size-4" />
                                            ) : (
                                                <DatabaseIcon className="size-4" />
                                            )}
                                        </span>
                                    }
                                    title={p.name}
                                    subtitle={p.providerId}
                                    trailing={
                                        <>
                                            <span className="hidden sm:inline-flex">
                                                <Chip tone={enabled ? "success" : "danger"}>
                                                    {enabled ? t("sxFederationEnabled") : t("sxFederationDisabled")}
                                                </Chip>
                                            </span>
                                            <TextAction tone="danger" onClick={() => remove(p)}>
                                                {t("sxFederationDelete")}
                                            </TextAction>
                                        </>
                                    }
                                />
                            );
                        })}
                    </SettingsGroup>
                )}
            </Section>

            {creating && parentId && (
                <CreateProviderModal
                    kind={creating}
                    parentId={parentId}
                    onClose={() => setCreating(null)}
                    onCreated={async id => {
                        setCreating(null);
                        const list = await load();
                        if (id && list.some((p: any) => p.id === id)) openProvider(id);
                    }}
                />
            )}
            {confirmNode}
        </AdminPage>
    );
}

function CreateProviderModal({ kind, parentId, onClose, onCreated }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const t = useT();
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
            addAlert(t("sxFederationNameRequired"), AlertVariant.warning);
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
            addAlert(t("sxFederationProviderCreated"), AlertVariant.success);
            onCreated(res?.id);
        } catch (e) {
            addError(t("sxFederationProviderCreateError"), e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>
                        {isLdap ? t("sxFederationAddLdapTitle") : t("sxFederationAddKerberosTitle")}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody className="flex flex-col gap-4">
                <SettingsGroup>
                    <StackField label={t("sxFederationDisplayName")}>
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
                        <StackField label={t("sxFederationConnectionUrl")}>
                            <Input
                                size="md"
                                value={f.connectionUrl}
                                onChange={(e: any) =>
                                    set("connectionUrl", e.target.value)
                                }
                                placeholder="ldap://host:389"
                            />
                        </StackField>
                        <StackField label={t("sxFederationBindDn")}>
                            <Input
                                size="md"
                                value={f.bindDn}
                                onChange={(e: any) => set("bindDn", e.target.value)}
                                placeholder="cn=admin,dc=example,dc=org"
                            />
                        </StackField>
                        <StackField label={t("sxFederationBindCredential")}>
                            <Input
                                size="md"
                                type="password"
                                value={f.bindCredential}
                                onChange={(e: any) =>
                                    set("bindCredential", e.target.value)
                                }
                            />
                        </StackField>
                        <StackField label={t("sxFederationUsersDn")}>
                            <Input
                                size="md"
                                value={f.usersDn}
                                onChange={(e: any) => set("usersDn", e.target.value)}
                                placeholder="ou=users,dc=example,dc=org"
                            />
                        </StackField>
                        <StackField label={t("sxFederationUsernameAttribute")}>
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
                        <StackField label={t("sxFederationKerberosRealm")}>
                            <Input
                                size="md"
                                value={f.kerberosRealm}
                                onChange={(e: any) =>
                                    set("kerberosRealm", e.target.value)
                                }
                                placeholder="EXAMPLE.ORG"
                            />
                        </StackField>
                        <StackField label={t("sxFederationServerPrincipal")}>
                            <Input
                                size="md"
                                value={f.serverPrincipal}
                                onChange={(e: any) =>
                                    set("serverPrincipal", e.target.value)
                                }
                                placeholder="HTTP/host@EXAMPLE.ORG"
                            />
                        </StackField>
                        <StackField label={t("sxFederationKeytab")}>
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
                        {saving ? t("sxFederationCreating") : t("sxFederationCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

const LDAP_TABS = [
    { value: "connection", label: "sxFederationTabConnection" },
    { value: "searching", label: "sxFederationTabSearching" },
    { value: "sync", label: "sxFederationTabSync" },
    { value: "cache", label: "sxFederationTabCache" },
    { value: "advanced", label: "sxFederationTabAdvanced" },
    { value: "mappers", label: "sxFederationTabMappers" }
];
const KERBEROS_TABS = [
    { value: "connection", label: "sxFederationTabGeneral" },
    { value: "cache", label: "sxFederationTabCache" }
];

function ProviderDetail({ parentId, provider, backTo, onChanged, onDeleted }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const t = useT();
    const [confirm, confirmNode] = useConfirm();
    const isLdap = provider.providerId === "ldap";
    const [tab, setTab] = useState("connection");

    const remove = () =>
        confirm({
            title: t("sxFederationDeleteProviderTitle"),
            message: t("sxFederationDeleteProviderPermanent", { name: provider.name }),
            confirmLabel: t("sxFederationDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.components.del({ id: provider.id });
                    addAlert(t("sxFederationProviderDeleted"), AlertVariant.success);
                    onDeleted();
                } catch (e) {
                    addError(t("sxFederationDeleteError"), e);
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
                t("sxFederationSyncResult", {
                    added: res?.added ?? 0,
                    updated: res?.updated ?? 0,
                    removed: res?.removed ?? 0,
                    failed: res?.failed ?? 0
                }),
                res?.failed ? AlertVariant.warning : AlertVariant.success
            );
            onChanged();
        } catch (e) {
            addError(t("sxFederationSyncError"), e);
        }
    };

    const removeImported = () =>
        confirm({
            title: t("sxFederationRemoveImportedTitle"),
            message: t("sxFederationRemoveImportedMessage"),
            confirmLabel: t("sxFederationRemove"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.userStorageProvider.removeImportedUsers({
                        id: provider.id
                    });
                    addAlert(t("sxFederationImportedRemoved"), AlertVariant.success);
                } catch (e) {
                    addError(t("sxFederationRemoveError"), e);
                }
            }
        });

    const unlink = () =>
        confirm({
            title: t("sxFederationUnlinkTitle"),
            message: t("sxFederationUnlinkMessage"),
            confirmLabel: t("sxFederationUnlinkConfirm"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.userStorageProvider.unlinkUsers({
                        id: provider.id
                    });
                    addAlert(t("sxFederationUnlinked"), AlertVariant.success);
                } catch (e) {
                    addError(t("sxFederationActionFailed"), e);
                }
            }
        });

    const tabs = (isLdap ? LDAP_TABS : KERBEROS_TABS).map(x => ({
        value: x.value,
        label: t(x.label)
    }));
    const enabled = get(provider.config, "enabled", "true") !== "false";


    return (
        <AdminPage
            title={provider.name}
            description={
                <span className="inline-flex flex-wrap items-center gap-2">
                    {provider.providerId}
                    {!enabled && <Chip tone="danger">{t("sxFederationDisabled")}</Chip>}
                </span>
            }
            back={{ label: t(PAGE_TITLE), to: backTo }}
            actions={
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" aria-label={t("sxFederationActions")}>
                            <DotsThreeIcon className="size-5" weight="bold" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {isLdap && (
                            <>
                                <DropdownMenuItem onClick={() => runSync("triggerFullSync")}>
                                    <ArrowsClockwiseIcon /> {t("sxFederationSyncAll")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => runSync("triggerChangedUsersSync")}
                                >
                                    <ArrowsClockwiseIcon /> {t("sxFederationSyncChangedShort")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem onClick={unlink}>
                            <FlowArrowIcon /> {t("sxFederationUnlinkTitle")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={removeImported}>
                            <StackIcon /> {t("sxFederationRemoveImportedShort")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={remove}>
                            <TrashIcon /> {t("sxFederationDelete")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            }
        >
            <SegmentTabs value={tab} onChange={setTab} items={tabs} ariaLabel={t("sxFederationTabs")} />

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
        </AdminPage>
    );
}

function useSaver(provider: any, onChanged: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const t = useT();
    const [saving, setSaving] = useState(false);
    const save = async (patch: Record<string, string[]>) => {
        setSaving(true);
        try {
            await adminClient.components.update(
                { id: provider.id },
                { ...provider, config: { ...(provider.config ?? {}), ...patch } }
            );
            addAlert(t("sxFederationSaved"), AlertVariant.success);
            await onChanged();
        } catch (e) {
            addError(t("sxFederationSaveError"), e);
        } finally {
            setSaving(false);
        }
    };
    return { save, saving };
}

function ConnectionTab({ provider, onChanged }: any) {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const t = useT();
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
                    ? t("sxFederationTestConnectionOk")
                    : t("sxFederationTestAuthOk"),
                AlertVariant.success
            );
        } catch (e) {
            addError(
                action === "testConnection"
                    ? t("sxFederationTestConnectionFailed")
                    : t("sxFederationTestAuthFailed"),
                e
            );
        } finally {
            setTesting(null);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <Section label={t("sxFederationTabConnection")}>
                <SettingsGroup>
                    <ToggleRow
                        label={t("sxFederationEnabled")}
                        checked={f.enabled}
                        onCheckedChange={(v: boolean) => set("enabled", v)}
                    />
                    <StackField label={t("sxFederationConnectionUrl")}>
                        <Input
                            size="md"
                            value={f.connectionUrl}
                            onChange={(e: any) => set("connectionUrl", e.target.value)}
                            placeholder="ldap://host:389"
                        />
                    </StackField>
                    <SettingRow label={t("sxFederationAuthType")}>
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
                            <StackField label={t("sxFederationBindDn")}>
                                <Input
                                    size="md"
                                    value={f.bindDn}
                                    onChange={(e: any) => set("bindDn", e.target.value)}
                                />
                            </StackField>
                            <StackField label={t("sxFederationBindCredential")}>
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
                    <SettingRow label={t("sxFederationTruststoreSpi")}>
                        <Select
                            value={f.useTruststoreSpi}
                            onValueChange={(v: string) => set("useTruststoreSpi", v)}
                        >
                            <SelectTrigger size="sm" className="w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="always">{t("sxFederationTruststoreAlways")}</SelectItem>
                                <SelectItem value="ldapsOnly">{t("sxFederationTruststoreLdapsOnly")}</SelectItem>
                                <SelectItem value="never">{t("sxFederationTruststoreNever")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingRow>
                    <ToggleRow
                        label={t("sxFederationStartTls")}
                        checked={f.startTls}
                        onCheckedChange={(v: boolean) => set("startTls", v)}
                    />
                    <ToggleRow
                        label={t("sxFederationConnectionPooling")}
                        checked={f.connectionPooling}
                        onCheckedChange={(v: boolean) => set("connectionPooling", v)}
                    />
                </SettingsGroup>
            </Section>

            <Section label={t("sxFederationVerification")}>
                <SettingsGroup>
                    <ActionItem
                        disabled={!!testing}
                        onClick={() => test("testConnection")}
                    >
                        <PlugsConnectedIcon />
                        {testing === "testConnection"
                            ? t("sxFederationTesting")
                            : t("sxFederationTestConnection")}
                    </ActionItem>
                    <ActionItem
                        disabled={!!testing}
                        onClick={() => test("testAuthentication")}
                    >
                        <KeyIcon />
                        {testing === "testAuthentication"
                            ? t("sxFederationTesting")
                            : t("sxFederationTestAuth")}
                    </ActionItem>
                </SettingsGroup>
                <Footnote>
                    {t("sxFederationTestHint")}
                </Footnote>
            </Section>

            <div className="flex justify-end">
                <Button
                    size="form"
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
                    {saving ? t("sxFederationSaving") : t("sxFederationSave")}
                </Button>
            </div>
        </div>
    );
}

function SearchingTab({ provider, onChanged }: any) {
    const t = useT();
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
        <div className="flex flex-col gap-6">
            <Section label={t("sxFederationSearchingSection")}>
            <SettingsGroup>
                <SettingRow label={t("sxFederationEditMode")}>
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
                <StackField label={t("sxFederationUsersDn")}>
                    <Input
                        size="md"
                        value={f.usersDn}
                        onChange={(e: any) => set("usersDn", e.target.value)}
                        placeholder="ou=users,dc=example,dc=org"
                    />
                </StackField>
                <StackField label={t("sxFederationUsernameAttribute")}>
                    <Input
                        size="md"
                        value={f.usernameLDAPAttribute}
                        onChange={(e: any) =>
                            set("usernameLDAPAttribute", e.target.value)
                        }
                    />
                </StackField>
                <StackField label={t("sxFederationRdnAttribute")}>
                    <Input
                        size="md"
                        value={f.rdnLDAPAttribute}
                        onChange={(e: any) => set("rdnLDAPAttribute", e.target.value)}
                    />
                </StackField>
                <StackField label={t("sxFederationUuidAttribute")}>
                    <Input
                        size="md"
                        value={f.uuidLDAPAttribute}
                        onChange={(e: any) => set("uuidLDAPAttribute", e.target.value)}
                    />
                </StackField>
                <StackField label={t("sxFederationUserObjectClasses")} hint={t("sxFederationCommaSeparated")}>
                    <Input
                        size="md"
                        value={f.userObjectClasses}
                        onChange={(e: any) => set("userObjectClasses", e.target.value)}
                    />
                </StackField>
                <SettingRow label={t("sxFederationSearchScope")}>
                    <Select
                        value={f.searchScope}
                        onValueChange={(v: string) => set("searchScope", v)}
                    >
                        <SelectTrigger size="sm" className="w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">{t("sxFederationScopeOneLevel")}</SelectItem>
                            <SelectItem value="2">{t("sxFederationScopeSubtree")}</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingRow>
            </SettingsGroup>
            </Section>
            <div className="flex justify-end">
                <Button
                    size="form"
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
                    {saving ? t("sxFederationSaving") : t("sxFederationSave")}
                </Button>
            </div>
        </div>
    );
}

function SyncTab({ provider, onChanged, onRunSync }: any) {
    const t = useT();
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
        <div className="flex flex-col gap-6">
            <Section label={t("sxFederationSyncSettings")}>
                <SettingsGroup>
                    <ToggleRow
                        label={t("sxFederationImportEnabled")}
                        checked={f.importEnabled}
                        onCheckedChange={(v: boolean) => set("importEnabled", v)}
                    />
                    <ToggleRow
                        label={t("sxFederationSyncRegistrations")}
                        checked={f.syncRegistrations}
                        onCheckedChange={(v: boolean) => set("syncRegistrations", v)}
                    />
                    <SettingRow label={t("sxFederationBatchSize")}>
                        <Input
                            size="md"
                            type="number"
                            className="w-28"
                            value={f.batchSizeForSync}
                            onChange={(e: any) => set("batchSizeForSync", e.target.value)}
                        />
                    </SettingRow>
                    <SettingRow label={t("sxFederationFullSyncPeriod")} hint={t("sxFederationPeriodHint")}>
                        <Input
                            size="md"
                            type="number"
                            className="w-28"
                            value={f.fullSyncPeriod}
                            onChange={(e: any) => set("fullSyncPeriod", e.target.value)}
                        />
                    </SettingRow>
                    <SettingRow label={t("sxFederationChangedSyncPeriod")} hint={t("sxFederationPeriodHint")}>
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
                <div className="mt-4 flex justify-end">
                    <Button
                        size="form"
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
                        {saving ? t("sxFederationSaving") : t("sxFederationSave")}
                    </Button>
                </div>
            </Section>

            <Section label={t("sxFederationManualSync")}>
                <SettingsGroup>
                    <ActionItem onClick={() => onRunSync("triggerFullSync")}>
                        <ArrowsClockwiseIcon /> {t("sxFederationSyncAll")}
                    </ActionItem>
                    <ActionItem onClick={() => onRunSync("triggerChangedUsersSync")}>
                        <ArrowsClockwiseIcon /> {t("sxFederationSyncChanged")}
                    </ActionItem>
                </SettingsGroup>
            </Section>
        </div>
    );
}

function CacheTab({ provider, onChanged }: any) {
    const t = useT();
    const { save, saving } = useSaver(provider, onChanged);
    const c = provider.config ?? {};
    const [policy, setPolicy] = useState(get(c, "cachePolicy", "DEFAULT"));
    const [evictionDay, setEvictionDay] = useState(get(c, "evictionDay"));
    const [evictionHour, setEvictionHour] = useState(get(c, "evictionHour"));
    const [evictionMinute, setEvictionMinute] = useState(get(c, "evictionMinute"));
    const [maxLifespan, setMaxLifespan] = useState(get(c, "maxLifespan"));

    return (
        <div className="flex flex-col gap-6">
            <Section label={t("sxFederationCachePolicy")}>
            <SettingsGroup>
                <SettingRow label={t("sxFederationCachePolicy")}>
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
                    <SettingRow label={t("sxFederationEvictionDay")}>
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
                        <SettingRow label={t("sxFederationEvictionHour")}>
                            <Input
                                size="md"
                                type="number"
                                className="w-28"
                                value={evictionHour}
                                onChange={(e: any) => setEvictionHour(e.target.value)}
                            />
                        </SettingRow>
                        <SettingRow label={t("sxFederationEvictionMinute")}>
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
                    <SettingRow label={t("sxFederationMaxLifespan")}>
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
            </Section>
            <div className="flex justify-end">
                <Button
                    size="form"
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
                    {saving ? t("sxFederationSaving") : t("sxFederationSave")}
                </Button>
            </div>
        </div>
    );
}

function AdvancedTab({ provider, onChanged }: any) {
    const t = useT();
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
        <div className="flex flex-col gap-6">
            <Section label={t("sxFederationTabAdvanced")}>
            <SettingsGroup>
                <ToggleRow
                    label={t("sxFederationValidatePasswordPolicy")}
                    checked={f.validatePasswordPolicy}
                    onCheckedChange={(v: boolean) => set("validatePasswordPolicy", v)}
                />
                <ToggleRow
                    label={t("sxFederationTrustEmail")}
                    hint={t("sxFederationTrustEmailHint")}
                    checked={f.trustEmail}
                    onCheckedChange={(v: boolean) => set("trustEmail", v)}
                />
                <ToggleRow
                    label={t("sxFederationPagination")}
                    checked={f.pagination}
                    onCheckedChange={(v: boolean) => set("pagination", v)}
                />
                <ToggleRow
                    label={t("sxFederationPasswordModify")}
                    checked={f.usePasswordModifyExtendedOp}
                    onCheckedChange={(v: boolean) => set("usePasswordModifyExtendedOp", v)}
                />
                <SettingRow label={t("sxFederationPriority")}>
                    <Input
                        size="md"
                        type="number"
                        className="w-28"
                        value={f.priority}
                        onChange={(e: any) => set("priority", e.target.value)}
                    />
                </SettingRow>
            </SettingsGroup>
            </Section>
            <div className="flex justify-end">
                <Button
                    size="form"
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
                    {saving ? t("sxFederationSaving") : t("sxFederationSave")}
                </Button>
            </div>
        </div>
    );
}

function KerberosTab({ provider, onChanged }: any) {
    const t = useT();
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
        <div className="flex flex-col gap-6">
            <Section label={t("sxFederationKerberos")}>
            <SettingsGroup>
                <ToggleRow
                    label={t("sxFederationEnabled")}
                    checked={f.enabled}
                    onCheckedChange={(v: boolean) => set("enabled", v)}
                />
                <StackField label={t("sxFederationKerberosRealm")}>
                    <Input
                        size="md"
                        value={f.kerberosRealm}
                        onChange={(e: any) => set("kerberosRealm", e.target.value)}
                        placeholder="EXAMPLE.ORG"
                    />
                </StackField>
                <StackField label={t("sxFederationServerPrincipal")}>
                    <Input
                        size="md"
                        value={f.serverPrincipal}
                        onChange={(e: any) => set("serverPrincipal", e.target.value)}
                        placeholder="HTTP/host@EXAMPLE.ORG"
                    />
                </StackField>
                <StackField label={t("sxFederationKeytab")}>
                    <Input
                        size="md"
                        value={f.keyTab}
                        onChange={(e: any) => set("keyTab", e.target.value)}
                        placeholder="/etc/krb5.keytab"
                    />
                </StackField>
                <ToggleRow
                    label={t("sxFederationAllowPasswordAuth")}
                    checked={f.allowPasswordAuthentication}
                    onCheckedChange={(v: boolean) => set("allowPasswordAuthentication", v)}
                />
                <ToggleRow
                    label={t("sxFederationUpdateProfileFirstLogin")}
                    checked={f.updateProfileFirstLogin}
                    onCheckedChange={(v: boolean) => set("updateProfileFirstLogin", v)}
                />
                <ToggleRow
                    label={t("sxFederationDebug")}
                    checked={f.debug}
                    onCheckedChange={(v: boolean) => set("debug", v)}
                />
            </SettingsGroup>
            </Section>
            <div className="flex justify-end">
                <Button
                    size="form"
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
                    {saving ? t("sxFederationSaving") : t("sxFederationSave")}
                </Button>
            </div>
        </div>
    );
}

function MappersTab({ provider, parentId }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const t = useT();
    const [confirm, confirmNode] = useConfirm();
    const [mappers, setMappers] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);
    const [typesStatus, setTypesStatus] = useState<"loading" | "error" | "ready">("loading");
    const [typesAttempt, setTypesAttempt] = useState(0);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setFailed(false);
            try {
                const list = await adminClient.components.find({
                    type: MAPPER_TYPE,
                    parent: provider.id
                });
                if (alive) setMappers(Array.isArray(list) ? list : []);
            } catch (e) {
                console.error("[user-federation] mappers load failed:", e);
                if (alive) setFailed(true);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, provider.id, attempt]);

    useEffect(() => {
        let alive = true;
        (async () => {
            setTypesStatus("loading");
            try {
                const si = await adminClient.serverInfo.find();
                if (!alive) return;
                setTypes(si?.componentTypes?.[MAPPER_TYPE] ?? []);
                setTypesStatus("ready");
            } catch (e) {
                console.error("[user-federation] mapper types load failed:", e);
                if (!alive) return;
                setTypes([]);
                setTypesStatus("error");
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, typesAttempt]);

    const del = (m: any) =>
        confirm({
            title: t("sxFederationDeleteMapperTitle"),
            message: t("sxFederationDeleteMapperMessage", { name: m.name }),
            confirmLabel: t("sxFederationDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.components.del({ id: m.id });
                    addAlert(t("sxFederationMapperDeleted"), AlertVariant.success);
                    setMappers(mappers.filter(x => x.id !== m.id));
                } catch (e) {
                    addError(t("sxFederationDeleteError"), e);
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
                t("sxFederationMapperSyncResult", {
                    added: res?.added ?? 0,
                    updated: res?.updated ?? 0,
                    failed: res?.failed ?? 0
                }),
                res?.failed ? AlertVariant.warning : AlertVariant.success
            );
        } catch (e) {
            addError(t("sxFederationMapperSyncError"), e);
        }
    };

    const syncable = (m: any) =>
        ["group-ldap-mapper", "role-ldap-mapper"].includes(m.providerId);

    const sortedMappers = [...mappers].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
    );

    return (
        <div className="flex flex-col gap-6">
            <Section
                label={
                    loading || failed
                        ? t("sxFederationTabMappers")
                        : t("sxFederationMappersCount", { n: mappers.length })
                }
                action={
                    !loading &&
                    !failed && (
                        <TextAction onClick={() => setEditing({ __new: true })}>
                            {t("sxFederationAddMapper")}
                        </TextAction>
                    )
                }
            >
                {loading ? (
                    <ListSkeleton />
                ) : failed ? (
                    <Notice
                        title={t("sxFederationMappersLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                ) : sortedMappers.length === 0 ? (
                    <Notice
                        title={t("sxFederationMappersEmptyTitle")}
                        description={t("sxFederationMappersEmptyDescription")}
                        action={
                            <Button size="sm" onClick={() => setEditing({ __new: true })}>
                                {t("sxFederationAddMapper")}
                            </Button>
                        }
                    />
                ) : (
                    <SettingsGroup>
                        {sortedMappers.map(m => (
                            <ListRow
                                key={m.id}
                                onOpen={() => setEditing(m)}
                                title={m.name}
                                subtitle={m.providerId}
                                trailing={
                                    <>
                                        {syncable(m) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <TextAction aria-label={t("sxFederationSync")}>
                                                        {t("sxFederationSync")}
                                                    </TextAction>
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
                                        <TextAction tone="danger" onClick={() => del(m)}>
                                            {t("sxFederationDelete")}
                                        </TextAction>
                                    </>
                                }
                            />
                        ))}
                    </SettingsGroup>
                )}
            </Section>

            {editing && (
                <MapperModal
                    provider={provider}
                    types={types}
                    typesStatus={typesStatus}
                    onRetryTypes={() => setTypesAttempt(n => n + 1)}
                    mapper={editing.__new ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        setAttempt(n => n + 1);
                    }}
                />
            )}
            {confirmNode}
        </div>
    );
}

function MapperModal({ provider, types, typesStatus, onRetryTypes, mapper, onClose, onSaved }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const t = useT();
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

    const type = sortedTypes.find(x => x.id === providerId);
    const props = type?.properties ?? [];

    const setCfg = (k: string, v: any) => setConfig(p => ({ ...p, [k]: String(v) }));

    // seed defaults when switching type on a new mapper
    useEffect(() => {
        if (isNew && !providerId && sortedTypes[0]?.id) setProviderId(sortedTypes[0].id);
    }, [isNew, providerId, sortedTypes.length]);

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
            addAlert(t("sxFederationNameRequired"), AlertVariant.warning);
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
                addAlert(t("sxFederationMapperCreated"), AlertVariant.success);
            } else {
                await adminClient.components.update(
                    { id: mapper.id },
                    { ...mapper, name: n, config: { ...(mapper.config ?? {}), ...cfg } }
                );
                addAlert(t("sxFederationMapperUpdated"), AlertVariant.success);
            }
            onSaved();
        } catch (e) {
            addError(t("sxFederationMapperSaveError"), e);
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
                    <ModalTitle>{isNew ? t("sxFederationAddMapper") : t("sxFederationEditMapper")}</ModalTitle>
                </ModalHeader>
                <ModalBody className="flex flex-col gap-4">
                {isNew && typesStatus === "loading" ? (
                    <ListSkeleton rows={2} />
                ) : isNew && typesStatus === "error" ? (
                    <Notice
                        title={t("sxFederationMapperTypesLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={onRetryTypes}
                    />
                ) : isNew && sortedTypes.length === 0 ? (
                    <Notice
                        title={t("sxFederationMapperTypesEmptyTitle")}
                        description={t("sxFederationMapperTypesEmptyDescription")}
                    />
                ) : (
                <>
                <SettingsGroup>
                    <SettingRow label={t("sxFederationMapperType")}>
                        {isNew ? (
                            <Select value={providerId} onValueChange={setProviderId}>
                                <SelectTrigger size="sm" className="w-56">
                                    <SelectValue placeholder={t("sxFederationSelectType")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedTypes.map(x => (
                                        <SelectItem key={x.id} value={x.id}>
                                            {x.id}
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
                    <StackField label={t("sxFederationName")}>
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
                        <NoteRow>{t("sxFederationMapperNoConfig")}</NoteRow>
                    </SettingsGroup>
                )}

                {!isNew && (
                    <Footnote>
                        {t("sxFederationMapperMeta", {
                            id: mapper.id,
                            date: fmtDate(provider.createdTimestamp)
                        })}
                    </Footnote>
                )}
                </>
                )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={saving || !name.trim() || (isNew && !type)}
                        onClick={save}
                    >
                        {saving
                            ? t("sxFederationSaving")
                            : isNew
                              ? t("sxFederationCreate")
                              : t("sxFederationSave")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

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

const ROW = "flex min-h-13 items-center justify-between gap-3 px-4 py-3";

function SettingsGroup({ children }: { children?: ReactNode }) {
    const items = flatChildren(children);
    return (
        <ul className={GROUP}>
            {items.map((c: any, i) => (
                <Fragment key={c?.key ?? i}>
                    {i > 0 && <li aria-hidden className={SEPARATOR} />}
                    {c}
                </Fragment>
            ))}
        </ul>
    );
}

function Footnote({ children }: { children?: ReactNode }) {
    return <p className="mt-2 px-0.5 text-[13px] text-muted-foreground">{children}</p>;
}

function RowLabel({ label, hint }: any) {
    return (
        <div className="min-w-0">
            <div className="text-[15px] [overflow-wrap:anywhere]">{label}</div>
            {hint && (
                <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                    {hint}
                </div>
            )}
        </div>
    );
}

function SettingRow({ label, hint, children }: any) {
    return (
        <li className={ROW}>
            <RowLabel label={label} hint={hint} />
            <div className="flex shrink-0 items-center">{children}</div>
        </li>
    );
}

function StackField({ label, hint, children }: any) {
    return (
        <li className="px-4 py-3">
            {(label || hint) && <RowLabel label={label} hint={hint} />}
            <div className="mt-2">{children}</div>
        </li>
    );
}

function ToggleRow({ label, hint, checked, onCheckedChange, disabled }: any) {
    return (
        <SettingRow label={label} hint={hint}>
            <Switch
                checked={!!checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
                aria-label={typeof label === "string" ? label : undefined}
            />
        </SettingRow>
    );
}

function ActionItem({ onClick, disabled, children }: any) {
    return (
        <li>
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className="flex min-h-13 w-full items-center gap-2 px-4 py-3 text-left text-[15px] font-medium text-primary outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/4 dark:focus-visible:bg-white/6 [&_svg]:size-4.5 [&_svg]:shrink-0"
            >
                {children}
            </button>
        </li>
    );
}

function NoteRow({ children }: { children?: ReactNode }) {
    return <li className="px-4 py-4 text-center text-sm text-muted-foreground">{children}</li>;
}

function ListRow({ title, subtitle, leading, trailing, onOpen }: any) {
    return (
        <li className="flex min-h-16 items-stretch">
            <button
                type="button"
                onClick={onOpen}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-3 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
            >
                {leading && <span className="grid size-10 shrink-0 place-items-center">{leading}</span>}
                <div className="min-w-0">
                    <div className="truncate text-base font-medium">{title}</div>
                    {subtitle && (
                        <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
                            {subtitle}
                        </div>
                    )}
                </div>
            </button>
            {trailing && <div className="flex shrink-0 items-center gap-3 pe-4">{trailing}</div>}
        </li>
    );
}

function useConfirm() {
    const t = useT();
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
                    <ConfirmCancel>{t("sxFederationCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => opts?.onConfirm?.()}
                    >
                        {opts?.confirmLabel ?? t("sxFederationConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}
