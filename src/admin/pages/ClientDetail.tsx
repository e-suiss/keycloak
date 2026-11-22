// @ts-nocheck

import {
    CaretLeftIcon,
    CaretRightIcon,
    CheckIcon,
    ClockCounterClockwiseIcon,
    CopyIcon,
    DotsThreeIcon,
    DownloadSimpleIcon,
    ExportIcon,
    MagnifyingGlassIcon,
    PowerIcon,
    ProhibitIcon,
    ShieldCheckIcon,
    StackIcon,
    TrashIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@ui/components/card";
import { CodeBlock, CodeBlockContent } from "@ui/components/code-block";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
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
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Separator } from "@ui/components/separator";
import { Spinner } from "@ui/components/spinner";
import { Switch } from "@ui/components/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs";
import { Textarea } from "@ui/components/textarea";
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
    useMemo,
    useRef,
    useState
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { ConfigForm } from "../components/ConfigForm";
import { MultiLineInput } from "../components/MultiLineInput";
import { useRealm } from "../ui/realm";
import ClientAuthorization from "./ClientAuthorization";

const lines = (s: string) =>
    (s || "")
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);
const _arr = (v: any) => (Array.isArray(v) ? v.join("\n") : "");
const fmtDate = (v: any) =>
    v
        ? new Date(typeof v === "number" ? v : Number(v) || v).toLocaleString("tr-TR")
        : "—";

export default function ClientDetail() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { id, tab: tabParam } = useParams();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const [loading, setLoading] = useState(true);
    // The active tab is a real route — each is its own page (deep-linkable).
    const tab = tabParam || "settings";
    const setTab = (key: string) => navigate(`/${realm}/clients/${id}/${key}`);

    const [client, setClient] = useState<any>(null);
    const [edited, setEdited] = useState<any>(null);

    const loadClient = useCallback(async () => {
        try {
            const found = await adminClient.clients.findOne({ id });
            setClient(found ?? null);
            setEdited(found ? JSON.parse(JSON.stringify(found)) : null);
            return found;
        } catch (err) {
            addError("İstemci yüklenemedi.", err);
            return null;
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            await loadClient();
            if (alive) setLoading(false);
        })();
        return () => {
            alive = false;
        };
    }, [loadClient]);

    const handleDelete = () =>
        confirm({
            title: "İstemciyi sil",
            message: `“${client?.clientId ?? id}” kalıcı olarak silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.del({ id });
                    addAlert("İstemci silindi.", AlertVariant.success);
                    navigate(`/${realm}/clients`);
                } catch (err) {
                    addError("İstemci silinemedi.", err);
                }
            }
        });

    const toggleEnabled = async () => {
        if (!client) return;
        try {
            await adminClient.clients.update(
                { id },
                { ...client, enabled: !client.enabled }
            );
            addAlert(
                client.enabled
                    ? "İstemci devre dışı bırakıldı."
                    : "İstemci etkinleştirildi.",
                AlertVariant.success
            );
            await loadClient();
        } catch (err) {
            addError("İstemci durumu güncellenemedi.", err);
        }
    };

    const downloadBlob = (data: string, filename: string) => {
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const exportClient = async () => {
        try {
            const rep = await adminClient.clients.findOne({ id });
            downloadBlob(JSON.stringify(rep, null, 2), `${client?.clientId ?? id}.json`);
            addAlert("İstemci dışa aktarıldı.", AlertVariant.success);
        } catch (err) {
            addError("İstemci dışa aktarılamadı.", err);
        }
    };

    const downloadAdapterConfig = async () => {
        try {
            const cfg = await adminClient.clients.getInstallationProviders({
                id,
                providerId: "keycloak-oidc-keycloak-json"
            });
            const data = typeof cfg === "string" ? cfg : JSON.stringify(cfg, null, 2);
            downloadBlob(data, "keycloak.json");
            addAlert("Adapter yapılandırması indirildi.", AlertVariant.success);
        } catch (err) {
            addError("Adapter yapılandırması indirilemedi.", err);
        }
    };

    const backBtn = (
        <Button variant="secondary" size="icon" asChild>
            <Link to={`/${realm}/clients`} aria-label="İstemcilere dön">
                <CaretLeftIcon weight="bold" />
            </Link>
        </Button>
    );

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <div className="mb-5">{backBtn}</div>
                <div className="flex justify-center py-16">
                    <Spinner className="size-6" />
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <div className="mb-5">{backBtn}</div>
                <Card>
                    <CardHeader>
                        <CardTitle>İstemci bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            İstemci bulunamadı.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const protocol = client.protocol || "openid-connect";
    const oidc = protocol === "openid-connect";
    const _confidential = !client.publicClient && !client.bearerOnly;

    const tabs = [
        { key: "settings", label: "Ayarlar" },
        ...(!client.publicClient
            ? [{ key: "credentials", label: "Kimlik Bilgileri" }]
            : []),
        { key: "roles", label: "Roller" },
        { key: "scopes", label: "İstemci Kapsamları" },
        ...(client.authorizationServicesEnabled
            ? [{ key: "authz", label: "Yetkilendirme" }]
            : []),
        ...(client.serviceAccountsEnabled
            ? [{ key: "service", label: "Servis Hesabı Rolleri" }]
            : []),
        { key: "sessions", label: "Oturumlar" },
        ...(oidc ? [{ key: "keys", label: "Keys" }] : []),
        { key: "advanced", label: "Gelişmiş" },
        { key: "events", label: "Olaylar" },
        { key: "adminperm", label: "Yönetici İzinleri" }
    ];

    const isSaml = client.protocol === "saml";
    const _protocolName = isSaml ? "SAML" : "OpenID Connect";
    const _monogram =
        (client.clientId ?? id ?? "?").trim().charAt(0).toUpperCase() || "?";

    return (
        <>
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                {/* Nav bar — back (left) · clientId (absolutely centered) · actions (right) */}
                <div className="relative mb-8 flex items-center">
                    {backBtn}
                    <h1 className="pointer-events-none absolute left-1/2 max-w-[55%] -translate-x-1/2 truncate text-center font-mono text-base font-semibold tracking-tight">
                        {client.clientId || id}
                    </h1>
                    <div className="ms-auto">
                        <ActionsMenu
                            enabled={!!client.enabled}
                            onToggleEnabled={toggleEnabled}
                            onExport={exportClient}
                            onAdapterConfig={downloadAdapterConfig}
                            onDelete={handleDelete}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                    {/* Section navigation — quiet sidebar list on desktop, dropdown on mobile (macOS System Settings) */}
                    <div className="lg:w-56 lg:shrink-0">
                        <div className="lg:hidden">
                            <Select value={tab} onValueChange={setTab}>
                                <SelectTrigger className="w-full" aria-label="Bölüm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {tabs.map(t => (
                                        <SelectItem key={t.key} value={t.key}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Tabs
                            value={tab}
                            onValueChange={setTab}
                            orientation="vertical"
                            className="sticky top-20 hidden lg:flex"
                        >
                            <TabsList className="w-full">
                                {tabs.map(t => (
                                    <TabsTrigger key={t.key} value={t.key}>
                                        {t.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="min-w-0 flex-1 space-y-6">
                        {tab === "settings" && (
                            <SettingsTab
                                id={id}
                                client={client}
                                edited={edited}
                                setEdited={setEdited}
                                oidc={oidc}
                                protocol={protocol}
                                adminClient={adminClient}
                                addAlert={addAlert}
                                addError={addError}
                                reload={loadClient}
                            />
                        )}
                        {tab === "credentials" && !client.publicClient && (
                            <CredentialsTab
                                id={id}
                                client={client}
                                adminClient={adminClient}
                                addAlert={addAlert}
                                addError={addError}
                                reload={loadClient}
                            />
                        )}
                        {tab === "roles" && (
                            <RolesTab
                                id={id}
                                adminClient={adminClient}
                                addAlert={addAlert}
                                addError={addError}
                                confirm={confirm}
                            />
                        )}
                        {tab === "scopes" && (
                            <ScopesTab
                                id={id}
                                clientId={client.clientId}
                                adminClient={adminClient}
                                addAlert={addAlert}
                                addError={addError}
                                reload={loadClient}
                            />
                        )}
                        {tab === "authz" && client.authorizationServicesEnabled && (
                            <ClientAuthorization id={id} />
                        )}
                        {tab === "service" && client.serviceAccountsEnabled && (
                            <ServiceAccountTab
                                id={id}
                                adminClient={adminClient}
                                addAlert={addAlert}
                                addError={addError}
                            />
                        )}
                        {tab === "sessions" && (
                            <SessionsTab
                                id={id}
                                adminClient={adminClient}
                                addError={addError}
                            />
                        )}
                        {tab === "keys" && oidc && (
                            <KeysTab
                                id={id}
                                edited={edited}
                                setEdited={setEdited}
                                adminClient={adminClient}
                                addAlert={addAlert}
                                addError={addError}
                                reload={loadClient}
                                confirm={confirm}
                            />
                        )}
                        {tab === "advanced" && (
                            <AdvancedTab
                                id={id}
                                edited={edited}
                                setEdited={setEdited}
                                adminClient={adminClient}
                                addAlert={addAlert}
                                addError={addError}
                                reload={loadClient}
                            />
                        )}
                        {tab === "events" && (
                            <ClientEventsTab
                                id={id}
                                clientId={client.clientId}
                                adminClient={adminClient}
                                realm={realm}
                                addError={addError}
                            />
                        )}
                        {tab === "adminperm" && (
                            <AdminPermissionsTab
                                id={id}
                                adminClient={adminClient}
                                addAlert={addAlert}
                                addError={addError}
                            />
                        )}
                    </div>
                </div>
            </div>
            {confirmNode}
        </>
    );
}

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

/** "No items" placeholder row inside a group. */
function EmptyRow({ children }: any) {
    return (
        <Item size="sm">
            <ItemContent className="items-center">
                <ItemDescription>{children}</ItemDescription>
            </ItemContent>
        </Item>
    );
}

/** Read-only value with a copy affordance. */
function CopyRow({ value, label, onCopy }: any) {
    return (
        <Item size="sm">
            <ItemContent className="min-w-0">
                {label && <ItemDescription>{label}</ItemDescription>}
                <code className="block min-w-0 truncate font-mono text-sm">{value}</code>
            </ItemContent>
            <ItemActions>
                <Button variant="ghost" size="icon-sm" onClick={onCopy} aria-label="Kopyala">
                    <CopyIcon />
                </Button>
            </ItemActions>
        </Item>
    );
}

function ActionsMenu({
    enabled,
    onToggleEnabled,
    onExport,
    onAdapterConfig,
    onDelete
}: any) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" aria-label="Eylemler" title="Eylemler">
                    <DotsThreeIcon weight="bold" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={onToggleEnabled}>
                    {enabled ? <ProhibitIcon /> : <PowerIcon />}
                    {enabled ? "Devre dışı bırak" : "Etkinleştir"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport}>
                    <ExportIcon />
                    Dışa aktar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAdapterConfig}>
                    <DownloadSimpleIcon />
                    Adapter config indir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                    <TrashIcon />
                    Sil
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/* ── 1. Ayarlar ─────────────────────────────────────────────────────────── */
function SettingsTab({
    id,
    client,
    edited,
    setEdited,
    oidc,
    protocol,
    adminClient,
    addAlert,
    addError,
    reload
}: any) {
    const [saving, setSaving] = useState(false);
    const [loginThemes, setLoginThemes] = useState<string[]>([]);
    useEffect(() => {
        adminClient.serverInfo
            .find()
            .then((si: any) =>
                setLoginThemes(
                    (si?.themes?.login || []).map((x: any) => x.name).filter(Boolean)
                )
            )
            .catch(() => {});
    }, [adminClient]);
    if (!edited) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    const set = (key: string, value: any) =>
        setEdited((e: any) => ({ ...e, [key]: value }));
    const setAttr = (key: string, value: any) =>
        setEdited((e: any) => ({
            ...e,
            attributes: { ...(e.attributes || {}), [key]: value }
        }));

    const save = async () => {
        setSaving(true);
        try {
            const rep = {
                ...edited,
                name: edited.name?.trim() || undefined,
                description: edited.description?.trim() || undefined,
                rootUrl: edited.rootUrl?.trim() || undefined,
                baseUrl: edited.baseUrl?.trim() || undefined,
                adminUrl: edited.adminUrl?.trim() || undefined,
                loginTheme: edited.loginTheme?.trim() || undefined,
                redirectUris: Array.isArray(edited.redirectUris)
                    ? edited.redirectUris
                    : [],
                webOrigins: Array.isArray(edited.webOrigins) ? edited.webOrigins : []
            };
            await adminClient.clients.update({ id }, rep);
            addAlert("İstemci kaydedildi.", AlertVariant.success);
            await reload();
        } catch (err) {
            addError("İstemci kaydedilemedi.", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <GroupLabel>Genel</GroupLabel>
                <Group>
                    <Row label="Client ID">
                        <span className="truncate text-sm text-muted-foreground">
                            {client.clientId ?? ""}
                        </span>
                    </Row>
                    <Row label="Protokol">
                        <span className="text-sm text-muted-foreground">
                            {protocol === "saml" ? "SAML" : "OpenID Connect"}
                        </span>
                    </Row>
                    <Row label="Ad">
                        <Input
                            size="sm"
                            value={edited.name ?? ""}
                            onChange={(e: any) => set("name", e.target.value)}
                            placeholder="—"
                        />
                    </Row>
                    <StackRow label="Açıklama">
                        <Textarea
                            value={edited.description ?? ""}
                            onChange={(e: any) => set("description", e.target.value)}
                            placeholder="—"
                        />
                    </StackRow>
                    <Row label="Konsolda her zaman göster">
                        <Switch
                            checked={!!edited.alwaysDisplayInConsole}
                            onCheckedChange={(v: boolean) => set("alwaysDisplayInConsole", v)}
                        />
                    </Row>
                </Group>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Erişim ayarları</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex max-w-2xl flex-col gap-4">
                        <Field>
                            <FieldLabel>Kök URL</FieldLabel>
                            <Input
                                value={edited.rootUrl ?? ""}
                                onChange={e => set("rootUrl", e.target.value)}
                                placeholder="https://app.example.com"
                            />
                            <FieldDescription>İstemcinin kök URL'i; göreli URI'lere önek olarak eklenir.</FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel>Ana URL</FieldLabel>
                            <Input
                                value={edited.baseUrl ?? ""}
                                onChange={e => set("baseUrl", e.target.value)}
                                placeholder="/"
                            />
                            <FieldDescription>Kullanıcı bu istemciye yönlendirildiğinde açılacak varsayılan URL.</FieldDescription>
                        </Field>
                        {(edited.standardFlowEnabled || edited.implicitFlowEnabled) && (
                            <>
                                <Field>
                                    <FieldLabel>Geçerli yönlendirme URI'leri</FieldLabel>
                                    <MultiLineInput
                                        value={edited.redirectUris || []}
                                        onChange={(v: string[]) => set("redirectUris", v)}
                                        addLabel="Yönlendirme URI ekle"
                                        placeholder="https://app.example.com/*"
                                    />
                                    <FieldDescription>Başarılı giriş sonrası izin verilen yönlendirme desenleri.</FieldDescription>
                                </Field>
                                <Field>
                                    <FieldLabel>Geçerli post-logout yönlendirme URI'leri</FieldLabel>
                                    <MultiLineInput
                                        value={(
                                            edited.attributes?.[
                                                "post.logout.redirect.uris"
                                            ] || ""
                                        )
                                            .split("##")
                                            .filter(Boolean)}
                                        onChange={(v: string[]) =>
                                            setAttr("post.logout.redirect.uris", v.join("##"))
                                        }
                                        addLabel="Post-logout URI ekle"
                                        placeholder="+"
                                    />
                                    <FieldDescription>Çıkış sonrası izin verilen yönlendirme desenleri. '+' yalnız başına redirect URI'leriyle aynı anlamına gelir.</FieldDescription>
                                </Field>
                            </>
                        )}
                        <Field>
                            <FieldLabel>Yönetim URL</FieldLabel>
                            <Input
                                value={edited.adminUrl ?? ""}
                                onChange={e => set("adminUrl", e.target.value)}
                            />
                        </Field>
                        {protocol !== "saml" && edited.standardFlowEnabled && (
                            <Field>
                                <FieldLabel>Web origins</FieldLabel>
                                <MultiLineInput
                                    value={edited.webOrigins || []}
                                    onChange={(v: string[]) => set("webOrigins", v)}
                                    addLabel="Web origin ekle"
                                    placeholder="+"
                                />
                                <FieldDescription>CORS için izin verilen origin'ler. '+' tüm geçerli redirect URI origin'lerini ekler, '*' hepsine izin verir.</FieldDescription>
                            </Field>
                        )}
                    </div>
                </CardContent>
            </Card>

            {oidc && (
                <Card>
                    <CardHeader>
                        <CardTitle>Yetenek yapılandırması</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Group className="max-w-2xl">
                            <SwitchRow
                                label="İstemci kimlik doğrulama"
                                hint="Kapalı = public, açık = confidential"
                                checked={!edited.publicClient}
                                onChange={(v: boolean) =>
                                    setEdited((e: any) => ({
                                        ...e,
                                        publicClient: !v,
                                        // Public istemciler yetkilendirme/servis hesabı kullanamaz.
                                        ...(v
                                            ? {}
                                            : {
                                                  authorizationServicesEnabled: false,
                                                  serviceAccountsEnabled: false
                                              })
                                    }))
                                }
                            />
                            <SwitchRow
                                label="Standart akış"
                                checked={edited.standardFlowEnabled}
                                onChange={(v: boolean) => set("standardFlowEnabled", v)}
                            />
                            <SwitchRow
                                label="Doğrudan erişim izinleri"
                                checked={edited.directAccessGrantsEnabled}
                                onChange={(v: boolean) => set("directAccessGrantsEnabled", v)}
                            />
                            <SwitchRow
                                label="Implicit akış"
                                checked={edited.implicitFlowEnabled}
                                onChange={(v: boolean) => set("implicitFlowEnabled", v)}
                            />
                            {/* Yetkilendirme ve servis hesapları yalnızca confidential istemcilerde. */}
                            {!edited.publicClient && (
                                <SwitchRow
                                    label="Servis hesapları rolleri"
                                    checked={edited.serviceAccountsEnabled}
                                    onChange={(v: boolean) =>
                                        set("serviceAccountsEnabled", v)
                                    }
                                />
                            )}
                            {!edited.publicClient && (
                                <SwitchRow
                                    label="Yetkilendirme"
                                    hint="Fine-grained authorization services. Servis hesabını otomatik açar."
                                    checked={edited.authorizationServicesEnabled}
                                    onChange={(v: boolean) =>
                                        setEdited((e: any) => ({
                                            ...e,
                                            authorizationServicesEnabled: v,
                                            ...(v ? { serviceAccountsEnabled: true } : {})
                                        }))
                                    }
                                />
                            )}
                        </Group>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Giriş ayarları</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex max-w-2xl flex-col gap-4">
                        <Group>
                            <SwitchRow
                                label="Onay gerekli"
                                checked={edited.consentRequired}
                                onChange={(v: boolean) => set("consentRequired", v)}
                            />
                            {edited.consentRequired && (
                                <SwitchRow
                                    label="İstemciyi onay ekranında göster"
                                    checked={
                                        (edited.attributes?.["display.on.consent.screen"] ??
                                            "") === "true"
                                    }
                                    onChange={(v: boolean) =>
                                        setAttr(
                                            "display.on.consent.screen",
                                            v ? "true" : "false"
                                        )
                                    }
                                />
                            )}
                        </Group>
                        {edited.consentRequired && (
                            <Field>
                                <FieldLabel>Onay ekranı metni</FieldLabel>
                                <Textarea
                                    value={edited.attributes?.["consent.screen.text"] ?? ""}
                                    onChange={e =>
                                        setAttr("consent.screen.text", e.target.value)
                                    }
                                />
                            </Field>
                        )}
                        <Field>
                            <FieldLabel>Login theme</FieldLabel>
                            <Select
                                value={edited.loginTheme || "__default__"}
                                onValueChange={(v: string) =>
                                    set("loginTheme", v === "__default__" ? "" : v)
                                }
                            >
                                <SelectTrigger className="w-full" aria-label="Login theme">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    <SelectItem value="__default__">Varsayılan</SelectItem>
                                    {loginThemes.map(theme => (
                                        <SelectItem key={theme} value={theme}>
                                            {theme}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Çıkış (Logout) ayarları</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex max-w-2xl flex-col gap-4">
                        <Group>
                            <SwitchRow
                                label="Front-channel logout"
                                hint="Açıkken çıkış, kullanıcının tarayıcısı üzerinden istemciye iletilir."
                                checked={!!edited.frontchannelLogout}
                                onChange={(v: boolean) => set("frontchannelLogout", v)}
                            />
                        </Group>
                        {edited.frontchannelLogout ? (
                            <>
                                <Field>
                                    <FieldLabel>Front-channel logout URL</FieldLabel>
                                    <Input
                                        value={
                                            edited.attributes?.["frontchannel.logout.url"] ??
                                            ""
                                        }
                                        onChange={e =>
                                            setAttr("frontchannel.logout.url", e.target.value)
                                        }
                                        placeholder="https://app.example.com/logout"
                                    />
                                    <FieldDescription>Front-channel çıkış isteklerinin gönderileceği URL.</FieldDescription>
                                </Field>
                                <Group>
                                    <SwitchRow
                                        label="Front-channel logout oturum gerekli"
                                        hint="Çıkış isteğinde oturum kimliği (sid) gönderilsin."
                                        checked={
                                            (edited.attributes?.[
                                                "frontchannel.logout.session.required"
                                            ] ?? "") !== "false"
                                        }
                                        onChange={(v: boolean) =>
                                            setAttr(
                                                "frontchannel.logout.session.required",
                                                v ? "true" : "false"
                                            )
                                        }
                                    />
                                </Group>
                            </>
                        ) : (
                            <>
                                <Field>
                                    <FieldLabel>Back-channel logout URL</FieldLabel>
                                    <Input
                                        value={
                                            edited.attributes?.["backchannel.logout.url"] ??
                                            ""
                                        }
                                        onChange={e =>
                                            setAttr("backchannel.logout.url", e.target.value)
                                        }
                                        placeholder="https://app.example.com/backchannel-logout"
                                    />
                                    <FieldDescription>Back-channel çıkış isteklerinin gönderileceği URL.</FieldDescription>
                                </Field>
                                <Group>
                                    <SwitchRow
                                        label="Back-channel logout oturum gerekli"
                                        hint="Çıkış token'ında oturum kimliği (sid) gönderilsin."
                                        checked={
                                            (edited.attributes?.[
                                                "backchannel.logout.session.required"
                                            ] ?? "") === "true"
                                        }
                                        onChange={(v: boolean) =>
                                            setAttr(
                                                "backchannel.logout.session.required",
                                                v ? "true" : "false"
                                            )
                                        }
                                    />
                                    <SwitchRow
                                        label="Back-channel logout çevrimdışı oturumları iptal et"
                                        hint="Çıkışta bu istemcinin çevrimdışı oturumları da iptal edilsin."
                                        checked={
                                            (edited.attributes?.[
                                                "backchannel.logout.revoke.offline.tokens"
                                            ] ?? "") === "true"
                                        }
                                        onChange={(v: boolean) =>
                                            setAttr(
                                                "backchannel.logout.revoke.offline.tokens",
                                                v ? "true" : "false"
                                            )
                                        }
                                    />
                                </Group>
                            </>
                        )}
                        <Group>
                            <SwitchRow
                                label="Çıkış onayı"
                                hint="Çıkış sırasında kullanıcıdan onay istensin."
                                checked={
                                    (edited.attributes?.["logout.confirmation.enabled"] ??
                                        "") === "true"
                                }
                                onChange={(v: boolean) =>
                                    setAttr(
                                        "logout.confirmation.enabled",
                                        v ? "true" : "false"
                                    )
                                }
                            />
                        </Group>
                    </div>
                </CardContent>
            </Card>

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

const AUTHENTICATOR_OPTIONS = [
    { value: "client-secret", label: "İstemci ID ve Sırrı" },
    { value: "client-jwt", label: "Signed Jwt" },
    { value: "client-secret-jwt", label: "Signed Jwt with Client Secret" },
    { value: "client-x509", label: "X509 Certificate" }
];

/* ── 2. Kimlik Bilgileri ────────────────────────────────────────────────── */
const SIGNING_ALG_OPTIONS = [
    "",
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "PS256",
    "PS384",
    "PS512"
];

function CredentialsTab({ id, client, adminClient, addAlert, addError, reload }: any) {
    const [loading, setLoading] = useState(true);
    const [secret, setSecret] = useState("");
    const [savingAuth, setSavingAuth] = useState(false);
    const [savingCfg, setSavingCfg] = useState(false);
    const [regToken, setRegToken] = useState("");
    const [genningToken, setGenningToken] = useState(false);

    const authenticatorType = client?.clientAuthenticatorType || "client-secret";

    // Local draft of attributes for type-specific signing / X509 config.
    const [attrs, setAttrs] = useState<Record<string, any>>(client?.attributes || {});
    useEffect(() => {
        setAttrs(client?.attributes || {});
    }, [client]);
    const setAttr = (key: string, value: any) => setAttrs(a => ({ ...a, [key]: value }));

    const saveAttrs = async () => {
        setSavingCfg(true);
        try {
            await adminClient.clients.update(
                { id },
                { ...client, attributes: { ...(client.attributes || {}), ...attrs } }
            );
            addAlert("Yapılandırma kaydedildi.", AlertVariant.success);
            await reload();
        } catch (err) {
            addError("Yapılandırma kaydedilemedi.", err);
        } finally {
            setSavingCfg(false);
        }
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminClient.clients.getClientSecret({ id });
            setSecret(res?.value ?? "");
        } catch {
            // JWT / X509 istemcilerinde sır bulunmayabilir; sessizce geç.
            setSecret("");
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

    useEffect(() => {
        load();
    }, [load]);

    const regenerate = async () => {
        try {
            const res = await adminClient.clients.generateNewClientSecret({ id });
            setSecret(res?.value ?? "");
            addAlert("Yeni istemci sırrı oluşturuldu.", AlertVariant.success);
        } catch (err) {
            addError("İstemci sırrı oluşturulamadı.", err);
        }
    };

    const copy = () => {
        navigator.clipboard?.writeText(secret);
        addAlert("İstemci sırrı kopyalandı.", AlertVariant.success);
    };

    const changeAuthenticator = async (value: string) => {
        setSavingAuth(true);
        try {
            await adminClient.clients.update(
                { id },
                { ...client, clientAuthenticatorType: value }
            );
            addAlert("İstemci doğrulayıcı güncellendi.", AlertVariant.success);
            await reload();
        } catch (err) {
            addError("İstemci doğrulayıcı güncellenemedi.", err);
        } finally {
            setSavingAuth(false);
        }
    };

    const generateRegToken = async () => {
        setGenningToken(true);
        try {
            const res = await adminClient.clients.generateRegistrationAccessToken({ id });
            setRegToken(res?.registrationAccessToken ?? "");
            addAlert("Kayıt erişim token'ı oluşturuldu.", AlertVariant.success);
        } catch (err) {
            addError("Kayıt erişim token'ı oluşturulamadı.", err);
        } finally {
            setGenningToken(false);
        }
    };

    const copyRegToken = () => {
        navigator.clipboard?.writeText(regToken);
        addAlert("Token kopyalandı.", AlertVariant.success);
    };

    if (loading) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    return (
        <div className="space-y-7">
            <div>
                <GroupLabel>İstemci Doğrulayıcı</GroupLabel>
                <Group>
                    <Row label="Yöntem">
                        <Select
                            value={authenticatorType}
                            disabled={savingAuth}
                            onValueChange={changeAuthenticator}
                        >
                            <SelectTrigger aria-label="İstemci doğrulayıcı">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {AUTHENTICATOR_OPTIONS.map(o => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Row>
                </Group>
                <GroupFooter>İstemcinin kimliğini nasıl doğrulayacağı.</GroupFooter>
            </div>

            {authenticatorType === "client-secret" && (
                <div>
                    <GroupLabel>İstemci Sırrı</GroupLabel>
                    <Group>
                        <CopyRow value={secret} onCopy={copy} />
                        <ActionRow onClick={regenerate}>Yeniden oluştur</ActionRow>
                    </Group>
                    <GroupFooter>Confidential istemciler için gizli anahtar.</GroupFooter>
                </div>
            )}

            {authenticatorType === "client-jwt" && (
                <div>
                    <GroupLabel>Signed JWT</GroupLabel>
                    <Group>
                        <Row
                            label="İmza algoritması"
                            hint="Boş bırakılırsa herhangi bir algoritma kabul edilir."
                        >
                            <Select
                                value={attrs["token.endpoint.auth.signing.alg"] ?? ""}
                                onValueChange={(v: string) =>
                                    setAttr("token.endpoint.auth.signing.alg", v)
                                }
                            >
                                <SelectTrigger size="sm" aria-label="İmza algoritması">
                                    <SelectValue placeholder="Herhangi" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    {SIGNING_ALG_OPTIONS.map(a => (
                                        <SelectItem key={a || "any"} value={a}>
                                            {a || "Herhangi"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Row>
                        <Row
                            label="Maks. token geçerlilik (sn)"
                            hint="JWT'nin geçerli sayılacağı en uzun süre. Boş = sınırsız."
                        >
                            <Input
                                size="sm"
                                type="number"
                                min={1}
                                value={attrs["token.endpoint.auth.signing.max.exp"] ?? ""}
                                onChange={(e: any) =>
                                    setAttr(
                                        "token.endpoint.auth.signing.max.exp",
                                        e.target.value
                                    )
                                }
                                placeholder="—"
                            />
                        </Row>
                        <ActionRow onClick={saveAttrs} disabled={savingCfg}>
                            {savingCfg ? "Kaydediliyor…" : "Kaydet"}
                        </ActionRow>
                    </Group>
                    <GroupFooter>
                        İmza anahtarı ve sertifika, "Keys" sekmesinden yönetilir.
                    </GroupFooter>
                </div>
            )}

            {authenticatorType === "client-x509" && (
                <div>
                    <GroupLabel>X509 Sertifikası</GroupLabel>
                    <Group>
                        <Row
                            label="Regex karşılaştırmaya izin ver"
                            hint="Subject DN bir regex deseni olarak değerlendirilir."
                        >
                            <Switch
                                checked={
                                    (attrs["x509.allow.regex.pattern.comparison"] ??
                                        "") === "true"
                                }
                                onCheckedChange={(v: boolean) =>
                                    setAttr(
                                        "x509.allow.regex.pattern.comparison",
                                        v ? "true" : "false"
                                    )
                                }
                            />
                        </Row>
                        <StackRow
                            label="Subject DN"
                            hint="İstemci sertifikasının beklenen subject DN değeri."
                        >
                            <Input
                                size="sm"
                                value={attrs["x509.subjectdn"] ?? ""}
                                onChange={(e: any) =>
                                    setAttr("x509.subjectdn", e.target.value)
                                }
                                placeholder="CN=istemci, O=org"
                            />
                        </StackRow>
                        <ActionRow onClick={saveAttrs} disabled={savingCfg}>
                            {savingCfg ? "Kaydediliyor…" : "Kaydet"}
                        </ActionRow>
                    </Group>
                    <GroupFooter>
                        İstemci, X509 sertifikası ile kimliğini doğrular.
                    </GroupFooter>
                </div>
            )}

            <div>
                <GroupLabel>Registration Access Token</GroupLabel>
                <Group>
                    {regToken && <CopyRow value={regToken} onCopy={copyRegToken} />}
                    <ActionRow onClick={generateRegToken} disabled={genningToken}>
                        {genningToken ? "Oluşturuluyor…" : "Yeni oluştur"}
                    </ActionRow>
                </Group>
                <GroupFooter>
                    İstemciyi dinamik olarak yönetmek için kullanılır. Token yalnızca bir
                    kez gösterilir.
                </GroupFooter>
            </div>
        </div>
    );
}

/* ── 3. Roller ──────────────────────────────────────────────────────────── */
function RolesTab({ id, adminClient, addAlert, addError, confirm }: any) {
    const [loading, setLoading] = useState(true);
    const [roles, setRoles] = useState<any[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [detailRole, setDetailRole] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await adminClient.clients.listRoles({ id });
            setRoles(list ?? []);
        } catch (err) {
            addError("Roller yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (role: any) =>
        confirm({
            title: "Rolü sil",
            message: `“${role.name}” rolü silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.roles.delById({ id: role.id });
                    addAlert("Rol silindi.", AlertVariant.success);
                    await load();
                } catch (err) {
                    addError("Rol silinemedi.", err);
                }
            }
        });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-base font-semibold tracking-tight">Roller</p>
                    <p className="text-sm text-muted-foreground">
                        İstemciye özel roller.
                    </p>
                </div>
                <Button
                    variant="secondary"
                    onClick={() => setCreateOpen(true)}
                >
                    Rol oluştur
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Spinner className="size-6" />
                </div>
            ) : roles.length === 0 ? (
                <EmptyCard
                    icon={<ShieldCheckIcon />}
                    title="Rol yok"
                    desc="Bu istemciye özel henüz bir rol yok."
                    action={
                        <Button
                            variant="secondary"
                            onClick={() => setCreateOpen(true)}
                        >
                            Rol oluştur
                        </Button>
                    }
                />
            ) : (
                <Group>
                    {roles.map(r => (
                        <Item key={r.id} size="sm">
                            <ItemContent
                                className="min-w-0 cursor-pointer"
                                onClick={() => setDetailRole(r)}
                            >
                                <ItemTitle>{r.name}</ItemTitle>
                                {r.description && (
                                    <ItemDescription className="truncate">
                                        {r.description}
                                    </ItemDescription>
                                )}
                            </ItemContent>
                            <ItemActions>
                                <RowDelete onClick={() => remove(r)} />
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Ayrıntılar"
                                    onClick={() => setDetailRole(r)}
                                >
                                    <CaretRightIcon weight="bold" className="rtl:rotate-180" />
                                </Button>
                            </ItemActions>
                        </Item>
                    ))}
                </Group>
            )}

            {createOpen && (
                <CreateRole
                    id={id}
                    adminClient={adminClient}
                    addAlert={addAlert}
                    addError={addError}
                    onClose={() => setCreateOpen(false)}
                    onCreated={async () => {
                        setCreateOpen(false);
                        await load();
                    }}
                />
            )}

            {detailRole && (
                <RoleDetailModal
                    clientId={id}
                    role={detailRole}
                    adminClient={adminClient}
                    addAlert={addAlert}
                    addError={addError}
                    onClose={() => setDetailRole(null)}
                    onSaved={async () => {
                        setDetailRole(null);
                        await load();
                    }}
                />
            )}
        </div>
    );
}

function RoleDetailModal({
    clientId,
    role,
    adminClient,
    addAlert,
    addError,
    onClose,
    onSaved
}: any) {
    const [subTab, setSubTab] = useState("settings");

    const [name, setName] = useState(role.name ?? "");
    const [description, setDescription] = useState(role.description ?? "");
    const [attrRows, setAttrRows] = useState<{ key: string; value: string }[]>(
        Object.entries(role.attributes || {}).map(([k, v]: any) => ({
            key: k,
            value: Array.isArray(v) ? v.join(", ") : String(v ?? "")
        }))
    );
    const [saving, setSaving] = useState(false);

    const [composites, setComposites] = useState<any[]>([]);
    const [realmRoles, setRealmRoles] = useState<any[]>([]);
    const [roleToAdd, setRoleToAdd] = useState("");
    const [loadingComp, setLoadingComp] = useState(false);

    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const loadComposites = useCallback(async () => {
        setLoadingComp(true);
        try {
            const [comp, realm] = await Promise.all([
                adminClient.roles.getCompositeRoles({ id: role.id }).catch(() => []),
                adminClient.roles.find().catch(() => [])
            ]);
            setComposites(Array.isArray(comp) ? comp : []);
            setRealmRoles(Array.isArray(realm) ? realm : []);
        } catch (err) {
            addError("İlişkili roller yüklenemedi.", err);
        } finally {
            setLoadingComp(false);
        }
    }, [adminClient, role.id, addError]);

    const loadUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const list = await adminClient.clients.findUsersWithRole({
                id: clientId,
                roleName: role.name
            });
            setUsers(Array.isArray(list) ? list : []);
        } catch (err) {
            addError("Kullanıcılar yüklenemedi.", err);
            setUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    }, [adminClient, clientId, role.name, addError]);

    useEffect(() => {
        if (subTab === "composites") loadComposites();
        if (subTab === "users") loadUsers();
    }, [subTab, loadComposites, loadUsers]);

    const assembleAttributes = () => {
        const out: Record<string, string[]> = {};
        attrRows.forEach(r => {
            const k = r.key.trim();
            if (!k) return;
            out[k] = r.value
                .split(",")
                .map(s => s.trim())
                .filter(Boolean);
        });
        return out;
    };

    const save = async () => {
        setSaving(true);
        try {
            await adminClient.roles.updateById(
                { id: role.id },
                {
                    ...role,
                    name: name.trim() || role.name,
                    description: description.trim() || undefined,
                    attributes: assembleAttributes()
                }
            );
            addAlert("Rol kaydedildi.", AlertVariant.success);
            await onSaved();
        } catch (err) {
            addError("Rol kaydedilemedi.", err);
        } finally {
            setSaving(false);
        }
    };

    const assignableComposites = useMemo(() => {
        const used = new Set(composites.map(r => r.id));
        return realmRoles.filter(r => !used.has(r.id));
    }, [composites, realmRoles]);

    const addComposite = async () => {
        const r = realmRoles.find(x => x.id === roleToAdd);
        if (!r) return;
        try {
            await adminClient.roles.createComposite({ id: role.id }, [r]);
            addAlert("İlişkili rol eklendi.", AlertVariant.success);
            setRoleToAdd("");
            await loadComposites();
        } catch (err) {
            addError("İlişkili rol eklenemedi.", err);
        }
    };

    const removeComposite = async (r: any) => {
        try {
            await adminClient.roles.delComposite({ id: role.id }, [r]);
            addAlert("İlişkili rol kaldırıldı.", AlertVariant.success);
            await loadComposites();
        } catch (err) {
            addError("İlişkili rol kaldırılamadı.", err);
        }
    };

    const subTabs = [
        { key: "settings", label: "Ayarlar" },
        { key: "attributes", label: "Öznitelikler" },
        { key: "composites", label: "İlişkili roller" },
        { key: "users", label: "Kullanıcılar" }
    ];

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{role.name}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Tabs value={subTab} onValueChange={setSubTab}>
                            <TabsList variant="line">
                                {(subTabs).map((t: any) => (
                                    <TabsTrigger key={t.key} value={t.key}>
                                        {t.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        {subTab === "settings" && (
                            <div className="space-y-4">
                                <Field>
                                    <FieldLabel>Ad</FieldLabel>
                                    <Input value={name} onChange={e => setName(e.target.value)} />
                                </Field>
                                <Field>
                                    <FieldLabel>Açıklama</FieldLabel>
                                    <Textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                </Field>
                            </div>
                        )}

                        {subTab === "attributes" && (
                            <div className="space-y-3">
                                {attrRows.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Öznitelik yok.
                                    </p>
                                )}
                                {attrRows.map((row, i) => (
                                    <div key={i} className="flex gap-2">
                                        <Input
                                            value={row.key}
                                            placeholder="Anahtar"
                                            onChange={e =>
                                                setAttrRows(rows =>
                                                    rows.map((r, j) =>
                                                        j === i
                                                            ? { ...r, key: e.target.value }
                                                            : r
                                                    )
                                                )
                                            }
                                        />
                                        <Input
                                            value={row.value}
                                            placeholder="Değer (virgülle ayrılmış)"
                                            onChange={e =>
                                                setAttrRows(rows =>
                                                    rows.map((r, j) =>
                                                        j === i
                                                            ? { ...r, value: e.target.value }
                                                            : r
                                                    )
                                                )
                                            }
                                        />
                                        <Button
                                            variant="destructive"
                                            onClick={() =>
                                                setAttrRows(rows =>
                                                    rows.filter((_, j) => j !== i)
                                                )
                                            }
                                        >
                                            Kaldır
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="secondary"
                                    onClick={() =>
                                        setAttrRows(rows => [...rows, { key: "", value: "" }])
                                    }
                                >
                                    Öznitelik ekle
                                </Button>
                            </div>
                        )}

                        {subTab === "composites" && (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <div className="flex-1">
                                        <Field>
                                            <FieldLabel>Rol</FieldLabel>
                                            <NativeSelect
                                                className="w-full"
                                                value={roleToAdd}
                                                onChange={e => setRoleToAdd(e.target.value)}
                                            >
                                                <NativeSelectOption value="">Rol seçin…</NativeSelectOption>
                                                {assignableComposites.map(r => (
                                                    <NativeSelectOption key={r.id} value={r.id}>
                                                        {r.name}
                                                    </NativeSelectOption>
                                                ))}
                                            </NativeSelect>
                                        </Field>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        disabled={!roleToAdd}
                                        onClick={addComposite}
                                    >
                                        Rol ekle
                                    </Button>
                                </div>
                                {loadingComp ? (
                                    <div className="flex justify-center py-16">
                                        <Spinner className="size-6" />
                                    </div>
                                ) : (
                                    <DataTable
                                        head={["Rol", ""]}
                                        empty="İlişkili rol yok."
                                        rows={composites.map(r => [
                                            <span className="font-medium text-foreground">
                                                {r.name}
                                            </span>,
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => removeComposite(r)}
                                                >
                                                    Kaldır
                                                </Button>
                                            </div>
                                        ])}
                                    />
                                )}
                            </div>
                        )}

                        {subTab === "users" &&
                            (loadingUsers ? (
                                <div className="flex justify-center py-16">
                                    <Spinner className="size-6" />
                                </div>
                            ) : (
                                <DataTable
                                    head={["Kullanıcı", "E-posta"]}
                                    empty="Bu role sahip kullanıcı yok."
                                    rows={users.map(u => [
                                        <span className="font-medium text-foreground">
                                            {u.username || "—"}
                                        </span>,
                                        <span>{u.email || "—"}</span>
                                    ])}
                                />
                            ))}
                    </div>
                </ModalBody>
                <ModalFooter>
                    {(subTab === "settings" || subTab === "attributes") && (
                        <Button
                            disabled={saving}
                            onClick={save}
                        >
                            {saving ? "Kaydediliyor…" : "Kaydet"}
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function CreateRole({ id, adminClient, addAlert, addError, onClose, onCreated }: any) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    const create = async () => {
        if (!name.trim()) {
            addError("Rol adı gerekli.", new Error("name"));
            return;
        }
        setSaving(true);
        try {
            await adminClient.clients.createRole(
                { id },
                { name: name.trim(), description: description.trim() || undefined }
            );
            addAlert("Rol oluşturuldu.", AlertVariant.success);
            await onCreated();
        } catch (err) {
            addError("Rol oluşturulamadı.", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>Rol oluştur</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Field>
                            <FieldLabel>Rol adı <span className="text-destructive">*</span></FieldLabel>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="my-role"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>Açıklama</FieldLabel>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </Field>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={saving}
                        onClick={create}
                    >
                        Oluştur
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/* ── 4. İstemci Kapsamları ──────────────────────────────────────────────── */
function ScopesTab({ id, clientId, adminClient, addAlert, addError, reload }: any) {
    const [subTab, setSubTab] = useState("setup");
    const [dedicatedOpen, setDedicatedOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [def, setDef] = useState<any[]>([]);
    const [opt, setOpt] = useState<any[]>([]);
    const [all, setAll] = useState<any[]>([]);
    const [_scopeToAdd, _setScopeToAdd] = useState("");
    const [_typeToAdd, _setTypeToAdd] = useState("default");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [d, o, a] = await Promise.all([
                adminClient.clients.listDefaultClientScopes({ id }).catch(() => []),
                adminClient.clients.listOptionalClientScopes({ id }).catch(() => []),
                adminClient.clientScopes.find().catch(() => [])
            ]);
            setDef(d ?? []);
            setOpt(o ?? []);
            setAll(a ?? []);
        } catch (err) {
            addError("İstemci kapsamları yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const unassigned = useMemo(() => {
        const used = new Set([...def, ...opt].map(s => s.id));
        return all.filter(s => !used.has(s.id));
    }, [def, opt, all]);

    const addScopes = async (ids: string[], type: string) => {
        try {
            for (const sid of ids) {
                if (type === "default")
                    await adminClient.clients.addDefaultClientScope({
                        id,
                        clientScopeId: sid
                    });
                else
                    await adminClient.clients.addOptionalClientScope({
                        id,
                        clientScopeId: sid
                    });
            }
            addAlert(
                ids.length > 1 ? `${ids.length} kapsam eklendi.` : "Kapsam eklendi.",
                AlertVariant.success
            );
            setAddOpen(false);
            await load();
        } catch (err) {
            addError("Kapsam eklenemedi.", err);
        }
    };

    const removeDefault = async (scope: any) => {
        try {
            await adminClient.clients.delDefaultClientScope({
                id,
                clientScopeId: scope.id
            });
            addAlert("Kapsam kaldırıldı.", AlertVariant.success);
            await load();
        } catch (err) {
            addError("Kapsam kaldırılamadı.", err);
        }
    };

    const removeOptional = async (scope: any) => {
        try {
            await adminClient.clients.delOptionalClientScope({
                id,
                clientScopeId: scope.id
            });
            addAlert("Kapsam kaldırıldı.", AlertVariant.success);
            await load();
        } catch (err) {
            addError("Kapsam kaldırılamadı.", err);
        }
    };

    // Move an already-assigned scope between default ↔ optional.
    const changeType = async (scope: any, currentType: string, newType: string) => {
        if (currentType === newType) return;
        try {
            if (currentType === "default")
                await adminClient.clients.delDefaultClientScope({
                    id,
                    clientScopeId: scope.id
                });
            else
                await adminClient.clients.delOptionalClientScope({
                    id,
                    clientScopeId: scope.id
                });
            if (newType === "default")
                await adminClient.clients.addDefaultClientScope({
                    id,
                    clientScopeId: scope.id
                });
            else
                await adminClient.clients.addOptionalClientScope({
                    id,
                    clientScopeId: scope.id
                });
            addAlert("Kapsam türü güncellendi.", AlertVariant.success);
            await load();
        } catch (err) {
            addError("Kapsam türü güncellenemedi.", err);
        }
    };

    const assigned = useMemo(
        () =>
            [
                ...def.map((s: any) => ({ ...s, type: "default" })),
                ...opt.map((s: any) => ({ ...s, type: "optional" }))
            ].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
        [def, opt]
    );

    if (loading) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    const _scopeRows = (scopes: any[], remove: (s: any) => void) =>
        scopes.map(s => [
            <span className="font-medium text-foreground">{s.name}</span>,
            <div className="flex justify-end">
                <Button
                    variant="destructive"
                    onClick={() => remove(s)}
                >
                    Kaldır
                </Button>
            </div>
        ]);

    return (
        <div className="space-y-4">
            <Tabs value={subTab} onValueChange={setSubTab}>
                <TabsList variant="line">
                    {([
                    { key: "setup", label: "Kurulum" },
                    { key: "evaluate", label: "Değerlendir" }
                ]).map((t: any) => (
                        <TabsTrigger key={t.key} value={t.key}>
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {subTab === "setup" && (
                <div className="space-y-7">
                    <div>
                        <GroupLabel>İstemci Token'ı</GroupLabel>
                        <Group>
                            <Item size="sm" asChild>
                                <button type="button" onClick={() => setDedicatedOpen(true)}>
                                    <ItemMedia variant="icon">
                                        <StackIcon weight="fill" />
                                    </ItemMedia>
                                    <ItemContent className="min-w-0">
                                        <ItemTitle>Mapper'lar ve Scope</ItemTitle>
                                        <ItemDescription>
                                            Bu istemciye özel token özelleştirmesi
                                        </ItemDescription>
                                    </ItemContent>
                                    <ItemActions>
                                        <CaretRightIcon weight="bold" className="rtl:rotate-180" />
                                    </ItemActions>
                                </button>
                            </Item>
                        </Group>
                    </div>

                    <div>
                        <div className="ms-1 mb-2 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Atanmış Kapsamlar
                            </h3>
                            <Button
                                variant="plain"
                                size="sm"
                                onClick={() => setAddOpen(true)}
                                disabled={unassigned.length === 0}
                            >
                                + Ekle
                            </Button>
                        </div>
                        <Group>
                            {assigned.length === 0 ? (
                                <EmptyRow>Atanmış kapsam yok.</EmptyRow>
                            ) : (
                                assigned.map(s => (
                                    <Item key={s.id} size="sm">
                                        <ItemContent className="min-w-0">
                                            <ItemTitle>{s.name}</ItemTitle>
                                        </ItemContent>
                                        <ItemActions>
                                        <Select
                                            value={s.type}
                                            onValueChange={(v: string) =>
                                                changeType(s, s.type, v)
                                            }
                                        >
                                            <SelectTrigger size="sm" aria-label="Tür">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent align="end">
                                                <SelectItem value="default">
                                                    Varsayılan
                                                </SelectItem>
                                                <SelectItem value="optional">
                                                    İsteğe bağlı
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <RowDelete
                                            onClick={() =>
                                                s.type === "default"
                                                    ? removeDefault(s)
                                                    : removeOptional(s)
                                            }
                                        />
                                        </ItemActions>
                                    </Item>
                                ))
                            )}
                        </Group>
                    </div>
                </div>
            )}

            {subTab === "evaluate" && (
                <EvaluateScopes id={id} adminClient={adminClient} addError={addError} />
            )}

            {dedicatedOpen && (
                <DedicatedScopeModal
                    id={id}
                    clientId={clientId}
                    adminClient={adminClient}
                    addAlert={addAlert}
                    addError={addError}
                    reload={reload}
                    onClose={() => setDedicatedOpen(false)}
                />
            )}

            {addOpen && (
                <AddScopeModal
                    unassigned={unassigned}
                    onAdd={addScopes}
                    onClose={() => setAddOpen(false)}
                />
            )}
        </div>
    );
}

function AddScopeModal({ unassigned, onAdd, onClose }: any) {
    const [search, setSearch] = useState("");
    const [type, setType] = useState("default");
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggle = (sid: string) =>
        setSelected(prev => {
            const next = new Set(prev);
            next.has(sid) ? next.delete(sid) : next.add(sid);
            return next;
        });

    const filtered = unassigned.filter((s: any) =>
        (s.name || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>Kapsam ekle</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        {/* Search */}
                        <InputGroup>
                            <InputGroupAddon>
                                <MagnifyingGlassIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                                type="search"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Kapsam ara"
                            />
                        </InputGroup>

                        {/* Available scopes */}
                        <div className="max-h-80 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <EmptyRow>Eklenebilecek kapsam yok.</EmptyRow>
                            ) : (
                                <Group>
                                    {filtered.map((s: any) => {
                                        const on = selected.has(s.id);
                                        return (
                                            <Item key={s.id} size="sm" asChild>
                                                <button type="button" onClick={() => toggle(s.id)}>
                                                    <ItemContent className="min-w-0">
                                                        <ItemTitle>{s.name}</ItemTitle>
                                                    </ItemContent>
                                                    {on && (
                                                        <ItemActions>
                                                            <CheckIcon weight="bold" className="text-primary" />
                                                        </ItemActions>
                                                    )}
                                                </button>
                                            </Item>
                                        );
                                    })}
                                </Group>
                            )}
                        </div>

                        {/* Type — labeled value selector, by the add action */}
                        <Separator />
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium">Tür</span>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger size="sm" aria-label="Tür">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end" className="z-200">
                                    <SelectItem value="default">Varsayılan</SelectItem>
                                    <SelectItem value="optional">İsteğe bağlı</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={selected.size === 0}
                        onClick={() => onAdd([...selected], type)}
                    >
                        {selected.size > 0 ? `Ekle (${selected.size})` : "Ekle"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function DedicatedScopeModal({
    id,
    adminClient,
    addAlert,
    addError,
    reload,
    onClose
}: any) {
    const [serverInfo, setServerInfo] = useState<any>(null);
    const [tab, setTab] = useState("mappers");
    const [view, setView] = useState("list"); // list | choose | predefined | pickType | config
    const [loading, setLoading] = useState(true);
    const [mappers, setMappers] = useState<any[]>([]);
    const [protocol, setProtocol] = useState("openid-connect");
    const [fullScope, setFullScope] = useState(false);
    const [confirm, confirmNode] = useConfirmDialog();

    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [pickedType, setPickedType] = useState<any>(null);
    const [newName, setNewName] = useState("");
    const [newConfig, setNewConfig] = useState<any>({});
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [m, c, si] = await Promise.all([
                adminClient.clients.listProtocolMappers({ id }).catch(() => []),
                adminClient.clients.findOne({ id }).catch(() => null),
                adminClient.serverInfo.find().catch(() => null)
            ]);
            setMappers(Array.isArray(m) ? m : []);
            setProtocol(c?.protocol || "openid-connect");
            setFullScope(!!c?.fullScopeAllowed);
            setServerInfo(si);
        } catch (err) {
            addError("Yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const builtins: any[] = serverInfo?.builtinProtocolMappers?.[protocol] || [];
    const mapperTypes: any[] = serverInfo?.protocolMapperTypes?.[protocol] || [];
    const existing = new Set((mappers || []).map((m: any) => m.name));
    const availBuiltins = builtins.filter((b: any) => !existing.has(b.name));

    const goList = () => {
        setView("list");
        setSearch("");
        setSelected(new Set());
        setPickedType(null);
        setNewName("");
        setNewConfig({});
    };
    const toggleSel = (name: string) =>
        setSelected(prev => {
            const n = new Set(prev);
            n.has(name) ? n.delete(name) : n.add(name);
            return n;
        });

    const deleteMapper = (m: any) =>
        confirm({
            title: "Mapper'ı sil",
            message: `“${m.name}” mapper'ı silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delProtocolMapper({ id, mapperId: m.id });
                    addAlert("Mapper silindi.", AlertVariant.success);
                    await load();
                } catch (err) {
                    addError("Mapper silinemedi.", err);
                }
            }
        });

    const addPredefined = async () => {
        const reps = availBuiltins
            .filter((b: any) => selected.has(b.name))
            .map((b: any) => ({ ...b, id: undefined }));
        if (!reps.length) return;
        try {
            await adminClient.clients.addMultipleProtocolMappers({ id }, reps);
            addAlert(`${reps.length} mapper eklendi.`, AlertVariant.success);
            goList();
            await load();
        } catch (err) {
            addError("Mapper eklenemedi.", err);
        }
    };

    const saveNew = async () => {
        if (!newName.trim() || !pickedType) return;
        setSaving(true);
        try {
            const config: any = {};
            for (const [k, v] of Object.entries(newConfig)) {
                config[k] = Array.isArray(v)
                    ? v.length <= 1
                        ? (v[0] ?? "")
                        : v.join("##")
                    : String(v ?? "");
            }
            await adminClient.clients.addProtocolMapper(
                { id },
                { name: newName.trim(), protocol, protocolMapper: pickedType.id, config }
            );
            addAlert("Mapper eklendi.", AlertVariant.success);
            goList();
            await load();
        } catch (err) {
            addError("Mapper eklenemedi.", err);
        } finally {
            setSaving(false);
        }
    };

    const toggleFullScope = async (v: boolean) => {
        setFullScope(v);
        try {
            const client = await adminClient.clients.findOne({ id });
            await adminClient.clients.update({ id }, { ...client, fullScopeAllowed: v });
            addAlert("Scope ayarı güncellendi.", AlertVariant.success);
            await reload?.();
        } catch (err) {
            setFullScope(!v);
            addError("Scope ayarı güncellenemedi.", err);
        }
    };

    const SubBack = ({ to, children }: any) => (
        <Button variant="ghost" size="sm" onClick={() => setView(to)}>
            <CaretLeftIcon weight="bold" />
            {children}
        </Button>
    );

    const filteredBuiltins = availBuiltins.filter((b: any) =>
        (b.name || "").toLowerCase().includes(search.toLowerCase())
    );
    const filteredTypes = mapperTypes.filter((t: any) =>
        (t.name || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>Mapper'lar ve Scope</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <Spinner className="size-6" />
                            </div>
                        ) : view === "list" ? (
                            <>
                                <Tabs value={tab} onValueChange={setTab}>
                                    <TabsList variant="line">
                                        {([
                                        { key: "mappers", label: "Mappers" },
                                        { key: "scope", label: "Scope" }
                                    ]).map((t: any) => (
                                            <TabsTrigger key={t.key} value={t.key}>
                                                {t.label}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                                {tab === "mappers" ? (
                                    <div className="space-y-3">
                                        <div className="ms-1 flex items-center justify-between">
                                            <h3 className="text-sm font-medium text-muted-foreground">
                                                Mapper'lar
                                            </h3>
                                            <Button
                                                variant="plain"
                                                size="sm"
                                                onClick={() => setView("choose")}
                                            >
                                                + Ekle
                                            </Button>
                                        </div>
                                        {mappers.length === 0 ? (
                                            <EmptyCard
                                                icon={<StackIcon weight="fill" />}
                                                title="Mapper yok"
                                                desc="Token'a claim eklemek için bir mapper ekleyin."
                                                action={
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => setView("choose")}
                                                    >
                                                        Ekle
                                                    </Button>
                                                }
                                            />
                                        ) : (
                                            <Group>
                                                {mappers.map(m => (
                                                    <Item key={m.id} size="sm">
                                                        <ItemContent className="min-w-0">
                                                            <ItemTitle>{m.name}</ItemTitle>
                                                            <ItemDescription className="truncate">
                                                                {m.protocolMapper}
                                                            </ItemDescription>
                                                        </ItemContent>
                                                        <ItemActions>
                                                            <RowDelete
                                                                onClick={() => deleteMapper(m)}
                                                            />
                                                        </ItemActions>
                                                    </Item>
                                                ))}
                                            </Group>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <Group>
                                            <Row
                                                label="Tam kapsam izni"
                                                hint="Açıkken istemci, kullanıcının tüm rollerini token'da alır."
                                            >
                                                <Switch
                                                    checked={fullScope}
                                                    onCheckedChange={toggleFullScope}
                                                />
                                            </Row>
                                        </Group>
                                        <GroupFooter>
                                            Kapalıyken yalnızca atanmış rol kapsam eşlemeleri
                                            token'a dahil edilir.
                                        </GroupFooter>
                                    </div>
                                )}
                            </>
                        ) : view === "choose" ? (
                            <div className="space-y-3">
                                <SubBack to="list">Mapper'lar</SubBack>
                                <Group>
                                    <Item size="sm" asChild>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch("");
                                                setSelected(new Set());
                                                setView("predefined");
                                            }}
                                        >
                                            <ItemContent>
                                                <ItemTitle>Hazır mapper ekle</ItemTitle>
                                                <ItemDescription>Standart claim'leri listeden seç</ItemDescription>
                                            </ItemContent>
                                            <ItemActions>
                                                <CaretRightIcon weight="bold" className="rtl:rotate-180" />
                                            </ItemActions>
                                        </button>
                                    </Item>
                                    <Item size="sm" asChild>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch("");
                                                setView("pickType");
                                            }}
                                        >
                                            <ItemContent>
                                                <ItemTitle>Yeni mapper yapılandır</ItemTitle>
                                                <ItemDescription>Bir tip seçip özel claim oluştur</ItemDescription>
                                            </ItemContent>
                                            <ItemActions>
                                                <CaretRightIcon weight="bold" className="rtl:rotate-180" />
                                            </ItemActions>
                                        </button>
                                    </Item>
                                </Group>
                            </div>
                        ) : view === "predefined" ? (
                            <div className="space-y-3">
                                <SubBack to="choose">Geri</SubBack>
                                <InputGroup>
                                    <InputGroupAddon>
                                        <MagnifyingGlassIcon />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        type="search"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Mapper ara"
                                    />
                                </InputGroup>
                                <div className="max-h-72 overflow-y-auto">
                                    {filteredBuiltins.length === 0 ? (
                                        <EmptyRow>Eklenebilecek hazır mapper yok.</EmptyRow>
                                    ) : (
                                        <Group>
                                            {filteredBuiltins.map((b: any) => {
                                                const on = selected.has(b.name);
                                                return (
                                                    <Item key={b.name} size="sm" asChild>
                                                        <button type="button" onClick={() => toggleSel(b.name)}>
                                                            <ItemContent className="min-w-0">
                                                                <ItemTitle>{b.name}</ItemTitle>
                                                            </ItemContent>
                                                            {on && (
                                                                <ItemActions>
                                                                    <CheckIcon weight="bold" className="text-primary" />
                                                                </ItemActions>
                                                            )}
                                                        </button>
                                                    </Item>
                                                );
                                            })}
                                        </Group>
                                    )}
                                </div>
                                <Button
                                    block
                                    disabled={selected.size === 0}
                                    onClick={addPredefined}
                                >
                                    {selected.size > 0 ? `Ekle (${selected.size})` : "Ekle"}
                                </Button>
                            </div>
                        ) : view === "pickType" ? (
                            <div className="space-y-3">
                                <SubBack to="choose">Geri</SubBack>
                                <InputGroup>
                                    <InputGroupAddon>
                                        <MagnifyingGlassIcon />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        type="search"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Mapper tipi ara"
                                    />
                                </InputGroup>
                                <div className="max-h-72 overflow-y-auto">
                                    {filteredTypes.length === 0 ? (
                                        <EmptyRow>Mapper tipi yok.</EmptyRow>
                                    ) : (
                                        <Group>
                                            {filteredTypes.map((t: any) => (
                                                <Item key={t.id} size="sm" asChild>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPickedType(t);
                                                            setNewName(t.name);
                                                            setNewConfig({});
                                                            setView("config");
                                                        }}
                                                    >
                                                        <ItemContent className="min-w-0">
                                                            <ItemTitle>{t.name}</ItemTitle>
                                                            {t.category && (
                                                                <ItemDescription className="truncate">
                                                                    {t.category}
                                                                </ItemDescription>
                                                            )}
                                                        </ItemContent>
                                                        <ItemActions>
                                                            <CaretRightIcon
                                                                weight="bold"
                                                                className="rtl:rotate-180"
                                                            />
                                                        </ItemActions>
                                                    </button>
                                                </Item>
                                            ))}
                                        </Group>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <SubBack to="pickType">{pickedType?.name}</SubBack>
                                <Group>
                                    <Row label="Ad">
                                        <Input
                                            size="sm"
                                            value={newName}
                                            onChange={(e: any) => setNewName(e.target.value)}
                                            placeholder="Mapper adı"
                                        />
                                    </Row>
                                </Group>
                                <ConfigForm
                                    properties={pickedType?.properties}
                                    value={newConfig}
                                    onChange={(name: string, v: string[]) =>
                                        setNewConfig((c: any) => ({ ...c, [name]: v }))
                                    }
                                />
                                <Button
                                    block
                                    disabled={saving || !newName.trim()}
                                    onClick={saveNew}
                                >
                                    {saving ? "Kaydediliyor…" : "Kaydet"}
                                </Button>
                            </div>
                        )}
                    </div>
                    {confirmNode}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

function EvaluateScopes({ id, adminClient, addError }: any) {
    const { realm } = useRealm();
    const [scope, setScope] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [picked, setPicked] = useState<{ userId: string; username: string } | null>(
        null
    );

    const [view, setView] = useState("token");
    const [evaluated, setEvaluated] = useState(false);
    const [mappers, setMappers] = useState<any[] | null>(null);
    const [mappersFailed, setMappersFailed] = useState(false);
    const [roles, setRoles] = useState<any[] | null>(null);
    const [rolesFailed, setRolesFailed] = useState(false);
    const [token, setToken] = useState<any>(null);
    const [tokenFailed, setTokenFailed] = useState(false);
    const [evaluating, setEvaluating] = useState(false);

    // The API wants a space-joined list of effective (extra) scope names.
    const scopeParam = useMemo(
        () => lines(scope.replace(/[,\s]+/g, "\n")).join(" "),
        [scope]
    );

    const searchUsers = async () => {
        if (!userSearch.trim()) {
            setUserResults([]);
            return;
        }
        setSearching(true);
        try {
            const list = await adminClient.users.find({
                search: userSearch.trim(),
                max: 20
            });
            setUserResults(Array.isArray(list) ? list : []);
        } catch (err) {
            addError("Kullanıcılar aranamadı.", err);
            setUserResults([]);
        } finally {
            setSearching(false);
        }
    };

    const evaluate = useCallback(
        async (userId?: string) => {
            const uid = userId ?? picked?.userId;
            setEvaluating(true);
            setEvaluated(true);
            setMappersFailed(false);
            setRolesFailed(false);
            setTokenFailed(false);
            try {
                const m = await adminClient.clients.evaluateListProtocolMapper({
                    id,
                    scope: scopeParam
                });
                setMappers(Array.isArray(m) ? m : []);
            } catch {
                setMappers(null);
                setMappersFailed(true);
            }
            try {
                const r = await adminClient.clients.evaluatePermission({
                    id,
                    roleContainer: realm,
                    scope: scopeParam,
                    type: "granted"
                });
                setRoles(Array.isArray(r) ? r : []);
            } catch {
                setRoles(null);
                setRolesFailed(true);
            }
            if (uid) {
                try {
                    const t = await adminClient.clients.evaluateGenerateAccessToken({
                        id,
                        userId: uid,
                        scope: scopeParam
                    });
                    setToken(t ?? null);
                } catch {
                    setToken(null);
                    setTokenFailed(true);
                }
            } else {
                setToken(null);
            }
            setEvaluating(false);
        },
        [adminClient, id, scopeParam, picked, realm]
    );

    const pickUser = (u: any) => {
        setPicked({ userId: u.id, username: u.username });
        setUserResults([]);
        setUserSearch("");
    };

    return (
        <div className="space-y-7">
            <div>
                <GroupLabel>Değerlendirme</GroupLabel>
                <Group>
                    <StackRow
                        label="Kapsam parametresi"
                        hint="İsteğe bağlı kapsam adları (boşluk veya virgülle ayrılmış)."
                    >
                        <Input
                            size="sm"
                            value={scope}
                            onChange={(e: any) => setScope(e.target.value)}
                            placeholder="address phone"
                        />
                    </StackRow>
                    <StackRow
                        label="Kullanıcı (isteğe bağlı)"
                        hint="Örnek token üretmek için bir kullanıcı seçin."
                    >
                        {picked ? (
                            <div className="flex items-center gap-2">
                                <Badge>{picked.username}</Badge>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setPicked(null)}
                                >
                                    Kaldır
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Input
                                    size="md"
                                    className="flex-1"
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && searchUsers()}
                                    placeholder="Kullanıcı adı, e-posta…"
                                />
                                <Button
                                    variant="secondary"
                                    disabled={searching}
                                    onClick={searchUsers}
                                >
                                    Ara
                                </Button>
                            </div>
                        )}
                    </StackRow>
                    {userResults.length > 0 && (
                        <div className="max-h-56 overflow-y-auto">
                            {userResults.map(u => (
                                <Item key={u.id} size="xs" asChild>
                                    <button type="button" onClick={() => pickUser(u)}>
                                        <ItemContent>
                                            <ItemTitle>{u.username}</ItemTitle>
                                        </ItemContent>
                                        <ItemActions>
                                            <span className="text-sm text-muted-foreground">
                                                {u.email || "—"}
                                            </span>
                                        </ItemActions>
                                    </button>
                                </Item>
                            ))}
                        </div>
                    )}
                    <ActionRow onClick={() => evaluate()} disabled={evaluating}>
                        {evaluating ? "Değerlendiriliyor…" : "Değerlendir"}
                    </ActionRow>
                </Group>
                <GroupFooter>
                    Etkin kapsamları, mapper'ları, rolleri ve örnek token'ı görüntüleyin.
                </GroupFooter>
            </div>

            {evaluated && (
                <div>
                    <Tabs value={view} onValueChange={setView}>
                        <TabsList variant="line">
                            {([
                            { key: "token", label: "Örnek token" },
                            { key: "mappers", label: "Etkin mapper'lar" },
                            { key: "roles", label: "Etkin roller" }
                        ]).map((t: any) => (
                                <TabsTrigger key={t.key} value={t.key}>
                                    {t.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {view === "token" && (
                        <div className="mt-4">
                            {!picked ? (
                                <EmptyRow>Örnek token için bir kullanıcı seçin.</EmptyRow>
                            ) : tokenFailed ? (
                                <EmptyRow>Token değerlendirilemedi.</EmptyRow>
                            ) : (
                                <CodeBlock size="sm">
                                    <CodeBlockContent className="max-h-112 scroll-fade-y">
                                        {token ? JSON.stringify(token, null, 2) : "—"}
                                    </CodeBlockContent>
                                </CodeBlock>
                            )}
                        </div>
                    )}

                    {view === "mappers" && (
                        <div className="mt-4">
                            <Group>
                                {mappersFailed ? (
                                    <EmptyRow>Mapper'lar değerlendirilemedi.</EmptyRow>
                                ) : (mappers ?? []).length === 0 ? (
                                    <EmptyRow>Etkin mapper yok.</EmptyRow>
                                ) : (
                                    (mappers ?? []).map((m: any, i: number) => (
                                        <Row
                                            key={m.id || i}
                                            label={m.name || "—"}
                                            hint={m.category || m.protocol || undefined}
                                        >
                                            <span className="truncate text-sm text-muted-foreground">
                                                {m.protocolMapper || "—"}
                                            </span>
                                        </Row>
                                    ))
                                )}
                            </Group>
                        </div>
                    )}

                    {view === "roles" && (
                        <div className="mt-4">
                            <Group>
                                {rolesFailed ? (
                                    <EmptyRow>Roller değerlendirilemedi.</EmptyRow>
                                ) : (roles ?? []).length === 0 ? (
                                    <EmptyRow>Etkin rol yok.</EmptyRow>
                                ) : (
                                    (roles ?? []).map((r: any, i: number) => (
                                        <Row
                                            key={r.id || i}
                                            label={r.name || "—"}
                                            hint={r.containerId || undefined}
                                        >
                                            {r.clientRole && (
                                                <Badge>İstemci</Badge>
                                            )}
                                        </Row>
                                    ))
                                )}
                            </Group>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── 5. Servis Hesabı Rolleri ───────────────────────────────────────────── */
function ServiceAccountTab({ id, adminClient, addAlert, addError }: any) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [allRoles, setAllRoles] = useState<any[]>([]);
    const [roleToAdd, setRoleToAdd] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const u = await adminClient.clients.getServiceAccountUser({ id });
            setUser(u ?? null);
            if (u?.id) {
                const [mapped, all] = await Promise.all([
                    adminClient.users.listRealmRoleMappings({ id: u.id }).catch(() => []),
                    adminClient.roles.find().catch(() => [])
                ]);
                setRoles(mapped ?? []);
                setAllRoles(all ?? []);
            }
        } catch (err) {
            addError("Servis hesabı yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const assignable = useMemo(() => {
        const mapped = new Set(roles.map(r => r.id));
        return allRoles.filter(r => !mapped.has(r.id) && r.name !== "uma_authorization");
    }, [roles, allRoles]);

    const assign = async () => {
        const role = allRoles.find(r => r.id === roleToAdd);
        if (!role || !user?.id) return;
        try {
            await adminClient.users.addRealmRoleMappings({ id: user.id, roles: [role] });
            addAlert("Rol atandı.", AlertVariant.success);
            setRoleToAdd("");
            await load();
        } catch (err) {
            addError("Rol atanamadı.", err);
        }
    };

    const remove = async (role: any) => {
        if (!user?.id) return;
        try {
            await adminClient.users.delRealmRoleMappings({ id: user.id, roles: [role] });
            addAlert("Rol kaldırıldı.", AlertVariant.success);
            await load();
        } catch (err) {
            addError("Rol kaldırılamadı.", err);
        }
    };

    if (loading) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Realm rolü ata</CardTitle>
                    <CardDescription>Servis hesabına bir realm rolü atayın.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <Field>
                                <FieldLabel>Rol</FieldLabel>
                                <NativeSelect
                                    className="w-full"
                                    value={roleToAdd}
                                    onChange={e => setRoleToAdd(e.target.value)}
                                >
                                    <NativeSelectOption value="">Rol seçin…</NativeSelectOption>
                                    {assignable.map(r => (
                                        <NativeSelectOption key={r.id} value={r.id}>
                                            {r.name}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                        </div>
                        <Button
                            variant="secondary"
                            disabled={!roleToAdd}
                            onClick={assign}
                        >
                            Ata
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <DataTable
                head={["Rol", ""]}
                empty="Atanmış rol yok."
                rows={roles.map(r => [
                    <span className="font-medium text-foreground">{r.name}</span>,
                    <div className="flex justify-end">
                        <Button
                            variant="destructive"
                            onClick={() => remove(r)}
                        >
                            Kaldır
                        </Button>
                    </div>
                ])}
            />

            <ServiceAccountClientRoles
                saUser={user}
                adminClient={adminClient}
                addAlert={addAlert}
                addError={addError}
            />
        </div>
    );
}

function ServiceAccountClientRoles({ saUser, adminClient, addAlert, addError }: any) {
    const [clients, setClients] = useState<any[]>([]);
    const [chosenClientId, setChosenClientId] = useState("");
    const [clientRoles, setClientRoles] = useState<any[]>([]);
    const [mapped, setMapped] = useState<any[]>([]);
    const [roleToAdd, setRoleToAdd] = useState("");
    const [loadingRoles, setLoadingRoles] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const list = await adminClient.clients.find();
                if (alive) setClients(Array.isArray(list) ? list : []);
            } catch (err) {
                addError("İstemciler yüklenemedi.", err);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, addError]);

    const loadForClient = useCallback(
        async (clientUniqueId: string) => {
            if (!clientUniqueId || !saUser?.id) {
                setClientRoles([]);
                setMapped([]);
                return;
            }
            setLoadingRoles(true);
            try {
                const [all, mp] = await Promise.all([
                    adminClient.clients.listRoles({ id: clientUniqueId }).catch(() => []),
                    adminClient.users
                        .listClientRoleMappings({ id: saUser.id, clientUniqueId })
                        .catch(() => [])
                ]);
                setClientRoles(Array.isArray(all) ? all : []);
                setMapped(Array.isArray(mp) ? mp : []);
            } catch (err) {
                addError("İstemci rolleri yüklenemedi.", err);
            } finally {
                setLoadingRoles(false);
            }
        },
        [adminClient, saUser, addError]
    );

    const onChooseClient = (value: string) => {
        setChosenClientId(value);
        setRoleToAdd("");
        loadForClient(value);
    };

    const assignable = useMemo(() => {
        const used = new Set(mapped.map(r => r.id));
        return clientRoles.filter(r => !used.has(r.id));
    }, [clientRoles, mapped]);

    const assign = async () => {
        const role = clientRoles.find(r => r.id === roleToAdd);
        if (!role || !saUser?.id || !chosenClientId) return;
        try {
            await adminClient.users.addClientRoleMappings({
                id: saUser.id,
                clientUniqueId: chosenClientId,
                roles: [role]
            });
            addAlert("İstemci rolü atandı.", AlertVariant.success);
            setRoleToAdd("");
            await loadForClient(chosenClientId);
        } catch (err) {
            addError("İstemci rolü atanamadı.", err);
        }
    };

    const remove = async (role: any) => {
        if (!saUser?.id || !chosenClientId) return;
        try {
            await adminClient.users.delClientRoleMappings({
                id: saUser.id,
                clientUniqueId: chosenClientId,
                roles: [role]
            });
            addAlert("İstemci rolü kaldırıldı.", AlertVariant.success);
            await loadForClient(chosenClientId);
        } catch (err) {
            addError("İstemci rolü kaldırılamadı.", err);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>İstemci rolü ata</CardTitle>
                <CardDescription>Servis hesabına başka bir istemcinin rollerini atayın.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <Field>
                            <FieldLabel>İstemci</FieldLabel>
                            <NativeSelect
                                className="w-full"
                                value={chosenClientId}
                                onChange={e => onChooseClient(e.target.value)}
                            >
                                <NativeSelectOption value="">İstemci seçin…</NativeSelectOption>
                                {clients.map(c => (
                                    <NativeSelectOption key={c.id} value={c.id}>
                                        {c.clientId}
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                        </Field>
                    </div>
                    <div className="flex-1">
                        <Field>
                            <FieldLabel>Rol</FieldLabel>
                            <NativeSelect
                                className="w-full"
                                value={roleToAdd}
                                disabled={!chosenClientId}
                                onChange={e => setRoleToAdd(e.target.value)}
                            >
                                <NativeSelectOption value="">Rol seçin…</NativeSelectOption>
                                {assignable.map(r => (
                                    <NativeSelectOption key={r.id} value={r.id}>
                                        {r.name}
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                        </Field>
                    </div>
                    <Button
                        variant="secondary"
                        disabled={!roleToAdd}
                        onClick={assign}
                    >
                        Ata
                    </Button>
                </div>

                {chosenClientId && (
                    <div className="mt-4">
                        {loadingRoles ? (
                            <div className="flex justify-center py-16">
                                <Spinner className="size-6" />
                            </div>
                        ) : (
                            <DataTable
                                head={["Rol", ""]}
                                empty="Atanmış istemci rolü yok."
                                rows={mapped.map(r => [
                                    <span className="font-medium text-foreground">
                                        {r.name}
                                    </span>,
                                    <div className="flex justify-end">
                                        <Button
                                            variant="destructive"
                                            onClick={() => remove(r)}
                                        >
                                            Kaldır
                                        </Button>
                                    </div>
                                ])}
                            />
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ── 6. Oturumlar ───────────────────────────────────────────────────────── */
function SessionsTab({ id, adminClient, addError }: any) {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await adminClient.clients.listSessions({ id });
            setSessions(list ?? []);
        } catch (err) {
            addError("Oturumlar yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    return (
        <div className="space-y-3">
            <div className="ms-1 flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Aktif Oturumlar</h3>
                {sessions.length > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {sessions.length}
                    </span>
                )}
            </div>
            {sessions.length === 0 ? (
                <EmptyCard
                    icon={<UsersThreeIcon weight="fill" />}
                    title="Aktif oturum yok"
                    desc="Bu istemcide şu an açık bir kullanıcı oturumu yok."
                />
            ) : (
                <Group>
                    {sessions.map(s => (
                        <Item key={s.id} size="sm">
                            <ItemMedia>
                                <Avatar size="lg">
                                    <AvatarFallback>
                                        {(s.username || "?").trim().charAt(0).toUpperCase() ||
                                            "?"}
                                    </AvatarFallback>
                                </Avatar>
                            </ItemMedia>
                            <ItemContent className="min-w-0">
                                <ItemTitle>{s.username || "—"}</ItemTitle>
                                <ItemDescription className="truncate">
                                    <span className="font-mono">
                                        {s.ipAddress || "—"}
                                    </span>
                                    {" · Son erişim "}
                                    {fmtDate(s.lastAccess)}
                                </ItemDescription>
                            </ItemContent>
                            <ItemActions className="hidden sm:flex">
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {fmtDate(s.start)}
                                </span>
                            </ItemActions>
                        </Item>
                    ))}
                </Group>
            )}
        </div>
    );
}

const ALG_OPTIONS = [
    "",
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "PS256",
    "HS256"
];

const KEYSTORE_FORMATS = [
    { value: "JKS", label: "JKS" },
    { value: "PKCS12", label: "PKCS12" },
    { value: "Certificate PEM", label: "Certificate PEM" }
];

/* ── 7. Keys (OIDC) ─────────────────────────────────────────────────────── */
function KeysTab({
    id,
    edited,
    setEdited,
    adminClient,
    addAlert,
    addError,
    reload,
    confirm
}: any) {
    const [_saving, setSaving] = useState(false);

    const [cert, setCert] = useState<string>("");
    const [loadingCert, setLoadingCert] = useState(true);
    const [keystoreFormat, setKeystoreFormat] = useState("JKS");
    const fileRef = useRef<HTMLInputElement>(null);

    const loadCert = useCallback(async () => {
        setLoadingCert(true);
        try {
            const info = await adminClient.clients.getKeyInfo({
                id,
                attr: "jwt.credential"
            });
            setCert(info?.certificate ?? "");
        } catch (err) {
            addError("Sertifika bilgisi yüklenemedi.", err);
            setCert("");
        } finally {
            setLoadingCert(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        loadCert();
    }, [loadCert]);

    if (!edited) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    const attrs = edited.attributes || {};
    const useJwksUrl = (attrs["use.jwks.url"] ?? "") === "true";

    const setAttr = (key: string, value: any) =>
        setEdited((e: any) => ({
            ...e,
            attributes: { ...(e.attributes || {}), [key]: value }
        }));

    const save = async (next?: any) => {
        const payload = next ?? edited;
        setSaving(true);
        try {
            await adminClient.clients.update({ id }, payload);
            addAlert("İstemci kaydedildi.", AlertVariant.success);
            await reload();
        } catch (err) {
            addError("İstemci kaydedilemedi.", err);
        } finally {
            setSaving(false);
        }
    };

    // Switch her iki yönde de anında backend'e yazılır (Apple: mod seçimi sessizce kalıcı olur).
    const toggleJwks = (v: boolean) => {
        const next = {
            ...edited,
            attributes: {
                ...(edited.attributes || {}),
                "use.jwks.url": v ? "true" : "false"
            }
        };
        setEdited(next);
        save(next);
    };

    // URL alanı odaktan çıkınca / Enter'da sessizce commit eder; değişmediyse istek atılmaz.
    const savedJwksRef = useRef(attrs["jwks.url"] ?? "");
    const commitJwksUrl = () => {
        const cur = edited.attributes?.["jwks.url"] ?? "";
        if (cur === savedJwksRef.current) return;
        savedJwksRef.current = cur;
        save();
    };

    const generateKey = () =>
        confirm({
            title: "Yeni anahtar üret",
            message:
                "Yeni bir anahtar ve sertifika üretilecek; mevcut anahtarlar değiştirilecek. Emin misiniz?",
            confirmLabel: "Üret",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.generateKey({ id, attr: "jwt.credential" });
                    addAlert("Yeni anahtar üretildi.", AlertVariant.success);
                    await loadCert();
                } catch (err) {
                    addError("Anahtar üretilemedi.", err);
                }
            }
        });

    const onImportFile = async (e: any) => {
        const file = e.target.files?.[0];
        if (fileRef.current) fileRef.current.value = "";
        if (!file) return;
        try {
            const formData = new FormData();
            formData.append("keystoreFormat", keystoreFormat);
            formData.append("file", file);
            await adminClient.clients.uploadKey({ id, attr: "jwt.credential" }, formData);
            addAlert("Sertifika içe aktarıldı.", AlertVariant.success);
            await loadCert();
        } catch (err) {
            addError("Sertifika içe aktarılamadı.", err);
        }
    };

    const copyCert = () => {
        navigator.clipboard?.writeText(cert);
        addAlert("Sertifika kopyalandı.", AlertVariant.success);
    };

    return (
        <div className="space-y-7">
            {/* JWKS */}
            <div>
                <GroupLabel>JWKS</GroupLabel>
                <Group>
                    <Row
                        label="JWKS URL kullan"
                        hint="İstemci, imza anahtarlarını bir JWKS uç noktasından sunar."
                    >
                        <Switch checked={useJwksUrl} onCheckedChange={toggleJwks} />
                    </Row>
                    {useJwksUrl && (
                        <StackRow label="JWKS URL">
                            <Input
                                size="sm"
                                value={attrs["jwks.url"] ?? ""}
                                onChange={(e: any) => setAttr("jwks.url", e.target.value)}
                                onBlur={commitJwksUrl}
                                onKeyDown={(e: any) => {
                                    if (e.key === "Enter") e.currentTarget.blur();
                                }}
                                placeholder="https://app.example.com/.well-known/jwks.json"
                            />
                        </StackRow>
                    )}
                </Group>
                <GroupFooter>
                    İmza ve şifreleme anahtarları JWKS uç noktası aracılığıyla
                    yapılandırılabilir.
                </GroupFooter>
            </div>

            {/* Certificate */}
            <div>
                <GroupLabel>İmza Anahtarı Sertifikası</GroupLabel>
                <Group>
                    {loadingCert ? (
                        <div className="flex justify-center py-6">
                            <Spinner className="size-6" />
                        </div>
                    ) : cert ? (
                        <Item size="sm">
                            <ItemContent className="min-w-0">
                                <code className="max-h-32 overflow-y-auto break-all font-mono text-xs">
                                    {cert}
                                </code>
                            </ItemContent>
                            <ItemActions>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={copyCert}
                                    aria-label="Kopyala"
                                >
                                    <CopyIcon />
                                </Button>
                            </ItemActions>
                        </Item>
                    ) : (
                        <EmptyRow>Sertifika yok.</EmptyRow>
                    )}
                    <ActionRow danger onClick={generateKey}>
                        Yeni anahtar üret
                    </ActionRow>
                </Group>
                <GroupFooter>
                    Yeni anahtar üretmek mevcut imza anahtarlarını değiştirir.
                </GroupFooter>
            </div>

            {/* Import */}
            <div>
                <GroupLabel>Sertifika İçe Aktar</GroupLabel>
                <input
                    ref={fileRef}
                    type="file"
                    onChange={onImportFile}
                    className="hidden"
                />
                <Group>
                    <Row label="Arşiv biçimi">
                        <Select value={keystoreFormat} onValueChange={setKeystoreFormat}>
                            <SelectTrigger size="sm" aria-label="Arşiv biçimi">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {KEYSTORE_FORMATS.map(f => (
                                    <SelectItem key={f.value} value={f.value}>
                                        {f.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Row>
                    <ActionRow onClick={() => fileRef.current?.click()}>
                        Dosya seç ve içe aktar
                    </ActionRow>
                </Group>
                <GroupFooter>
                    Bir anahtar deposu veya sertifika dosyası yükleyin.
                </GroupFooter>
            </div>
        </div>
    );
}

/* ── 8. Gelişmiş ────────────────────────────────────────────────────────── */
function AdvancedTab({
    id,
    edited,
    setEdited,
    adminClient,
    addAlert,
    addError,
    reload
}: any) {
    const [saving, setSaving] = useState(false);
    const [flows, setFlows] = useState<any[]>([]);
    const [revoking, setRevoking] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await adminClient.authenticationManagement.getFlows();
                if (alive)
                    setFlows(
                        Array.isArray(res) ? res.filter((f: any) => f?.topLevel) : []
                    );
            } catch (err) {
                addError("Akışlar yüklenemedi.", err);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, addError]);

    if (!edited) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    const attrs = edited.attributes || {};
    const overrides = edited.authenticationFlowBindingOverrides || {};

    const setAttr = (key: string, value: any) =>
        setEdited((e: any) => ({
            ...e,
            attributes: { ...(e.attributes || {}), [key]: value }
        }));
    const setOverride = (key: string, value: any) =>
        setEdited((e: any) => ({
            ...e,
            authenticationFlowBindingOverrides: {
                ...(e.authenticationFlowBindingOverrides || {}),
                [key]: value
            }
        }));

    const save = async () => {
        setSaving(true);
        try {
            await adminClient.clients.update({ id }, edited);
            addAlert("İstemci kaydedildi.", AlertVariant.success);
            await reload();
        } catch (err) {
            addError("İstemci kaydedilemedi.", err);
        } finally {
            setSaving(false);
        }
    };

    const revoke = async () => {
        setRevoking(true);
        try {
            await adminClient.clients.pushRevocation({ id });
            addAlert("Tüm token'lar geçersiz kılındı.", AlertVariant.success);
        } catch (err) {
            addError("Token'lar geçersiz kılınamadı.", err);
        } finally {
            setRevoking(false);
        }
    };

    const ALG_UNSET = "__unset__";
    const algRow = (key: string, label: string) => (
        <Row label={label}>
            <Select
                value={attrs[key] || ALG_UNSET}
                onValueChange={(v: string) => setAttr(key, v === ALG_UNSET ? "" : v)}
            >
                <SelectTrigger size="sm" aria-label={label}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                    {ALG_OPTIONS.map(a => (
                        <SelectItem key={a || ALG_UNSET} value={a || ALG_UNSET}>
                            {a === "" ? "Belirtilmemiş" : a}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Row>
    );

    const FLOW_DEFAULT = "__default__";
    const flowRow = (key: string, label: string) => (
        <Row label={label}>
            <Select
                value={overrides[key] || FLOW_DEFAULT}
                onValueChange={(v: string) =>
                    setOverride(key, v === FLOW_DEFAULT ? "" : v)
                }
            >
                <SelectTrigger size="sm" aria-label={label} className="max-w-52">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value={FLOW_DEFAULT}>Varsayılan</SelectItem>
                    {flows.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                            {f.alias}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Row>
    );

    const numRow = (key: string, label: string) => (
        <Row label={label} hint="saniye">
            <Input
                size="sm"
                type="number"
                value={attrs[key] ?? ""}
                onChange={(e: any) => setAttr(key, e.target.value)}
                placeholder="Varsayılan"
            />
        </Row>
    );

    const switchRow = (key: string, label: string, on: boolean, val: any) => (
        <Row label={label}>
            <Switch checked={on} onCheckedChange={(v: boolean) => setAttr(key, val(v))} />
        </Row>
    );

    return (
        <div className="space-y-7">
            {/* OIDC ince ayar */}
            <div>
                <GroupLabel>OpenID Connect İnce Ayar</GroupLabel>
                <Group>
                    {algRow(
                        "access.token.signed.response.alg",
                        "Access token imza algoritması"
                    )}
                    {algRow("id.token.signed.response.alg", "ID token imza algoritması")}
                    <Row label="PKCE kod doğrulama yöntemi">
                        <Select
                            value={attrs["pkce.code.challenge.method"] || ALG_UNSET}
                            onValueChange={(v: string) =>
                                setAttr(
                                    "pkce.code.challenge.method",
                                    v === ALG_UNSET ? "" : v
                                )
                            }
                        >
                            <SelectTrigger
                                size="sm"
                                aria-label="PKCE kod doğrulama yöntemi"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value={ALG_UNSET}>Belirtilmemiş</SelectItem>
                                <SelectItem value="S256">S256</SelectItem>
                                <SelectItem value="plain">plain</SelectItem>
                            </SelectContent>
                        </Select>
                    </Row>
                    {switchRow(
                        "require.pushed.authorization.requests",
                        "Pushed authorization requests (PAR) zorunlu",
                        (attrs["require.pushed.authorization.requests"] ?? "") === "true",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                </Group>
            </div>

            {/* Gelişmiş ayarlar */}
            <div>
                <GroupLabel>Gelişmiş Ayarlar</GroupLabel>
                <Group>
                    {numRow("access.token.lifespan", "Access token ömrü")}
                    {numRow(
                        "client.session.idle.timeout",
                        "İstemci oturumu boşta zaman aşımı"
                    )}
                    {numRow("client.session.max.lifespan", "İstemci oturumu max ömrü")}
                    {switchRow(
                        "oauth2.device.authorization.grant.enabled",
                        "OAuth 2.0 Device Authorization Grant",
                        (attrs["oauth2.device.authorization.grant.enabled"] ?? "") ===
                            "true",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                    {switchRow(
                        "oidc.ciba.grant.enabled",
                        "OIDC CIBA Grant",
                        (attrs["oidc.ciba.grant.enabled"] ?? "") === "true",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                </Group>
            </div>

            {/* Uyumluluk modları */}
            <div>
                <GroupLabel>OpenID Connect Uyumluluk Modları</GroupLabel>
                <Group>
                    {switchRow(
                        "exclude.session.state.from.auth.response",
                        "Session state'i auth yanıtından hariç tut",
                        (attrs["exclude.session.state.from.auth.response"] ?? "") ===
                            "true",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                    {switchRow(
                        "use.refresh.tokens",
                        "Refresh token kullan",
                        (attrs["use.refresh.tokens"] ?? "") !== "false",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                    {switchRow(
                        "client_credentials.use_refresh_token",
                        "Client credentials grant için refresh token kullan",
                        (attrs["client_credentials.use_refresh_token"] ?? "") === "true",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                    {switchRow(
                        "client.use.lightweight.access.token.enabled",
                        "Lightweight access token kullan",
                        (attrs["client.use.lightweight.access.token.enabled"] ?? "") ===
                            "true",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                </Group>
            </div>

            {/* Akış geçersiz kılmaları */}
            <div>
                <GroupLabel>Kimlik Doğrulama Akışı Geçersiz Kılmaları</GroupLabel>
                <Group>
                    {flowRow("browser", "Tarayıcı akışı")}
                    {flowRow("direct_grant", "Doğrudan erişim akışı")}
                </Group>
            </div>

            {/* Clustering */}
            <div>
                <GroupLabel>Clustering</GroupLabel>
                <Group>
                    <Row label="Düğüm yeniden kayıt zaman aşımı" hint="saniye">
                        <Input
                            size="sm"
                            type="number"
                            placeholder="Varsayılan"
                            value={edited.nodeReRegistrationTimeout ?? ""}
                            onChange={(e: any) =>
                                setEdited((ev: any) => ({
                                    ...ev,
                                    nodeReRegistrationTimeout:
                                        e.target.value === ""
                                            ? undefined
                                            : Number(e.target.value)
                                }))
                            }
                        />
                    </Row>
                </Group>
            </div>

            <ClusterNodes
                id={id}
                nodes={edited.registeredNodes || {}}
                adminClient={adminClient}
                addAlert={addAlert}
                addError={addError}
                reload={reload}
            />

            <div className="flex justify-end">
                <Button
                    disabled={saving}
                    onClick={save}
                >
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>

            {/* Revocation */}
            <div>
                <GroupLabel>İptal (Revocation)</GroupLabel>
                <Group>
                    <ActionRow danger disabled={revoking} onClick={revoke}>
                        {revoking ? "İşleniyor…" : "Tüm token'ları geçersiz kıl"}
                    </ActionRow>
                </Group>
                <GroupFooter>
                    Bu işlem bir "not-before" zaman damgası ayarlar; bu tarihten önce
                    verilmiş tüm token'lar geçersiz sayılır.
                </GroupFooter>
            </div>
        </div>
    );
}

function ClusterNodes({ id, nodes, adminClient, addAlert, addError, reload }: any) {
    const [host, setHost] = useState("");

    const entries = Object.entries(nodes || {});

    const add = async () => {
        const h = host.trim();
        if (!h) return;
        try {
            try {
                await adminClient.clients.addClusterNode({ id }, h);
            } catch {
                await adminClient.clients.addClusterNode({ id, node: h });
            }
            addAlert("Düğüm eklendi.", AlertVariant.success);
            setHost("");
            await reload();
        } catch (err) {
            addError("Düğüm eklenemedi.", err);
        }
    };

    const remove = async (h: string) => {
        try {
            await adminClient.clients.deleteClusterNode({ id, node: h });
            addAlert("Düğüm kaldırıldı.", AlertVariant.success);
            await reload();
        } catch (err) {
            addError("Düğüm kaldırılamadı.", err);
        }
    };

    return (
        <div>
            <GroupLabel>Kayıtlı Küme Düğümleri</GroupLabel>
            <Group>
                {entries.length === 0 ? (
                    <EmptyRow>Kayıtlı düğüm yok.</EmptyRow>
                ) : (
                    entries.map(([h, t]: any) => (
                        <Item key={h} size="sm">
                            <ItemContent className="min-w-0">
                                <ItemTitle>{h}</ItemTitle>
                                <ItemDescription className="tabular-nums">
                                    {fmtDate(t)}
                                </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                                <RowDelete onClick={() => remove(h)} />
                            </ItemActions>
                        </Item>
                    ))
                )}
                <StackRow label="Düğüm ekle">
                    <div className="flex items-center gap-2">
                        <Input
                            size="sm"
                            className="flex-1"
                            value={host}
                            onChange={(e: any) => setHost(e.target.value)}
                            onKeyDown={(e: any) => e.key === "Enter" && add()}
                            placeholder="node-host"
                        />
                        <Button
                            variant="tinted"
                            size="sm"
                            disabled={!host.trim()}
                            onClick={add}
                        >
                            Ekle
                        </Button>
                    </div>
                </StackRow>
            </Group>
        </div>
    );
}

/* ── 9. Olaylar ─────────────────────────────────────────────────────────── */
const evtTone = (type: string) => {
    if (!type) return "blue";
    if (type === "LOGIN") return "green";
    if (/_ERROR$/.test(type)) return "red";
    return "blue";
};
const adminOpTone = (op: string) => {
    switch (op) {
        case "CREATE":
            return "green";
        case "UPDATE":
            return "blue";
        case "DELETE":
            return "red";
        case "ACTION":
            return "amber";
        default:
            return "gray";
    }
};

function ClientEventsTab({ id, clientId, adminClient, realm, addError }: any) {
    const [subTab, setSubTab] = useState("user");

    const [userLoading, setUserLoading] = useState(true);
    const [userFailed, setUserFailed] = useState(false);
    const [userRows, setUserRows] = useState<any[]>([]);

    const [adminLoading, setAdminLoading] = useState(false);
    const [adminFailed, setAdminFailed] = useState(false);
    const [adminRows, setAdminRows] = useState<any[]>([]);
    const [adminLoaded, setAdminLoaded] = useState(false);

    const loadUser = useCallback(async () => {
        setUserLoading(true);
        setUserFailed(false);
        try {
            const events = await adminClient.realms.findEvents({
                realm,
                client: clientId,
                max: 100
            });
            setUserRows(Array.isArray(events) ? events : []);
        } catch (_err) {
            setUserFailed(true);
            setUserRows([]);
        } finally {
            setUserLoading(false);
        }
    }, [adminClient, realm, clientId]);

    const loadAdmin = useCallback(async () => {
        setAdminLoaded(true);
        setAdminLoading(true);
        setAdminFailed(false);
        try {
            const events = await adminClient.realms.findAdminEvents({
                realm,
                resourcePath: `clients/${id}`,
                max: 100
            });
            setAdminRows(Array.isArray(events) ? events : []);
        } catch (_err) {
            setAdminFailed(true);
            setAdminRows([]);
        } finally {
            setAdminLoading(false);
        }
    }, [adminClient, realm, id]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    useEffect(() => {
        if (subTab === "admin" && !adminLoaded) loadAdmin();
    }, [subTab, adminLoaded, loadAdmin]);

    const emptyCard = (desc: string) => (
        <EmptyCard icon={<ClockCounterClockwiseIcon />} title="Olay yok" desc={desc} />
    );

    return (
        <div className="space-y-5">
            <Tabs value={subTab} onValueChange={setSubTab}>
                <TabsList variant="line">
                    {([
                    { key: "user", label: "Kullanıcı olayları" },
                    { key: "admin", label: "Yönetim olayları" }
                ]).map((t: any) => (
                        <TabsTrigger key={t.key} value={t.key}>
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {subTab === "user" &&
                (userLoading ? (
                    <div className="flex justify-center py-16">
                        <Spinner className="size-6" />
                    </div>
                ) : userFailed ? (
                    emptyCard("Olaylar kapalı olabilir.")
                ) : userRows.length === 0 ? (
                    emptyCard("Bu istemci için kayıtlı kullanıcı olayı bulunmuyor.")
                ) : (
                    <Group>
                        {userRows.map((e, i) => (
                            <EventRow
                                key={i}
                                tone={evtTone(e.type)}
                                label={e.type ?? "—"}
                                meta={
                                    e.details?.username ||
                                    e.userId?.slice(0, 8) ||
                                    "Bilinmiyor"
                                }
                                ip={e.ipAddress}
                                time={e.time}
                            />
                        ))}
                    </Group>
                ))}

            {subTab === "admin" &&
                (adminLoading ? (
                    <div className="flex justify-center py-16">
                        <Spinner className="size-6" />
                    </div>
                ) : adminFailed ? (
                    emptyCard("Olaylar kapalı olabilir.")
                ) : adminRows.length === 0 ? (
                    emptyCard("Bu istemci için kayıtlı yönetim olayı bulunmuyor.")
                ) : (
                    <Group>
                        {adminRows.map((e, i) => (
                            <EventRow
                                key={i}
                                tone={adminOpTone(e.operationType)}
                                label={e.operationType ?? "—"}
                                meta={
                                    [e.resourceType, e.resourcePath]
                                        .filter(Boolean)
                                        .join(" ") || "—"
                                }
                                ip={e.authDetails?.ipAddress}
                                time={e.time}
                            />
                        ))}
                    </Group>
                ))}
        </div>
    );
}

const EVT_BADGE: Record<string, any> = {
    blue: "default",
    green: "outline",
    red: "destructive",
    amber: "outline",
    gray: "secondary"
};

function EventRow({ tone, label, meta, ip, time }: any) {
    return (
        <Item size="sm">
            <ItemContent className="min-w-0">
                <ItemTitle>
                    <Badge variant={EVT_BADGE[tone] || EVT_BADGE.gray}>{label}</Badge>
                </ItemTitle>
                <ItemDescription className="truncate">
                    {meta}
                    {ip && (
                        <>
                            {" · "}
                            <span className="font-mono">{ip}</span>
                        </>
                    )}
                </ItemDescription>
            </ItemContent>
            <ItemActions>
                <span className="text-xs text-muted-foreground tabular-nums">
                    {fmtDate(time)}
                </span>
            </ItemActions>
        </Item>
    );
}

/* ── 10. Yönetici İzinleri (fine-grained admin permissions) ─────────────── */
function AdminPermissionsTab({ id, adminClient, addAlert, addError }: any) {
    // Keycloakify'daki gibi feature tespiti: serverInfo.features üzerinden
    // (ClientDetail ServerInfoProvider altında olmadığı için doğrudan çekiyoruz).
    const [features, setFeatures] = useState<any[] | null>(null);
    const [perm, setPerm] = useState<any>(null);
    const [permLoading, setPermLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        adminClient.serverInfo
            .find()
            .then(
                (si: any) =>
                    alive && setFeatures(Array.isArray(si?.features) ? si.features : [])
            )
            .catch(() => alive && setFeatures([]));
        return () => {
            alive = false;
        };
    }, [adminClient]);

    const featureOn = (name: string) =>
        Array.isArray(features) &&
        features.some((f: any) => f?.name === name && f?.enabled);
    const v1On = featureOn("ADMIN_FINE_GRAINED_AUTHZ");
    const v2On = featureOn("ADMIN_FINE_GRAINED_AUTHZ_V2");

    const loadPerm = useCallback(async () => {
        setPermLoading(true);
        try {
            const res = await adminClient.clients.listFineGrainPermissions({ id });
            setPerm(res ?? {});
        } catch (_err) {
            setPerm(null);
        } finally {
            setPermLoading(false);
        }
    }, [adminClient, id]);

    // Per-client yönetim izinleri yalnızca V1'de var.
    useEffect(() => {
        if (v1On) loadPerm();
    }, [v1On, loadPerm]);

    const toggle = async (v: boolean) => {
        setSaving(true);
        try {
            await adminClient.clients.updateFineGrainPermission({ id }, { enabled: v });
            addAlert(
                v
                    ? "İnce taneli yönetici izinleri etkinleştirildi."
                    : "İnce taneli yönetici izinleri devre dışı bırakıldı.",
                AlertVariant.success
            );
            await loadPerm();
        } catch (err) {
            addError("İzin durumu güncellenemedi.", err);
        } finally {
            setSaving(false);
        }
    };

    if (features === null) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    // V2 etkin: izinler realm seviyesinde merkezi olarak yönetilir (per-client toggle yok).
    if (v2On) {
        return (
            <EmptyCard
                icon={<ShieldCheckIcon />}
                title="Admin Permissions (V2) etkin"
                desc="Bu sürümde yönetici izinleri realm seviyesinde yönetilir. Keycloak admin console → Realm Settings → Permissions bölümünden kaynak bazlı izinleri tanımlayın."
            />
        );
    }

    // Hiçbir sürüm açık değil.
    if (!v1On) {
        return (
            <EmptyCard
                icon={<ShieldCheckIcon />}
                title="Bu özellik sunucuda kapalı"
                desc="İnce taneli yönetici izinleri varsayılan olarak kapalıdır. Per-client izinler için sunucuyu --features=admin-fine-grained-authz, yeni sürüm için --features=admin-fine-grained-authz:v2 ile başlatın."
            />
        );
    }

    // V1 etkin → per-client toggle.
    if (permLoading && perm === null) return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    const enabled = !!perm?.enabled;
    const scopePermissions = perm?.scopePermissions || {};
    const scopeEntries = Object.entries(scopePermissions);

    return (
        <div className="space-y-7">
            <div>
                <GroupLabel>Yönetici İzinleri</GroupLabel>
                <Group>
                    <Row
                        label="İnce taneli yönetici izinleri etkin"
                        hint="Bu istemcinin yönetimi için ince taneli yetkilendirme."
                    >
                        <Switch checked={enabled} disabled={saving} onCheckedChange={toggle} />
                    </Row>
                </Group>
            </div>

            {enabled && scopeEntries.length > 0 && (
                <div>
                    <GroupLabel>Kapsam İzinleri</GroupLabel>
                    <Group>
                        {scopeEntries.map(([scope, permId]: any) => (
                            <Item key={scope} size="sm">
                                <ItemContent className="flex-none">
                                    <ItemTitle>{scope}</ItemTitle>
                                </ItemContent>
                                <ItemActions className="min-w-0 flex-1 justify-end">
                                    <code className="truncate font-mono text-xs text-muted-foreground">
                                        {String(permId)}
                                    </code>
                                </ItemActions>
                            </Item>
                        ))}
                    </Group>
                    <GroupFooter>
                        Bu izinler, <span className="font-mono">realm-management</span>{" "}
                        istemcisinin yetkilendirme ayarları altında yönetilir.
                    </GroupFooter>
                </div>
            )}
        </div>
    );
}

/** Simple table: head labels + rows of cells (built on @ui Table). */
function DataTable({ head, rows, empty, cols }: any) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {head.map((h: any, i: number) => (
                        <TableHead key={i} className={cols?.[i]}>
                            {h}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.length === 0 ? (
                    <TableRow>
                        <TableCell
                            colSpan={head.length}
                            className="py-10 text-center text-muted-foreground"
                        >
                            {empty ?? "Kayıt yok."}
                        </TableCell>
                    </TableRow>
                ) : (
                    rows.map((cells: any[], i: number) => (
                        <TableRow key={i}>
                            {cells.map((c: any, j: number) => (
                                <TableCell key={j} className={cols?.[j]}>
                                    {c}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}
