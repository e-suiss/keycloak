// @ts-nocheck

import {
    CaretLeftIcon,
    CheckIcon,
    DotsThreeIcon,
    DownloadSimpleIcon,
    ExportIcon,
    PowerIcon,
    ProhibitIcon,
    StackIcon,
    TrashIcon
} from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
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
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Switch } from "@ui/components/switch";
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
import { Trans } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { ConfigForm } from "../components/ConfigForm";
import { MultiLineInput } from "../components/MultiLineInput";
import {
    AdminPage,
    Chip,
    GROUP,
    Group as ListGroup,
    ListSkeleton,
    Notice,
    Row as ListRow,
    SearchField,
    Section,
    SegmentTabs,
    SEPARATOR,
    TextAction
} from "../ui/kit";
import { useRealm } from "../ui/realm";
import { useT } from "../ui/i18n";
import { i18n } from "../i18n/i18n";
import ClientAuthorization from "./ClientAuthorization";

const lines = (s: string) =>
    (s || "")
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);
const _arr = (v: any) => (Array.isArray(v) ? v.join("\n") : "");
const fmtDate = (v: any) =>
    v
        ? new Date(typeof v === "number" ? v : Number(v) || v).toLocaleString(i18n.language)
        : "—";

export default function ClientDetail() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { id, tab: tabParam } = useParams();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const t = useT();
    const [confirm, confirmNode] = useConfirmDialog();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const tab = tabParam || "settings";
    const setTab = (key: string) => navigate(`/${realm}/clients/${id}/${key}`);

    const [client, setClient] = useState<any>(null);
    const [edited, setEdited] = useState<any>(null);

    const fetchClient = useCallback(async () => {
        const found = await adminClient.clients.findOne({ id });
        setClient(found ?? null);
        setEdited(found ? JSON.parse(JSON.stringify(found)) : null);
        return found;
    }, [adminClient, id]);

    const loadClient = useCallback(async () => {
        try {
            return await fetchClient();
        } catch (err) {
            addError(t("sxClientDetailLoadFailed"), err);
            return null;
        }
    }, [fetchClient, addError, t]);

    const fetchClientRef = useRef(fetchClient);
    fetchClientRef.current = fetchClient;

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setLoadError(false);
            try {
                await fetchClientRef.current();
            } catch {
                if (alive) setLoadError(true);
            }
            if (alive) setLoading(false);
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, id, attempt]);

    const handleDelete = () =>
        confirm({
            title: t("sxClientDetailDeleteTitle"),
            message: t("sxClientDetailDeleteMessage", { name: client?.clientId ?? id }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.del({ id });
                    addAlert(t("sxClientDetailDeleted"), AlertVariant.success);
                    navigate(`/${realm}/clients`);
                } catch (err) {
                    addError(t("sxClientDetailDeleteFailed"), err);
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
                    ? t("sxClientDetailDisabledToast")
                    : t("sxClientDetailEnabledToast"),
                AlertVariant.success
            );
            await loadClient();
        } catch (err) {
            addError(t("sxClientDetailToggleFailed"), err);
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
            addAlert(t("sxClientDetailExported"), AlertVariant.success);
        } catch (err) {
            addError(t("sxClientDetailExportFailed"), err);
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
            addAlert(t("sxClientDetailAdapterDownloaded"), AlertVariant.success);
        } catch (err) {
            addError(t("sxClientDetailAdapterDownloadFailed"), err);
        }
    };

    const back = { label: t("sxNavClients"), to: `/${realm}/clients` };

    if (loading) {
        return (
            <AdminPage width="wide" title={t("sxClientDetailTitle")} back={back}>
                <ListSkeleton rows={4} />
            </AdminPage>
        );
    }

    if (loadError) {
        return (
            <AdminPage width="wide" title={t("sxClientDetailTitle")} back={back}>
                <Notice
                    title={t("sxClientDetailLoadErrorTitle")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            </AdminPage>
        );
    }

    if (!client) {
        return (
            <AdminPage width="wide" title={t("sxClientDetailTitle")} back={back}>
                <Notice
                    title={t("sxClientDetailNotFoundTitle")}
                    description={t("sxClientDetailNotFoundDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            </AdminPage>
        );
    }

    const protocol = client.protocol || "openid-connect";
    const oidc = protocol === "openid-connect";

    const tabs = [
        { key: "settings", label: t("sxClientDetailTabSettings") },
        ...(!client.publicClient
            ? [{ key: "credentials", label: t("sxClientDetailTabCredentials") }]
            : []),
        { key: "roles", label: t("sxClientDetailTabRoles") },
        { key: "scopes", label: t("sxNavClientScopes") },
        ...(client.authorizationServicesEnabled
            ? [{ key: "authz", label: t("sxClientDetailTabAuthorization") }]
            : []),
        ...(client.serviceAccountsEnabled
            ? [{ key: "service", label: t("sxClientDetailTabServiceAccount") }]
            : []),
        { key: "sessions", label: t("sxNavSessions") },
        ...(oidc ? [{ key: "keys", label: t("sxClientDetailTabKeys") }] : []),
        { key: "advanced", label: t("sxClientDetailTabAdvanced") },
        { key: "events", label: t("sxNavEvents") },
        { key: "adminperm", label: t("sxNavAdminPermissions") }
    ];

    const isSaml = client.protocol === "saml";
    const protocolName = isSaml ? "SAML" : "OpenID Connect";
    const title = client.clientId || client.name || id;

    return (
        <>
            <AdminPage
                width="wide"
                title={title}
                back={back}
                description={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <span className="[overflow-wrap:anywhere]">
                            {[client.name && client.name !== title && !/^\$\{.*\}$/.test(client.name) ? client.name : null, protocolName]
                                .filter(Boolean)
                                .join(" · ")}
                        </span>
                        {!client.enabled && <Chip tone="danger">{t("sxCommonDisabled")}</Chip>}
                    </span>
                }
                actions={
                    <ActionsMenu
                        enabled={!!client.enabled}
                        onToggleEnabled={toggleEnabled}
                        onExport={exportClient}
                        onAdapterConfig={downloadAdapterConfig}
                        onDelete={handleDelete}
                    />
                }
            >
                <SegmentTabs
                    ariaLabel={t("sxClientDetailSectionAria")}
                    value={tab}
                    onChange={setTab}
                    items={tabs.map(item => ({ value: item.key, label: item.label }))}
                />

                <div className="flex min-w-0 flex-col gap-6">
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
            </AdminPage>
            {confirmNode}
        </>
    );
}

function useConfirmDialog() {
    const t = useT();
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
                    <ConfirmCancel>{t("sxCommonCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={state?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = state?.onConfirm;
                            setOpen(false);
                            fn?.();
                        }}
                    >
                        {state?.confirmLabel ?? t("sxCommonConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}

const DANGER_BUTTON =
    "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";
const FIELD_CARD = `${GROUP} flex flex-col gap-4 p-4`;

function flattenRows(children: any, prefix = ""): any[] {
    return Children.toArray(children).flatMap((c: any) =>
        isValidElement(c) && c.type === Fragment
            ? flattenRows((c.props as any).children, `${prefix}${c.key}/`)
            : [prefix && isValidElement(c) ? cloneElement(c, { key: prefix + c.key }) : c]
    );
}

function Stack({ children, className }: any) {
    return <div className={cn("flex flex-col gap-3", className)}>{children}</div>;
}

function FieldCard({ children, className }: any) {
    return <div className={cn(FIELD_CARD, className)}>{children}</div>;
}

function GroupFooter({ children }: any) {
    return (
        <p className="mt-2 px-0.5 text-[13px] leading-[1.4] text-muted-foreground">
            {children}
        </p>
    );
}

function Group({ children, className }: any) {
    const rows = flattenRows(children).filter(Boolean);
    return (
        <div className={cn(GROUP, className)}>
            {rows.map((row: any, i: number) => (
                <Fragment key={row?.key ?? i}>
                    {i > 0 && <div aria-hidden className={SEPARATOR} />}
                    {row}
                </Fragment>
            ))}
        </div>
    );
}

function RowText({ label, hint }: any) {
    return (
        <div className="min-w-0">
            <div className="text-[15px] font-medium [overflow-wrap:anywhere]">{label}</div>
            {hint && (
                <div className="mt-0.5 text-[13px] leading-[1.4] text-muted-foreground [overflow-wrap:anywhere]">
                    {hint}
                </div>
            )}
        </div>
    );
}

function Row({ label, hint, children }: any) {
    return (
        <div className="flex min-h-14 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <RowText label={label} hint={hint} />
            <div className="flex min-w-0 items-center sm:max-w-[60%] sm:shrink-0 sm:justify-end [&>*]:max-w-full">
                {children}
            </div>
        </div>
    );
}

function ValueRow({ label, children }: any) {
    return (
        <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-3">
            <span className="shrink-0 text-[15px] font-medium">{label}</span>
            <span className="min-w-0 truncate text-[15px] text-muted-foreground">{children}</span>
        </div>
    );
}

function StackRow({ label, hint, children }: any) {
    return (
        <div className="flex flex-col gap-2 px-4 py-3">
            {(label || hint) && <RowText label={label} hint={hint} />}
            <div className="min-w-0">{children}</div>
        </div>
    );
}

function SwitchRow({ label, hint, checked, onChange, disabled }: any) {
    return (
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
            <RowText label={label} hint={hint} />
            <Switch
                checked={!!checked}
                disabled={disabled}
                aria-label={typeof label === "string" ? label : undefined}
                onCheckedChange={(v: boolean) => onChange(v)}
                className="shrink-0"
            />
        </div>
    );
}

function ActionRow({ onClick, disabled, danger, children }: any) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex min-h-12 w-full items-center px-4 py-3 text-left text-[15px] font-medium outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/4 dark:focus-visible:bg-white/6",
                danger ? "text-[#d70015] dark:text-[#ff453a]" : "text-primary"
            )}
        >
            {children}
        </button>
    );
}

function RowDelete({ onClick, title }: any) {
    const t = useT();
    return (
        <TextAction tone="danger" onClick={onClick}>
            {title ?? t("sxCommonDelete")}
        </TextAction>
    );
}

function ItemRow({ title, subtitle, leading, trailing, onClick }: any) {
    const body = (
        <>
            {leading && <span className="grid size-10 shrink-0 place-items-center">{leading}</span>}
            <div className="min-w-0">
                <div className="truncate text-base font-medium">{title}</div>
                {subtitle && (
                    <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                        {subtitle}
                    </div>
                )}
            </div>
        </>
    );
    return (
        <div className="flex min-h-16 items-center gap-3 pe-4">
            {onClick ? (
                <button
                    type="button"
                    onClick={onClick}
                    className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-3 ps-4 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
                >
                    {body}
                </button>
            ) : (
                <div className="flex min-w-0 flex-1 items-center gap-3 py-3 ps-4">{body}</div>
            )}
            {trailing && <div className="flex shrink-0 items-center gap-4">{trailing}</div>}
        </div>
    );
}

function SelectRow({ title, subtitle, selected, onToggle }: any) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            onClick={onToggle}
            className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
        >
            <div className="min-w-0">
                <div className="truncate text-[15px] font-medium">{title}</div>
                {subtitle && (
                    <div className="mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</div>
                )}
            </div>
            {selected && <CheckIcon weight="bold" className="size-4 shrink-0 text-primary" />}
        </button>
    );
}

function EmptyCard({ title, desc, action }: any) {
    return <Notice title={title} description={desc} action={action} />;
}

function EmptyRow({ children }: any) {
    return (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{children}</div>
    );
}

function CopyRow({ value, label, onCopy }: any) {
    const t = useT();
    return (
        <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
                {label && <div className="text-[13px] text-muted-foreground">{label}</div>}
                <code className="block font-mono text-sm [overflow-wrap:anywhere]">{value || "—"}</code>
            </div>
            <TextAction onClick={onCopy} disabled={!value}>
                {t("sxCommonCopy")}
            </TextAction>
        </div>
    );
}

function SaveBar({ children }: any) {
    return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}

function SubBack({ onClick, children }: any) {
    return (
        <TextAction onClick={onClick} className="inline-flex items-center gap-1 self-start">
            <CaretLeftIcon className="size-3.5" />
            {children}
        </TextAction>
    );
}

function ActionsMenu({
    enabled,
    onToggleEnabled,
    onExport,
    onAdapterConfig,
    onDelete
}: any) {
    const t = useT();
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" aria-label={t("sxCommonActions")} title={t("sxCommonActions")}>
                    <DotsThreeIcon weight="bold" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={onToggleEnabled}>
                    {enabled ? <ProhibitIcon /> : <PowerIcon />}
                    {enabled ? t("sxCommonDisable") : t("sxCommonEnable")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport}>
                    <ExportIcon />
                    {t("sxCommonExport")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAdapterConfig}>
                    <DownloadSimpleIcon />
                    {t("sxClientDetailDownloadAdapter")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                    <TrashIcon />
                    {t("sxCommonDelete")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

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
    const t = useT();
    const [saving, setSaving] = useState(false);
    const [loginThemes, setLoginThemes] = useState<string[]>([]);
    const [themesState, setThemesState] = useState<"loading" | "ready" | "error">("loading");
    const [themesAttempt, setThemesAttempt] = useState(0);
    useEffect(() => {
        let alive = true;
        setThemesState("loading");
        adminClient.serverInfo
            .find()
            .then((si: any) => {
                if (!alive) return;
                setLoginThemes(
                    (si?.themes?.login || []).map((x: any) => x.name).filter(Boolean)
                );
                setThemesState("ready");
            })
            .catch(() => {
                if (alive) setThemesState("error");
            });
        return () => {
            alive = false;
        };
    }, [adminClient, themesAttempt]);
    if (!edited) return <ListSkeleton />;

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
            addAlert(t("sxClientDetailSaved"), AlertVariant.success);
            await reload();
        } catch (err) {
            addError(t("sxClientDetailSaveFailed"), err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <Section label={t("sxNavGeneral")}>
                <Stack>
                    <Group>
                        <ValueRow label={t("sxClientDetailClientId")}>{client.clientId ?? ""}</ValueRow>
                        <ValueRow label={t("sxClientDetailProtocol")}>
                            {protocol === "saml" ? "SAML" : "OpenID Connect"}
                        </ValueRow>
                    </Group>
                    <FieldCard>
                        <Field size="lg">
                            <FieldLabel>{t("sxCommonName")}</FieldLabel>
                            <Input
                                size="lg"
                                value={edited.name ?? ""}
                                onChange={(e: any) => set("name", e.target.value)}
                                placeholder="—"
                            />
                        </Field>
                        <Field size="lg">
                            <FieldLabel>{t("sxCommonDescription")}</FieldLabel>
                            <Textarea
                                size="lg"
                                value={edited.description ?? ""}
                                onChange={(e: any) => set("description", e.target.value)}
                                placeholder="—"
                            />
                        </Field>
                    </FieldCard>
                    <Group>
                        <SwitchRow
                            label={t("sxClientDetailAlwaysDisplay")}
                            checked={edited.alwaysDisplayInConsole}
                            onChange={(v: boolean) => set("alwaysDisplayInConsole", v)}
                        />
                    </Group>
                </Stack>
            </Section>

            <Section label={t("sxClientDetailAccessSettings")}>
                <FieldCard>
                    <Field size="lg">
                        <FieldLabel>{t("sxClientDetailRootUrl")}</FieldLabel>
                        <Input
                            size="lg"
                            value={edited.rootUrl ?? ""}
                            onChange={e => set("rootUrl", e.target.value)}
                            placeholder="https://app.example.com"
                        />
                        <FieldDescription>{t("sxClientDetailRootUrlHelp")}</FieldDescription>
                    </Field>
                    <Field size="lg">
                        <FieldLabel>{t("sxClientDetailHomeUrl")}</FieldLabel>
                        <Input
                            size="lg"
                            value={edited.baseUrl ?? ""}
                            onChange={e => set("baseUrl", e.target.value)}
                            placeholder="/"
                        />
                        <FieldDescription>{t("sxClientDetailHomeUrlHelp")}</FieldDescription>
                    </Field>
                    {(edited.standardFlowEnabled || edited.implicitFlowEnabled) && (
                        <>
                            <Field size="lg">
                                <FieldLabel>{t("sxClientDetailRedirectUris")}</FieldLabel>
                                <MultiLineInput
                                    value={edited.redirectUris || []}
                                    onChange={(v: string[]) => set("redirectUris", v)}
                                    addLabel={t("sxClientDetailAddRedirectUri")}
                                    placeholder="https://app.example.com/*"
                                />
                                <FieldDescription>{t("sxClientDetailRedirectUrisHelp")}</FieldDescription>
                            </Field>
                            <Field size="lg">
                                <FieldLabel>{t("sxClientDetailPostLogoutUris")}</FieldLabel>
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
                                    addLabel={t("sxClientDetailAddPostLogoutUri")}
                                    placeholder="+"
                                />
                                <FieldDescription>{t("sxClientDetailPostLogoutUrisHelp")}</FieldDescription>
                            </Field>
                        </>
                    )}
                    <Field size="lg">
                        <FieldLabel>{t("sxClientDetailAdminUrl")}</FieldLabel>
                        <Input
                            size="lg"
                            value={edited.adminUrl ?? ""}
                            onChange={e => set("adminUrl", e.target.value)}
                        />
                    </Field>
                    {protocol !== "saml" && edited.standardFlowEnabled && (
                        <Field size="lg">
                            <FieldLabel>{t("sxClientDetailWebOrigins")}</FieldLabel>
                            <MultiLineInput
                                value={edited.webOrigins || []}
                                onChange={(v: string[]) => set("webOrigins", v)}
                                addLabel={t("sxClientDetailAddWebOrigin")}
                                placeholder="+"
                            />
                            <FieldDescription>{t("sxClientDetailWebOriginsHelp")}</FieldDescription>
                        </Field>
                    )}
                </FieldCard>
            </Section>

            {oidc && (
                <Section label={t("sxClientDetailCapabilityConfig")}>
                    <Group>
                        <SwitchRow
                            label={t("sxClientDetailClientAuthentication")}
                            hint={t("sxClientDetailClientAuthenticationHint")}
                            checked={!edited.publicClient}
                            onChange={(v: boolean) =>
                                setEdited((e: any) => ({
                                    ...e,
                                    publicClient: !v,
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
                            label={t("sxClientDetailStandardFlow")}
                            checked={edited.standardFlowEnabled}
                            onChange={(v: boolean) => set("standardFlowEnabled", v)}
                        />
                        <SwitchRow
                            label={t("sxClientDetailDirectAccessGrants")}
                            checked={edited.directAccessGrantsEnabled}
                            onChange={(v: boolean) => set("directAccessGrantsEnabled", v)}
                        />
                        <SwitchRow
                            label={t("sxClientDetailImplicitFlow")}
                            checked={edited.implicitFlowEnabled}
                            onChange={(v: boolean) => set("implicitFlowEnabled", v)}
                        />
                        {!edited.publicClient && (
                            <SwitchRow
                                label={t("sxClientDetailServiceAccountsRoles")}
                                checked={edited.serviceAccountsEnabled}
                                onChange={(v: boolean) =>
                                    set("serviceAccountsEnabled", v)
                                }
                            />
                        )}
                        {!edited.publicClient && (
                            <SwitchRow
                                label={t("sxClientDetailTabAuthorization")}
                                hint={t("sxClientDetailAuthorizationHint")}
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
                </Section>
            )}

            <Section label={t("sxClientDetailLoginSettings")}>
                <Stack>
                    <Group>
                        <SwitchRow
                            label={t("sxClientDetailConsentRequired")}
                            checked={edited.consentRequired}
                            onChange={(v: boolean) => set("consentRequired", v)}
                        />
                        {edited.consentRequired && (
                            <SwitchRow
                                label={t("sxClientDetailDisplayOnConsent")}
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
                    <FieldCard>
                        {edited.consentRequired && (
                            <Field size="lg">
                                <FieldLabel>{t("sxClientDetailConsentText")}</FieldLabel>
                                <Textarea
                                    size="lg"
                                    value={edited.attributes?.["consent.screen.text"] ?? ""}
                                    onChange={e =>
                                        setAttr("consent.screen.text", e.target.value)
                                    }
                                />
                            </Field>
                        )}
                        <Field size="lg">
                            <FieldLabel>{t("sxClientDetailLoginTheme")}</FieldLabel>
                            <Select
                                value={edited.loginTheme || "__default__"}
                                onValueChange={(v: string) =>
                                    set("loginTheme", v === "__default__" ? "" : v)
                                }
                            >
                                <SelectTrigger size="lg" className="w-full" aria-label={t("sxClientDetailLoginTheme")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    <SelectItem value="__default__">{t("sxCommonDefault")}</SelectItem>
                                    {loginThemes.map(theme => (
                                        <SelectItem key={theme} value={theme}>
                                            {theme}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {themesState === "loading" && (
                                <FieldDescription>{t("sxClientDetailThemesLoading")}</FieldDescription>
                            )}
                            {themesState === "error" && (
                                <FieldDescription>
                                    {t("sxClientDetailThemesError")}{" "}
                                    <TextAction onClick={() => setThemesAttempt(n => n + 1)}>
                                        {t("sxRetry")}
                                    </TextAction>
                                </FieldDescription>
                            )}
                        </Field>
                    </FieldCard>
                </Stack>
            </Section>

            <Section label={t("sxClientDetailLogoutSettings")}>
                <Stack>
                    <Group>
                        <SwitchRow
                            label={t("sxClientDetailFrontchannelLogout")}
                            hint={t("sxClientDetailFrontchannelLogoutHint")}
                            checked={!!edited.frontchannelLogout}
                            onChange={(v: boolean) => set("frontchannelLogout", v)}
                        />
                        {edited.frontchannelLogout ? (
                            <SwitchRow
                                label={t("sxClientDetailFrontchannelSessionRequired")}
                                hint={t("sxClientDetailFrontchannelSessionRequiredHint")}
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
                        ) : (
                            <>
                                <SwitchRow
                                    label={t("sxClientDetailBackchannelSessionRequired")}
                                    hint={t("sxClientDetailBackchannelSessionRequiredHint")}
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
                                    label={t("sxClientDetailBackchannelRevokeOffline")}
                                    hint={t("sxClientDetailBackchannelRevokeOfflineHint")}
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
                            </>
                        )}
                        <SwitchRow
                            label={t("sxClientDetailLogoutConfirmation")}
                            hint={t("sxClientDetailLogoutConfirmationHint")}
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
                    <FieldCard>
                        {edited.frontchannelLogout ? (
                            <Field size="lg">
                                <FieldLabel>{t("sxClientDetailFrontchannelLogoutUrl")}</FieldLabel>
                                <Input
                                    size="lg"
                                    value={
                                        edited.attributes?.["frontchannel.logout.url"] ??
                                        ""
                                    }
                                    onChange={e =>
                                        setAttr("frontchannel.logout.url", e.target.value)
                                    }
                                    placeholder="https://app.example.com/logout"
                                />
                                <FieldDescription>{t("sxClientDetailFrontchannelLogoutUrlHelp")}</FieldDescription>
                            </Field>
                        ) : (
                            <Field size="lg">
                                <FieldLabel>{t("sxClientDetailBackchannelLogoutUrl")}</FieldLabel>
                                <Input
                                    size="lg"
                                    value={
                                        edited.attributes?.["backchannel.logout.url"] ??
                                        ""
                                    }
                                    onChange={e =>
                                        setAttr("backchannel.logout.url", e.target.value)
                                    }
                                    placeholder="https://app.example.com/backchannel-logout"
                                />
                                <FieldDescription>{t("sxClientDetailBackchannelLogoutUrlHelp")}</FieldDescription>
                            </Field>
                        )}
                    </FieldCard>
                </Stack>
            </Section>

            <SaveBar>
                <Button size="form" disabled={saving} onClick={save}>
                    {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                </Button>
            </SaveBar>
        </div>
    );
}

const AUTHENTICATOR_OPTIONS = [
    { value: "client-secret", label: "sxClientDetailAuthClientSecret" },
    { value: "client-jwt", label: "sxClientDetailAuthSignedJwt" },
    { value: "client-secret-jwt", label: "sxClientDetailAuthSignedJwtSecret" },
    { value: "client-x509", label: "sxClientDetailAuthX509" }
];

const ANY_ALG = "__any";

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
    const t = useT();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [secret, setSecret] = useState("");
    const [savingAuth, setSavingAuth] = useState(false);
    const [savingCfg, setSavingCfg] = useState(false);
    const [regToken, setRegToken] = useState("");
    const [genningToken, setGenningToken] = useState(false);

    const authenticatorType = client?.clientAuthenticatorType || "client-secret";

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
            addAlert(t("sxClientDetailConfigSaved"), AlertVariant.success);
            await reload();
        } catch (err) {
            addError(t("sxClientDetailConfigSaveFailed"), err);
        } finally {
            setSavingCfg(false);
        }
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setFailed(false);
            try {
                const res = await adminClient.clients.getClientSecret({ id });
                if (alive) setSecret(res?.value ?? "");
            } catch {
                if (alive) setFailed(true);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, id, attempt]);

    const regenerate = async () => {
        try {
            const res = await adminClient.clients.generateNewClientSecret({ id });
            setSecret(res?.value ?? "");
            addAlert(t("sxClientDetailSecretRegenerated"), AlertVariant.success);
        } catch (err) {
            addError(t("sxClientDetailSecretRegenerateFailed"), err);
        }
    };

    const copy = () => {
        navigator.clipboard?.writeText(secret);
        addAlert(t("sxClientDetailSecretCopied"), AlertVariant.success);
    };

    const changeAuthenticator = async (value: string) => {
        setSavingAuth(true);
        try {
            await adminClient.clients.update(
                { id },
                { ...client, clientAuthenticatorType: value }
            );
            addAlert(t("sxClientDetailAuthenticatorUpdated"), AlertVariant.success);
            await reload();
        } catch (err) {
            addError(t("sxClientDetailAuthenticatorUpdateFailed"), err);
        } finally {
            setSavingAuth(false);
        }
    };

    const generateRegToken = async () => {
        setGenningToken(true);
        try {
            const res = await adminClient.clients.generateRegistrationAccessToken({ id });
            setRegToken(res?.registrationAccessToken ?? "");
            addAlert(t("sxClientDetailRegTokenCreated"), AlertVariant.success);
        } catch (err) {
            addError(t("sxClientDetailRegTokenCreateFailed"), err);
        } finally {
            setGenningToken(false);
        }
    };

    const copyRegToken = () => {
        navigator.clipboard?.writeText(regToken);
        addAlert(t("sxClientDetailTokenCopied"), AlertVariant.success);
    };

    if (loading) return <ListSkeleton />;

    return (
        <div className="flex flex-col gap-6">
            <Section label={t("sxClientDetailClientAuthenticator")}>
                <FieldCard>
                    <Field size="lg">
                        <FieldLabel>{t("sxClientDetailMethod")}</FieldLabel>
                        <Select
                            value={authenticatorType}
                            disabled={savingAuth}
                            onValueChange={changeAuthenticator}
                        >
                            <SelectTrigger size="lg" className="w-full" aria-label={t("sxClientDetailClientAuthenticator")}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="start">
                                {AUTHENTICATOR_OPTIONS.map(o => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {t(o.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </FieldCard>
                <GroupFooter>{t("sxClientDetailAuthenticatorHelp")}</GroupFooter>
            </Section>

            {authenticatorType === "client-secret" && (
                <Section label={t("sxClientDetailClientSecret")}>
                    {failed ? (
                        <Notice
                            title={t("sxClientDetailSecretLoadErrorTitle")}
                            description={t("sxLoadErrorDescription")}
                            onRetry={() => setAttempt(n => n + 1)}
                        />
                    ) : (
                        <Group>
                            <CopyRow value={secret} onCopy={copy} />
                            <ActionRow onClick={regenerate}>{t("sxClientDetailRegenerate")}</ActionRow>
                        </Group>
                    )}
                    <GroupFooter>{t("sxClientDetailClientSecretHelp")}</GroupFooter>
                </Section>
            )}

            {authenticatorType === "client-jwt" && (
                <Section label={t("sxClientDetailAuthSignedJwt")}>
                    <Stack>
                        <FieldCard>
                            <Field size="lg">
                                <FieldLabel>{t("sxClientDetailSignatureAlgorithm")}</FieldLabel>
                                <Select
                                    value={attrs["token.endpoint.auth.signing.alg"] || ANY_ALG}
                                    onValueChange={(v: string) =>
                                        setAttr("token.endpoint.auth.signing.alg", v === ANY_ALG ? "" : v)
                                    }
                                >
                                    <SelectTrigger size="lg" className="w-full" aria-label={t("sxClientDetailSignatureAlgorithm")}>
                                        <SelectValue placeholder={t("sxClientDetailAnyAlgorithm")} />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        {SIGNING_ALG_OPTIONS.map(a => (
                                            <SelectItem key={a || ANY_ALG} value={a || ANY_ALG}>
                                                {a || t("sxClientDetailAnyAlgorithm")}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldDescription>{t("sxClientDetailAnyAlgorithmHelp")}</FieldDescription>
                            </Field>
                            <Field size="lg">
                                <FieldLabel>{t("sxClientDetailMaxTokenExp")}</FieldLabel>
                                <Input
                                    size="lg"
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
                                <FieldDescription>{t("sxClientDetailMaxTokenExpHelp")}</FieldDescription>
                            </Field>
                        </FieldCard>
                        <SaveBar>
                            <Button size="form" onClick={saveAttrs} disabled={savingCfg}>
                                {savingCfg ? t("sxCommonSaving") : t("sxCommonSave")}
                            </Button>
                        </SaveBar>
                    </Stack>
                    <GroupFooter>{t("sxClientDetailJwtFooter")}</GroupFooter>
                </Section>
            )}

            {authenticatorType === "client-x509" && (
                <Section label={t("sxClientDetailAuthX509")}>
                    <Stack>
                        <Group>
                            <SwitchRow
                                label={t("sxClientDetailAllowRegex")}
                                hint={t("sxClientDetailAllowRegexHint")}
                                checked={
                                    (attrs["x509.allow.regex.pattern.comparison"] ??
                                        "") === "true"
                                }
                                onChange={(v: boolean) =>
                                    setAttr(
                                        "x509.allow.regex.pattern.comparison",
                                        v ? "true" : "false"
                                    )
                                }
                            />
                        </Group>
                        <FieldCard>
                            <Field size="lg">
                                <FieldLabel>Subject DN</FieldLabel>
                                <Input
                                    size="lg"
                                    value={attrs["x509.subjectdn"] ?? ""}
                                    onChange={(e: any) =>
                                        setAttr("x509.subjectdn", e.target.value)
                                    }
                                    placeholder="CN=client, O=org"
                                />
                                <FieldDescription>{t("sxClientDetailSubjectDnHelp")}</FieldDescription>
                            </Field>
                        </FieldCard>
                        <SaveBar>
                            <Button size="form" onClick={saveAttrs} disabled={savingCfg}>
                                {savingCfg ? t("sxCommonSaving") : t("sxCommonSave")}
                            </Button>
                        </SaveBar>
                    </Stack>
                    <GroupFooter>{t("sxClientDetailX509Footer")}</GroupFooter>
                </Section>
            )}

            <Section label={t("sxClientDetailRegToken")}>
                <Group>
                    {regToken && <CopyRow value={regToken} onCopy={copyRegToken} />}
                    <ActionRow onClick={generateRegToken} disabled={genningToken}>
                        {genningToken ? t("sxCommonGenerating") : t("sxClientDetailGenerateNew")}
                    </ActionRow>
                </Group>
                <GroupFooter>{t("sxClientDetailRegTokenHelp")}</GroupFooter>
            </Section>
        </div>
    );
}

function RolesTab({ id, adminClient, addAlert, addError, confirm }: any) {
    const t = useT();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [roles, setRoles] = useState<any[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [detailRole, setDetailRole] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const list = await adminClient.clients.listRoles({ id });
            setRoles(list ?? []);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = (role: any) =>
        confirm({
            title: t("sxClientDetailDeleteRoleTitle"),
            message: t("sxClientDetailDeleteRoleMessage", { name: role.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.roles.delById({ id: role.id });
                    addAlert(t("sxClientDetailRoleDeleted"), AlertVariant.success);
                    await load();
                } catch (err) {
                    addError(t("sxClientDetailRoleDeleteFailed"), err);
                }
            }
        });

    return (
        <Section
            label={t("sxClientDetailClientRoles")}
            action={<TextAction onClick={() => setCreateOpen(true)}>{t("sxClientDetailCreateRole")}</TextAction>}
        >
            {loading ? (
                <ListSkeleton />
            ) : failed ? (
                <Notice
                    title={t("sxClientDetailRolesLoadErrorTitle")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={load}
                />
            ) : roles.length === 0 ? (
                <EmptyCard
                    title={t("sxClientDetailNoRolesTitle")}
                    desc={t("sxClientDetailNoRolesDescription")}
                    action={
                        <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                            {t("sxClientDetailCreateRole")}
                        </Button>
                    }
                />
            ) : (
                <Group>
                    {roles.map(r => (
                        <ItemRow
                            key={r.id}
                            title={r.name}
                            subtitle={r.description}
                            onClick={() => setDetailRole(r)}
                            trailing={<RowDelete onClick={() => remove(r)} />}
                        />
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
        </Section>
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
    const t = useT();
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
    const [compFailed, setCompFailed] = useState(false);

    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [usersFailed, setUsersFailed] = useState(false);

    const loadComposites = useCallback(async () => {
        setLoadingComp(true);
        setCompFailed(false);
        try {
            const [comp, realm] = await Promise.all([
                adminClient.roles.getCompositeRoles({ id: role.id }),
                adminClient.roles.find()
            ]);
            setComposites(Array.isArray(comp) ? comp : []);
            setRealmRoles(Array.isArray(realm) ? realm : []);
        } catch {
            setCompFailed(true);
        } finally {
            setLoadingComp(false);
        }
    }, [adminClient, role.id]);

    const loadUsers = useCallback(async () => {
        setLoadingUsers(true);
        setUsersFailed(false);
        try {
            const list = await adminClient.clients.findUsersWithRole({
                id: clientId,
                roleName: role.name
            });
            setUsers(Array.isArray(list) ? list : []);
        } catch {
            setUsersFailed(true);
        } finally {
            setLoadingUsers(false);
        }
    }, [adminClient, clientId, role.name]);

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
            addAlert(t("sxClientDetailRoleSaved"), AlertVariant.success);
            await onSaved();
        } catch (err) {
            addError(t("sxClientDetailRoleSaveFailed"), err);
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
            addAlert(t("sxClientDetailCompositeAdded"), AlertVariant.success);
            setRoleToAdd("");
            await loadComposites();
        } catch (err) {
            addError(t("sxClientDetailCompositeAddFailed"), err);
        }
    };

    const removeComposite = async (r: any) => {
        try {
            await adminClient.roles.delComposite({ id: role.id }, [r]);
            addAlert(t("sxClientDetailCompositeRemoved"), AlertVariant.success);
            await loadComposites();
        } catch (err) {
            addError(t("sxClientDetailCompositeRemoveFailed"), err);
        }
    };

    const subTabs = [
        { key: "settings", label: t("sxClientDetailTabSettings") },
        { key: "attributes", label: t("sxClientDetailAttributes") },
        { key: "composites", label: t("sxClientDetailAssociatedRoles") },
        { key: "users", label: t("sxNavUsers") }
    ];

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle className="[overflow-wrap:anywhere]">{role.name}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div className="min-w-0 overflow-hidden">
                            <SegmentTabs
                                ariaLabel={t("sxClientDetailRoleSectionsAria")}
                                value={subTab}
                                onChange={setSubTab}
                                items={subTabs.map((item: any) => ({ value: item.key, label: item.label }))}
                            />
                        </div>

                        {subTab === "settings" && (
                            <div className="flex flex-col gap-4">
                                <Field size="lg">
                                    <FieldLabel>{t("sxCommonName")}</FieldLabel>
                                    <Input size="lg" value={name} onChange={e => setName(e.target.value)} />
                                </Field>
                                <Field size="lg">
                                    <FieldLabel>{t("sxCommonDescription")}</FieldLabel>
                                    <Textarea
                                        size="lg"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                </Field>
                            </div>
                        )}

                        {subTab === "attributes" && (
                            <div className="flex flex-col gap-3">
                                {attrRows.length === 0 && (
                                    <Notice
                                        title={t("sxClientDetailNoAttributesTitle")}
                                        description={t("sxClientDetailNoAttributesDescription")}
                                    />
                                )}
                                {attrRows.map((row, i) => (
                                    <div
                                        key={i}
                                        className="flex flex-col gap-2 border-b border-[#e5e5ea] pb-3 sm:flex-row sm:items-center sm:border-0 sm:pb-0 dark:border-[#38383a]"
                                    >
                                        <Input
                                            className="min-w-0 sm:flex-1"
                                            value={row.key}
                                            placeholder={t("sxCommonKey")}
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
                                            className="min-w-0 sm:flex-1"
                                            value={row.value}
                                            placeholder={t("sxClientDetailValueCommaSeparated")}
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
                                        <TextAction
                                            tone="danger"
                                            className="self-end sm:self-center"
                                            onClick={() =>
                                                setAttrRows(rows =>
                                                    rows.filter((_, j) => j !== i)
                                                )
                                            }
                                        >
                                            {t("sxCommonRemove")}
                                        </TextAction>
                                    </div>
                                ))}
                                <TextAction
                                    className="self-start"
                                    onClick={() =>
                                        setAttrRows(rows => [...rows, { key: "", value: "" }])
                                    }
                                >
                                    {t("sxClientDetailAddAttribute")}
                                </TextAction>
                            </div>
                        )}

                        {subTab === "composites" && (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <div className="min-w-0 flex-1">
                                        <Field size="lg">
                                            <FieldLabel>{t("sxClientDetailRole")}</FieldLabel>
                                            <NativeSelect
                                                size="lg"
                                                className="w-full"
                                                value={roleToAdd}
                                                onChange={e => setRoleToAdd(e.target.value)}
                                            >
                                                <NativeSelectOption value="">{t("sxClientDetailSelectRole")}</NativeSelectOption>
                                                {assignableComposites.map(r => (
                                                    <NativeSelectOption key={r.id} value={r.id}>
                                                        {r.name}
                                                    </NativeSelectOption>
                                                ))}
                                            </NativeSelect>
                                        </Field>
                                    </div>
                                    <Button
                                        size="lg"
                                        disabled={!roleToAdd}
                                        onClick={addComposite}
                                    >
                                        {t("sxClientDetailAddRole")}
                                    </Button>
                                </div>
                                {loadingComp ? (
                                    <ListSkeleton />
                                ) : compFailed ? (
                                    <Notice
                                        title={t("sxClientDetailCompositesLoadErrorTitle")}
                                        description={t("sxLoadErrorDescription")}
                                        onRetry={loadComposites}
                                    />
                                ) : composites.length === 0 ? (
                                    <Notice
                                        title={t("sxClientDetailNoCompositesTitle")}
                                        description={t("sxClientDetailNoCompositesDescription")}
                                    />
                                ) : (
                                    <Group>
                                        {composites.map(r => (
                                            <ItemRow
                                                key={r.id}
                                                title={r.name}
                                                subtitle={r.description}
                                                trailing={
                                                    <RowDelete
                                                        title={t("sxCommonRemove")}
                                                        onClick={() => removeComposite(r)}
                                                    />
                                                }
                                            />
                                        ))}
                                    </Group>
                                )}
                            </div>
                        )}

                        {subTab === "users" &&
                            (loadingUsers ? (
                                <ListSkeleton />
                            ) : usersFailed ? (
                                <Notice
                                    title={t("sxClientDetailRoleUsersLoadErrorTitle")}
                                    description={t("sxLoadErrorDescription")}
                                    onRetry={loadUsers}
                                />
                            ) : users.length === 0 ? (
                                <Notice
                                    title={t("sxClientDetailNoRoleUsersTitle")}
                                    description={t("sxClientDetailNoRoleUsersDescription")}
                                />
                            ) : (
                                <Group>
                                    {users.map(u => (
                                        <ItemRow
                                            key={u.id}
                                            title={u.username || "—"}
                                            subtitle={u.email || "—"}
                                        />
                                    ))}
                                </Group>
                            ))}
                    </div>
                </ModalBody>
                <ModalFooter>
                    {(subTab === "settings" || subTab === "attributes") && (
                        <Button disabled={saving} onClick={save}>
                            {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function CreateRole({ id, adminClient, addAlert, addError, onClose, onCreated }: any) {
    const t = useT();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    const create = async () => {
        if (!name.trim()) {
            addError(t("sxClientDetailRoleNameRequired"), new Error("name"));
            return;
        }
        setSaving(true);
        try {
            await adminClient.clients.createRole(
                { id },
                { name: name.trim(), description: description.trim() || undefined }
            );
            addAlert(t("sxClientDetailRoleCreated"), AlertVariant.success);
            await onCreated();
        } catch (err) {
            addError(t("sxClientDetailRoleCreateFailed"), err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxClientDetailCreateRole")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <Field size="lg">
                            <FieldLabel>{t("sxClientDetailRoleName")} <span className="text-destructive">*</span></FieldLabel>
                            <Input
                                size="lg"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="my-role"
                            />
                        </Field>
                        <Field size="lg">
                            <FieldLabel>{t("sxCommonDescription")}</FieldLabel>
                            <Textarea
                                size="lg"
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
                        {t("sxCommonCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function ScopesTab({ id, clientId, adminClient, addAlert, addError, reload }: any) {
    const t = useT();
    const [failed, setFailed] = useState(false);
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
        setFailed(false);
        try {
            const [d, o, a] = await Promise.all([
                adminClient.clients.listDefaultClientScopes({ id }),
                adminClient.clients.listOptionalClientScopes({ id }),
                adminClient.clientScopes.find()
            ]);
            setDef(d ?? []);
            setOpt(o ?? []);
            setAll(a ?? []);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

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
                ids.length > 1 ? t("sxClientDetailScopesAdded", { n: ids.length }) : t("sxClientDetailScopeAdded"),
                AlertVariant.success
            );
            setAddOpen(false);
            await load();
        } catch (err) {
            addError(t("sxClientDetailScopeAddFailed"), err);
        }
    };

    const removeDefault = async (scope: any) => {
        try {
            await adminClient.clients.delDefaultClientScope({
                id,
                clientScopeId: scope.id
            });
            addAlert(t("sxClientDetailScopeRemoved"), AlertVariant.success);
            await load();
        } catch (err) {
            addError(t("sxClientDetailScopeRemoveFailed"), err);
        }
    };

    const removeOptional = async (scope: any) => {
        try {
            await adminClient.clients.delOptionalClientScope({
                id,
                clientScopeId: scope.id
            });
            addAlert(t("sxClientDetailScopeRemoved"), AlertVariant.success);
            await load();
        } catch (err) {
            addError(t("sxClientDetailScopeRemoveFailed"), err);
        }
    };

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
            addAlert(t("sxClientDetailScopeTypeUpdated"), AlertVariant.success);
            await load();
        } catch (err) {
            addError(t("sxClientDetailScopeTypeUpdateFailed"), err);
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

    if (loading) return <ListSkeleton />;

    if (failed)
        return (
            <Notice
                title={t("sxClientDetailScopesLoadErrorTitle")}
                description={t("sxLoadErrorDescription")}
                onRetry={load}
            />
        );

    return (
        <div className="flex flex-col gap-6">
            <SegmentTabs
                ariaLabel={t("sxClientDetailScopeSectionsAria")}
                value={subTab}
                onChange={setSubTab}
                items={[
                    { value: "setup", label: t("sxClientDetailScopeSetup") },
                    { value: "evaluate", label: t("sxClientDetailScopeEvaluate") }
                ]}
            />

            {subTab === "setup" && (
                <>
                    <Section label={t("sxClientDetailClientToken")}>
                        <ListGroup>
                            <ListRow
                                leading={
                                    <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                                        <StackIcon weight="fill" className="size-4.5" />
                                    </span>
                                }
                                title={t("sxClientDetailMappersAndScope")}
                                subtitle={t("sxClientDetailMappersAndScopeHint")}
                                onClick={() => setDedicatedOpen(true)}
                            />
                        </ListGroup>
                    </Section>

                    <Section
                        label={t("sxClientDetailAssignedScopes")}
                        action={
                            <TextAction
                                onClick={() => setAddOpen(true)}
                                disabled={unassigned.length === 0}
                            >
                                {t("sxCommonAdd")}
                            </TextAction>
                        }
                    >
                        {assigned.length === 0 ? (
                            <Notice
                                title={t("sxClientDetailNoAssignedScopesTitle")}
                                description={t("sxClientDetailNoAssignedScopesDescription")}
                                action={
                                    unassigned.length > 0 ? (
                                        <Button variant="secondary" onClick={() => setAddOpen(true)}>
                                            {t("sxClientDetailAddScope")}
                                        </Button>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <Group>
                                {assigned.map(s => (
                                    <ItemRow
                                        key={s.id}
                                        title={s.name}
                                        subtitle={s.description}
                                        trailing={
                                            <>
                                                <Select
                                                    value={s.type}
                                                    onValueChange={(v: string) =>
                                                        changeType(s, s.type, v)
                                                    }
                                                >
                                                    <SelectTrigger size="sm" aria-label={t("sxClientDetailType")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent align="end">
                                                        <SelectItem value="default">
                                                            {t("sxCommonDefault")}
                                                        </SelectItem>
                                                        <SelectItem value="optional">
                                                            {t("sxClientDetailOptional")}
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <RowDelete
                                                    title={t("sxCommonRemove")}
                                                    onClick={() =>
                                                        s.type === "default"
                                                            ? removeDefault(s)
                                                            : removeOptional(s)
                                                    }
                                                />
                                            </>
                                        }
                                    />
                                ))}
                            </Group>
                        )}
                    </Section>
                </>
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
    const t = useT();
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
                    <ModalTitle>{t("sxClientDetailAddScope")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <SearchField value={search} onChange={setSearch} placeholder={t("sxClientDetailSearchScope")} />

                        <div className="max-h-80 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <Notice
                                    title={t("sxClientDetailNoScopesToAddTitle")}
                                    description={
                                        search
                                            ? t("sxClientDetailNoSearchResultsDescription")
                                            : t("sxClientDetailNoScopesToAddDescription")
                                    }
                                />
                            ) : (
                                <Group>
                                    {filtered.map((s: any) => (
                                        <SelectRow
                                            key={s.id}
                                            title={s.name}
                                            subtitle={s.description}
                                            selected={selected.has(s.id)}
                                            onToggle={() => toggle(s.id)}
                                        />
                                    ))}
                                </Group>
                            )}
                        </div>

                        <Group>
                            <Row label={t("sxClientDetailType")}>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger size="sm" aria-label={t("sxClientDetailType")}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="end" className="z-200">
                                        <SelectItem value="default">{t("sxCommonDefault")}</SelectItem>
                                        <SelectItem value="optional">{t("sxClientDetailOptional")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Row>
                        </Group>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={selected.size === 0}
                        onClick={() => onAdd([...selected], type)}
                    >
                        {selected.size > 0 ? t("sxClientDetailAddWithCount", { n: selected.size }) : t("sxCommonAdd")}
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
    const t = useT();
    const [failed, setFailed] = useState(false);
    const [serverInfo, setServerInfo] = useState<any>(null);
    const [tab, setTab] = useState("mappers");
    const [view, setView] = useState("list");
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
        setFailed(false);
        try {
            const [m, c, si] = await Promise.all([
                adminClient.clients.listProtocolMappers({ id }),
                adminClient.clients.findOne({ id }),
                adminClient.serverInfo.find()
            ]);
            setMappers(Array.isArray(m) ? m : []);
            setProtocol(c?.protocol || "openid-connect");
            setFullScope(!!c?.fullScopeAllowed);
            setServerInfo(si);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

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
            title: t("sxClientDetailDeleteMapperTitle"),
            message: t("sxClientDetailDeleteMapperMessage", { name: m.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.delProtocolMapper({ id, mapperId: m.id });
                    addAlert(t("sxClientDetailMapperDeleted"), AlertVariant.success);
                    await load();
                } catch (err) {
                    addError(t("sxClientDetailMapperDeleteFailed"), err);
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
            addAlert(t("sxClientDetailMappersAdded", { n: reps.length }), AlertVariant.success);
            goList();
            await load();
        } catch (err) {
            addError(t("sxClientDetailMapperAddFailed"), err);
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
            addAlert(t("sxClientDetailMapperAdded"), AlertVariant.success);
            goList();
            await load();
        } catch (err) {
            addError(t("sxClientDetailMapperAddFailed"), err);
        } finally {
            setSaving(false);
        }
    };

    const toggleFullScope = async (v: boolean) => {
        setFullScope(v);
        try {
            const client = await adminClient.clients.findOne({ id });
            await adminClient.clients.update({ id }, { ...client, fullScopeAllowed: v });
            addAlert(t("sxClientDetailScopeSettingUpdated"), AlertVariant.success);
            await reload?.();
        } catch (err) {
            setFullScope(!v);
            addError(t("sxClientDetailScopeSettingUpdateFailed"), err);
        }
    };

    const filteredBuiltins = availBuiltins.filter((b: any) =>
        (b.name || "").toLowerCase().includes(search.toLowerCase())
    );
    const filteredTypes = mapperTypes.filter((mt: any) =>
        (mt.name || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxClientDetailMappersAndScope")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        {loading ? (
                            <ListSkeleton />
                        ) : failed ? (
                            <Notice
                                title={t("sxClientDetailMappersLoadErrorTitle")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={load}
                            />
                        ) : view === "list" ? (
                            <>
                                <div className="min-w-0 overflow-hidden">
                                    <SegmentTabs
                                        ariaLabel={t("sxClientDetailSectionAria")}
                                        value={tab}
                                        onChange={setTab}
                                        items={[
                                            { value: "mappers", label: t("sxClientDetailMappers") },
                                            { value: "scope", label: t("sxClientDetailScope") }
                                        ]}
                                    />
                                </div>
                                {tab === "mappers" ? (
                                    <Section
                                        label={t("sxClientDetailMappers")}
                                        action={
                                            <TextAction onClick={() => setView("choose")}>
                                                {t("sxCommonAdd")}
                                            </TextAction>
                                        }
                                    >
                                        {mappers.length === 0 ? (
                                            <EmptyCard
                                                title={t("sxClientDetailNoMappersTitle")}
                                                desc={t("sxClientDetailNoMappersDescription")}
                                                action={
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => setView("choose")}
                                                    >
                                                        {t("sxClientDetailAddMapper")}
                                                    </Button>
                                                }
                                            />
                                        ) : (
                                            <Group>
                                                {mappers.map(m => (
                                                    <ItemRow
                                                        key={m.id}
                                                        title={m.name}
                                                        subtitle={m.protocolMapper}
                                                        trailing={
                                                            <RowDelete
                                                                onClick={() => deleteMapper(m)}
                                                            />
                                                        }
                                                    />
                                                ))}
                                            </Group>
                                        )}
                                    </Section>
                                ) : (
                                    <div>
                                        <Group>
                                            <SwitchRow
                                                label={t("sxClientDetailFullScopeAllowed")}
                                                hint={t("sxClientDetailFullScopeAllowedHint")}
                                                checked={fullScope}
                                                onChange={toggleFullScope}
                                            />
                                        </Group>
                                        <GroupFooter>{t("sxClientDetailFullScopeFooter")}</GroupFooter>
                                    </div>
                                )}
                            </>
                        ) : view === "choose" ? (
                            <div className="flex flex-col gap-3">
                                <SubBack onClick={() => setView("list")}>{t("sxClientDetailMappers")}</SubBack>
                                <ListGroup>
                                    <ListRow
                                        title={t("sxClientDetailAddPredefinedMapper")}
                                        subtitle={t("sxClientDetailAddPredefinedMapperHint")}
                                        onClick={() => {
                                            setSearch("");
                                            setSelected(new Set());
                                            setView("predefined");
                                        }}
                                    />
                                    <ListRow
                                        title={t("sxClientDetailConfigureNewMapper")}
                                        subtitle={t("sxClientDetailConfigureNewMapperHint")}
                                        onClick={() => {
                                            setSearch("");
                                            setView("pickType");
                                        }}
                                    />
                                </ListGroup>
                            </div>
                        ) : view === "predefined" ? (
                            <div className="flex flex-col gap-3">
                                <SubBack onClick={() => setView("choose")}>{t("sxCommonBack")}</SubBack>
                                <SearchField value={search} onChange={setSearch} placeholder={t("sxClientDetailSearchMapper")} />
                                <div className="max-h-72 overflow-y-auto">
                                    {filteredBuiltins.length === 0 ? (
                                        <Notice
                                            title={t("sxClientDetailNoPredefinedMappersTitle")}
                                            description={
                                                search
                                                    ? t("sxClientDetailNoSearchResultsDescription")
                                                    : t("sxClientDetailNoPredefinedMappersDescription")
                                            }
                                        />
                                    ) : (
                                        <Group>
                                            {filteredBuiltins.map((b: any) => (
                                                <SelectRow
                                                    key={b.name}
                                                    title={b.name}
                                                    selected={selected.has(b.name)}
                                                    onToggle={() => toggleSel(b.name)}
                                                />
                                            ))}
                                        </Group>
                                    )}
                                </div>
                                <SaveBar>
                                    <Button
                                        size="form"
                                        disabled={selected.size === 0}
                                        onClick={addPredefined}
                                    >
                                        {selected.size > 0 ? t("sxClientDetailAddWithCount", { n: selected.size }) : t("sxCommonAdd")}
                                    </Button>
                                </SaveBar>
                            </div>
                        ) : view === "pickType" ? (
                            <div className="flex flex-col gap-3">
                                <SubBack onClick={() => setView("choose")}>{t("sxCommonBack")}</SubBack>
                                <SearchField value={search} onChange={setSearch} placeholder={t("sxClientDetailSearchMapperType")} />
                                <div className="max-h-72 overflow-y-auto">
                                    {filteredTypes.length === 0 ? (
                                        <Notice
                                            title={t("sxClientDetailNoMapperTypesTitle")}
                                            description={
                                                search
                                                    ? t("sxClientDetailNoSearchResultsDescription")
                                                    : t("sxClientDetailNoMapperTypesDescription")
                                            }
                                        />
                                    ) : (
                                        <ListGroup>
                                            {filteredTypes.map((mt: any) => (
                                                <ListRow
                                                    key={mt.id}
                                                    title={mt.name}
                                                    subtitle={mt.category}
                                                    onClick={() => {
                                                        setPickedType(mt);
                                                        setNewName(mt.name);
                                                        setNewConfig({});
                                                        setView("config");
                                                    }}
                                                />
                                            ))}
                                        </ListGroup>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <SubBack onClick={() => setView("pickType")}>{pickedType?.name}</SubBack>
                                <Field size="lg">
                                    <FieldLabel>{t("sxCommonName")}</FieldLabel>
                                    <Input
                                        size="lg"
                                        value={newName}
                                        onChange={(e: any) => setNewName(e.target.value)}
                                        placeholder={t("sxClientDetailMapperName")}
                                    />
                                </Field>
                                <ConfigForm
                                    properties={pickedType?.properties}
                                    value={newConfig}
                                    onChange={(name: string, v: string[]) =>
                                        setNewConfig((c: any) => ({ ...c, [name]: v }))
                                    }
                                />
                                <SaveBar>
                                    <Button
                                        size="form"
                                        disabled={saving || !newName.trim()}
                                        onClick={saveNew}
                                    >
                                        {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                                    </Button>
                                </SaveBar>
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
    const t = useT();
    const { realm } = useRealm();
    const [scope, setScope] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchedTerm, setSearchedTerm] = useState("");
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

    const scopeParam = useMemo(
        () => lines(scope.replace(/[,\s]+/g, "\n")).join(" "),
        [scope]
    );

    const searchUsers = async () => {
        if (!userSearch.trim()) {
            setUserResults([]);
            setSearchedTerm("");
            return;
        }
        setSearching(true);
        setSearchedTerm("");
        try {
            const list = await adminClient.users.find({
                search: userSearch.trim(),
                max: 20
            });
            setUserResults(Array.isArray(list) ? list : []);
            setSearchedTerm(userSearch.trim());
        } catch (err) {
            addError(t("sxClientDetailUserSearchFailed"), err);
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
                    const generated = await adminClient.clients.evaluateGenerateAccessToken({
                        id,
                        userId: uid,
                        scope: scopeParam
                    });
                    setToken(generated ?? null);
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
        setSearchedTerm("");
    };

    return (
        <div className="flex flex-col gap-6">
            <Section label={t("sxClientDetailEvaluation")}>
                <Stack>
                    <FieldCard>
                        <Field size="lg">
                            <FieldLabel>{t("sxClientDetailScopeParameter")}</FieldLabel>
                            <Input
                                size="lg"
                                value={scope}
                                onChange={(e: any) => setScope(e.target.value)}
                                placeholder="address phone"
                            />
                            <FieldDescription>{t("sxClientDetailScopeParameterHelp")}</FieldDescription>
                        </Field>
                        <Field size="lg">
                            <FieldLabel>{t("sxClientDetailUserOptional")}</FieldLabel>
                            {picked ? (
                                <div className="flex min-w-0 items-center gap-3">
                                    <Chip tone="info">
                                        <span className="max-w-56 truncate">{picked.username}</span>
                                    </Chip>
                                    <TextAction tone="danger" onClick={() => setPicked(null)}>
                                        {t("sxCommonRemove")}
                                    </TextAction>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        size="lg"
                                        className="min-w-0 flex-1"
                                        value={userSearch}
                                        onChange={e => setUserSearch(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && searchUsers()}
                                        placeholder={t("sxClientDetailUserSearchPlaceholder")}
                                    />
                                    <Button
                                        size="lg"
                                        variant="secondary"
                                        disabled={searching}
                                        onClick={searchUsers}
                                    >
                                        {searching ? t("sxClientDetailSearching") : t("sxCommonSearch")}
                                    </Button>
                                </div>
                            )}
                            <FieldDescription>{t("sxClientDetailUserHelp")}</FieldDescription>
                        </Field>
                    </FieldCard>
                    {!picked && searchedTerm && userResults.length === 0 && (
                        <Notice
                            title={t("sxClientDetailNoUsersFoundTitle")}
                            description={t("sxClientDetailNoSearchResultsDescription")}
                        />
                    )}
                    {userResults.length > 0 && (
                        <div className="max-h-72 overflow-y-auto">
                            <ListGroup>
                                {userResults.map(u => (
                                    <ListRow
                                        key={u.id}
                                        title={u.username}
                                        subtitle={u.email || "—"}
                                        onClick={() => pickUser(u)}
                                    />
                                ))}
                            </ListGroup>
                        </div>
                    )}
                    <SaveBar>
                        <Button size="form" onClick={() => evaluate()} disabled={evaluating}>
                            {evaluating ? t("sxClientDetailEvaluating") : t("sxClientDetailScopeEvaluate")}
                        </Button>
                    </SaveBar>
                </Stack>
                <GroupFooter>{t("sxClientDetailEvaluateFooter")}</GroupFooter>
            </Section>

            {evaluated && (
                <div className="flex flex-col gap-4">
                    <SegmentTabs
                        ariaLabel={t("sxClientDetailResultAria")}
                        value={view}
                        onChange={setView}
                        items={[
                            { value: "token", label: t("sxClientDetailSampleToken") },
                            { value: "mappers", label: t("sxClientDetailEffectiveMappers") },
                            { value: "roles", label: t("sxClientDetailEffectiveRoles") }
                        ]}
                    />

                    {evaluating ? (
                        <ListSkeleton />
                    ) : (
                    <>
                    {view === "token" &&
                        (!picked ? (
                            <Notice
                                title={t("sxClientDetailPickUserTitle")}
                                description={t("sxClientDetailPickUserDescription")}
                            />
                        ) : tokenFailed ? (
                            <Notice
                                title={t("sxClientDetailTokenEvalErrorTitle")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => evaluate()}
                            />
                        ) : (
                            <CodeBlock size="sm">
                                <CodeBlockContent className="max-h-112 scroll-fade-y">
                                    {token ? JSON.stringify(token, null, 2) : "—"}
                                </CodeBlockContent>
                            </CodeBlock>
                        ))}

                    {view === "mappers" &&
                        (mappersFailed ? (
                            <Notice
                                title={t("sxClientDetailMappersEvalErrorTitle")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => evaluate()}
                            />
                        ) : (mappers ?? []).length === 0 ? (
                            <Notice
                                title={t("sxClientDetailNoEffectiveMappersTitle")}
                                description={t("sxClientDetailNoEffectiveMappersDescription")}
                            />
                        ) : (
                            <ListGroup>
                                {(mappers ?? []).map((m: any, i: number) => (
                                    <ListRow
                                        key={m.id || i}
                                        title={m.name || "—"}
                                        subtitle={[m.protocolMapper, m.category || m.protocol]
                                            .filter(Boolean)
                                            .join(" · ") || "—"}
                                    />
                                ))}
                            </ListGroup>
                        ))}

                    {view === "roles" &&
                        (rolesFailed ? (
                            <Notice
                                title={t("sxClientDetailRolesEvalErrorTitle")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => evaluate()}
                            />
                        ) : (roles ?? []).length === 0 ? (
                            <Notice
                                title={t("sxClientDetailNoEffectiveRolesTitle")}
                                description={t("sxClientDetailNoEffectiveRolesDescription")}
                            />
                        ) : (
                            <ListGroup>
                                {(roles ?? []).map((r: any, i: number) => (
                                    <ListRow
                                        key={r.id || i}
                                        title={r.name || "—"}
                                        subtitle={r.containerId || undefined}
                                        trailing={r.clientRole ? <Chip>{t("sxClientDetailTitle")}</Chip> : undefined}
                                    />
                                ))}
                            </ListGroup>
                        ))}
                    </>
                    )}
                </div>
            )}
        </div>
    );
}

function ServiceAccountTab({ id, adminClient, addAlert, addError }: any) {
    const t = useT();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [allRoles, setAllRoles] = useState<any[]>([]);
    const [roleToAdd, setRoleToAdd] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const u = await adminClient.clients.getServiceAccountUser({ id });
            setUser(u ?? null);
            if (u?.id) {
                const [mapped, all] = await Promise.all([
                    adminClient.users.listRealmRoleMappings({ id: u.id }),
                    adminClient.roles.find()
                ]);
                setRoles(mapped ?? []);
                setAllRoles(all ?? []);
            }
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

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
            addAlert(t("sxClientDetailRoleAssigned"), AlertVariant.success);
            setRoleToAdd("");
            await load();
        } catch (err) {
            addError(t("sxClientDetailRoleAssignFailed"), err);
        }
    };

    const remove = async (role: any) => {
        if (!user?.id) return;
        try {
            await adminClient.users.delRealmRoleMappings({ id: user.id, roles: [role] });
            addAlert(t("sxClientDetailRoleRemoved"), AlertVariant.success);
            await load();
        } catch (err) {
            addError(t("sxClientDetailRoleRemoveFailed"), err);
        }
    };

    if (loading) return <ListSkeleton />;

    if (failed)
        return (
            <Notice
                title={t("sxClientDetailServiceAccountLoadErrorTitle")}
                description={t("sxLoadErrorDescription")}
                onRetry={load}
            />
        );

    return (
        <div className="flex flex-col gap-6">
            <Section label={t("sxNavRealmRoles")}>
                <Stack>
                    <FieldCard>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                                <Field size="lg">
                                    <FieldLabel>{t("sxClientDetailRole")}</FieldLabel>
                                    <NativeSelect
                                        size="lg"
                                        className="w-full"
                                        value={roleToAdd}
                                        onChange={e => setRoleToAdd(e.target.value)}
                                    >
                                        <NativeSelectOption value="">{t("sxClientDetailSelectRole")}</NativeSelectOption>
                                        {assignable.map(r => (
                                            <NativeSelectOption key={r.id} value={r.id}>
                                                {r.name}
                                            </NativeSelectOption>
                                        ))}
                                    </NativeSelect>
                                </Field>
                            </div>
                            <Button size="lg" disabled={!roleToAdd} onClick={assign}>
                                {t("sxClientDetailAssign")}
                            </Button>
                        </div>
                    </FieldCard>
                    {roles.length === 0 ? (
                        <Notice
                            title={t("sxClientDetailNoAssignedRolesTitle")}
                            description={t("sxClientDetailNoAssignedRolesDescription")}
                        />
                    ) : (
                        <Group>
                            {roles.map(r => (
                                <ItemRow
                                    key={r.id}
                                    title={r.name}
                                    subtitle={r.description}
                                    trailing={<RowDelete title={t("sxCommonRemove")} onClick={() => remove(r)} />}
                                />
                            ))}
                        </Group>
                    )}
                </Stack>
            </Section>

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
    const t = useT();
    const [clients, setClients] = useState<any[]>([]);
    const [clientsState, setClientsState] = useState<"loading" | "ready" | "error">("loading");
    const [clientsAttempt, setClientsAttempt] = useState(0);
    const [rolesFailed, setRolesFailed] = useState(false);
    const [chosenClientId, setChosenClientId] = useState("");
    const [clientRoles, setClientRoles] = useState<any[]>([]);
    const [mapped, setMapped] = useState<any[]>([]);
    const [roleToAdd, setRoleToAdd] = useState("");
    const [loadingRoles, setLoadingRoles] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            setClientsState("loading");
            try {
                const list = await adminClient.clients.find();
                if (!alive) return;
                setClients(Array.isArray(list) ? list : []);
                setClientsState("ready");
            } catch {
                if (alive) setClientsState("error");
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, clientsAttempt]);

    const loadForClient = useCallback(
        async (clientUniqueId: string) => {
            if (!clientUniqueId || !saUser?.id) {
                setClientRoles([]);
                setMapped([]);
                return;
            }
            setLoadingRoles(true);
            setRolesFailed(false);
            try {
                const [all, mp] = await Promise.all([
                    adminClient.clients.listRoles({ id: clientUniqueId }),
                    adminClient.users.listClientRoleMappings({ id: saUser.id, clientUniqueId })
                ]);
                setClientRoles(Array.isArray(all) ? all : []);
                setMapped(Array.isArray(mp) ? mp : []);
            } catch {
                setClientRoles([]);
                setMapped([]);
                setRolesFailed(true);
            } finally {
                setLoadingRoles(false);
            }
        },
        [adminClient, saUser?.id]
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
            addAlert(t("sxClientDetailClientRoleAssigned"), AlertVariant.success);
            setRoleToAdd("");
            await loadForClient(chosenClientId);
        } catch (err) {
            addError(t("sxClientDetailClientRoleAssignFailed"), err);
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
            addAlert(t("sxClientDetailClientRoleRemoved"), AlertVariant.success);
            await loadForClient(chosenClientId);
        } catch (err) {
            addError(t("sxClientDetailClientRoleRemoveFailed"), err);
        }
    };

    return (
        <Section label={t("sxClientDetailClientRolesSection")}>
            <Stack>
                {clientsState === "error" && (
                    <Notice
                        title={t("sxClientDetailClientsLoadErrorTitle")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setClientsAttempt(n => n + 1)}
                    />
                )}
                <FieldCard>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <Field size="lg">
                                <FieldLabel>{t("sxClientDetailTitle")}</FieldLabel>
                                <NativeSelect
                                    size="lg"
                                    className="w-full"
                                    value={chosenClientId}
                                    disabled={clientsState !== "ready"}
                                    onChange={e => onChooseClient(e.target.value)}
                                >
                                    <NativeSelectOption value="">
                                        {clientsState === "loading" ? t("sxClientDetailLoadingClients") : t("sxClientDetailSelectClient")}
                                    </NativeSelectOption>
                                    {clients.map(c => (
                                        <NativeSelectOption key={c.id} value={c.id}>
                                            {c.clientId}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                        </div>
                        <div className="min-w-0 flex-1">
                            <Field size="lg">
                                <FieldLabel>{t("sxClientDetailRole")}</FieldLabel>
                                <NativeSelect
                                    size="lg"
                                    className="w-full"
                                    value={roleToAdd}
                                    disabled={!chosenClientId}
                                    onChange={e => setRoleToAdd(e.target.value)}
                                >
                                    <NativeSelectOption value="">{t("sxClientDetailSelectRole")}</NativeSelectOption>
                                    {assignable.map(r => (
                                        <NativeSelectOption key={r.id} value={r.id}>
                                            {r.name}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                        </div>
                        <Button size="lg" disabled={!roleToAdd} onClick={assign}>
                            {t("sxClientDetailAssign")}
                        </Button>
                    </div>
                </FieldCard>

                {chosenClientId &&
                    (loadingRoles ? (
                        <ListSkeleton />
                    ) : rolesFailed ? (
                        <Notice
                            title={t("sxClientDetailClientRolesLoadErrorTitle")}
                            description={t("sxLoadErrorDescription")}
                            onRetry={() => loadForClient(chosenClientId)}
                        />
                    ) : mapped.length === 0 ? (
                        <Notice
                            title={t("sxClientDetailNoAssignedClientRolesTitle")}
                            description={t("sxClientDetailNoAssignedClientRolesDescription")}
                        />
                    ) : (
                        <Group>
                            {mapped.map(r => (
                                <ItemRow
                                    key={r.id}
                                    title={r.name}
                                    subtitle={r.description}
                                    trailing={<RowDelete title={t("sxCommonRemove")} onClick={() => remove(r)} />}
                                />
                            ))}
                        </Group>
                    ))}
            </Stack>
            <GroupFooter>{t("sxClientDetailClientRolesFooter")}</GroupFooter>
        </Section>
    );
}

function SessionsTab({ id, adminClient, addError }: any) {
    const t = useT();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const list = await adminClient.clients.listSessions({ id });
            setSessions(list ?? []);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <Section
            label={t("sxClientDetailActiveSessions")}
            action={
                !loading && sessions.length > 0 ? (
                    <span className="text-[13px] text-muted-foreground tabular-nums">
                        {sessions.length}
                    </span>
                ) : undefined
            }
        >
            {loading ? (
                <ListSkeleton />
            ) : failed ? (
                <Notice
                    title={t("sxClientDetailSessionsLoadErrorTitle")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={load}
                />
            ) : sessions.length === 0 ? (
                <Notice
                    title={t("sxClientDetailNoSessionsTitle")}
                    description={t("sxClientDetailNoSessionsDescription")}
                />
            ) : (
                <ListGroup>
                    {sessions.map(s => (
                        <ListRow
                            key={s.id}
                            leading={
                                <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-[11px] font-semibold text-white dark:bg-[#48484a]">
                                    {(s.username || "?").trim().charAt(0).toUpperCase() || "?"}
                                </span>
                            }
                            title={s.username || "—"}
                            subtitle={
                                <>
                                    <span className="font-mono">{s.ipAddress || "—"}</span>
                                    {" · "}
                                    {t("sxClientDetailLastAccess", { date: fmtDate(s.lastAccess) })}
                                </>
                            }
                            trailing={
                                <span className="hidden text-[13px] text-muted-foreground tabular-nums sm:inline">
                                    {fmtDate(s.start)}
                                </span>
                            }
                        />
                    ))}
                </ListGroup>
            )}
        </Section>
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
    const t = useT();
    const [_saving, setSaving] = useState(false);

    const [cert, setCert] = useState<string>("");
    const [loadingCert, setLoadingCert] = useState(true);
    const [certFailed, setCertFailed] = useState(false);
    const [keystoreFormat, setKeystoreFormat] = useState("JKS");
    const fileRef = useRef<HTMLInputElement>(null);

    const loadCert = useCallback(async () => {
        setLoadingCert(true);
        setCertFailed(false);
        try {
            const info = await adminClient.clients.getKeyInfo({
                id,
                attr: "jwt.credential"
            });
            setCert(info?.certificate ?? "");
        } catch {
            setCert("");
            setCertFailed(true);
        } finally {
            setLoadingCert(false);
        }
    }, [adminClient, id]);

    useEffect(() => {
        loadCert();
    }, [loadCert]);

    const savedJwksRef = useRef(edited?.attributes?.["jwks.url"] ?? "");

    if (!edited) return <ListSkeleton />;

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
            addAlert(t("sxClientDetailSaved"), AlertVariant.success);
            await reload();
        } catch (err) {
            addError(t("sxClientDetailSaveFailed"), err);
        } finally {
            setSaving(false);
        }
    };

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

    const commitJwksUrl = () => {
        const cur = edited.attributes?.["jwks.url"] ?? "";
        if (cur === savedJwksRef.current) return;
        savedJwksRef.current = cur;
        save();
    };

    const generateKey = () =>
        confirm({
            title: t("sxClientDetailGenerateKeyTitle"),
            message: t("sxClientDetailGenerateKeyMessage"),
            confirmLabel: t("sxClientDetailGenerate"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.generateKey({ id, attr: "jwt.credential" });
                    addAlert(t("sxClientDetailKeyGenerated"), AlertVariant.success);
                    await loadCert();
                } catch (err) {
                    addError(t("sxClientDetailKeyGenerateFailed"), err);
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
            addAlert(t("sxClientDetailCertImported"), AlertVariant.success);
            await loadCert();
        } catch (err) {
            addError(t("sxClientDetailCertImportFailed"), err);
        }
    };

    const copyCert = () => {
        navigator.clipboard?.writeText(cert);
        addAlert(t("sxClientDetailCertCopied"), AlertVariant.success);
    };

    return (
        <div className="flex flex-col gap-6">
            <Section label="JWKS">
                <Group>
                    <SwitchRow
                        label={t("sxClientDetailUseJwksUrl")}
                        hint={t("sxClientDetailUseJwksUrlHint")}
                        checked={useJwksUrl}
                        onChange={toggleJwks}
                    />
                    {useJwksUrl && (
                        <StackRow label="JWKS URL">
                            <Input
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
                <GroupFooter>{t("sxClientDetailJwksFooter")}</GroupFooter>
            </Section>

            <Section label={t("sxClientDetailSigningCert")}>
                {loadingCert ? (
                    <ListSkeleton rows={1} />
                ) : certFailed ? (
                    <Notice
                        title={t("sxClientDetailCertLoadErrorTitle")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={loadCert}
                    />
                ) : (
                    <Group>
                        {cert ? (
                            <div className="flex flex-col gap-3 px-4 py-3">
                                <code className="block max-h-32 overflow-y-auto font-mono text-xs break-all text-muted-foreground">
                                    {cert}
                                </code>
                                <TextAction className="self-start" onClick={copyCert}>
                                    {t("sxCommonCopy")}
                                </TextAction>
                            </div>
                        ) : (
                            <EmptyRow>{t("sxClientDetailNoCert")}</EmptyRow>
                        )}
                        <ActionRow danger onClick={generateKey}>
                            {t("sxClientDetailGenerateKeyTitle")}
                        </ActionRow>
                    </Group>
                )}
                <GroupFooter>{t("sxClientDetailGenerateKeyFooter")}</GroupFooter>
            </Section>

            <Section label={t("sxClientDetailImportCert")}>
                <input
                    ref={fileRef}
                    type="file"
                    onChange={onImportFile}
                    className="hidden"
                />
                <Group>
                    <Row label={t("sxClientDetailArchiveFormat")}>
                        <Select value={keystoreFormat} onValueChange={setKeystoreFormat}>
                            <SelectTrigger size="sm" aria-label={t("sxClientDetailArchiveFormat")}>
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
                        {t("sxClientDetailChooseFileImport")}
                    </ActionRow>
                </Group>
                <GroupFooter>{t("sxClientDetailImportCertFooter")}</GroupFooter>
            </Section>
        </div>
    );
}

function AdvancedTab({
    id,
    edited,
    setEdited,
    adminClient,
    addAlert,
    addError,
    reload
}: any) {
    const t = useT();
    const [saving, setSaving] = useState(false);
    const [flows, setFlows] = useState<any[]>([]);
    const [flowsState, setFlowsState] = useState<"loading" | "ready" | "error">("loading");
    const [flowsAttempt, setFlowsAttempt] = useState(0);
    const [revoking, setRevoking] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            setFlowsState("loading");
            try {
                const res = await adminClient.authenticationManagement.getFlows();
                if (!alive) return;
                setFlows(Array.isArray(res) ? res.filter((f: any) => f?.topLevel) : []);
                setFlowsState("ready");
            } catch {
                if (alive) setFlowsState("error");
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, flowsAttempt]);

    if (!edited) return <ListSkeleton />;

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
            addAlert(t("sxClientDetailSaved"), AlertVariant.success);
            await reload();
        } catch (err) {
            addError(t("sxClientDetailSaveFailed"), err);
        } finally {
            setSaving(false);
        }
    };

    const revoke = async () => {
        setRevoking(true);
        try {
            await adminClient.clients.pushRevocation({ id });
            addAlert(t("sxClientDetailRevoked"), AlertVariant.success);
        } catch (err) {
            addError(t("sxClientDetailRevokeFailed"), err);
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
                            {a === "" ? t("sxClientDetailUnspecified") : a}
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
                <SelectTrigger size="sm" aria-label={label} className="max-w-full sm:max-w-52">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value={FLOW_DEFAULT}>{t("sxCommonDefault")}</SelectItem>
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
        <Row label={label} hint={t("sxClientDetailSeconds")}>
            <Input
                size="sm"
                type="number"
                className="w-full sm:w-40"
                value={attrs[key] ?? ""}
                onChange={(e: any) => setAttr(key, e.target.value)}
                placeholder={t("sxCommonDefault")}
            />
        </Row>
    );

    const switchRow = (key: string, label: string, on: boolean, val: any) => (
        <SwitchRow label={label} checked={on} onChange={(v: boolean) => setAttr(key, val(v))} />
    );

    return (
        <div className="flex flex-col gap-6">
            <Section label={t("sxClientDetailOidcFineGrain")}>
                <Group>
                    {algRow(
                        "access.token.signed.response.alg",
                        t("sxClientDetailAccessTokenSigAlg")
                    )}
                    {algRow("id.token.signed.response.alg", t("sxClientDetailIdTokenSigAlg"))}
                    <Row label={t("sxClientDetailPkceMethod")}>
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
                                aria-label={t("sxClientDetailPkceMethod")}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value={ALG_UNSET}>{t("sxClientDetailUnspecified")}</SelectItem>
                                <SelectItem value="S256">S256</SelectItem>
                                <SelectItem value="plain">plain</SelectItem>
                            </SelectContent>
                        </Select>
                    </Row>
                    {switchRow(
                        "require.pushed.authorization.requests",
                        t("sxClientDetailRequirePar"),
                        (attrs["require.pushed.authorization.requests"] ?? "") === "true",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                </Group>
            </Section>

            <Section label={t("sxClientDetailAdvancedSettings")}>
                <Group>
                    {numRow("access.token.lifespan", t("sxClientDetailAccessTokenLifespan"))}
                    {numRow(
                        "client.session.idle.timeout",
                        t("sxClientDetailClientSessionIdle")
                    )}
                    {numRow("client.session.max.lifespan", t("sxClientDetailClientSessionMax"))}
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
            </Section>

            <Section label={t("sxClientDetailOidcCompat")}>
                <Group>
                    {switchRow(
                        "exclude.session.state.from.auth.response",
                        t("sxClientDetailExcludeSessionState"),
                        (attrs["exclude.session.state.from.auth.response"] ?? "") ===
                            "true",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                    {switchRow(
                        "use.refresh.tokens",
                        t("sxClientDetailUseRefreshTokens"),
                        (attrs["use.refresh.tokens"] ?? "") !== "false",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                    {switchRow(
                        "client_credentials.use_refresh_token",
                        t("sxClientDetailUseRefreshTokenCc"),
                        (attrs["client_credentials.use_refresh_token"] ?? "") === "true",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                    {switchRow(
                        "client.use.lightweight.access.token.enabled",
                        t("sxClientDetailUseLightweightToken"),
                        (attrs["client.use.lightweight.access.token.enabled"] ?? "") ===
                            "true",
                        (v: boolean) => (v ? "true" : "false")
                    )}
                </Group>
            </Section>

            <Section label={t("sxClientDetailFlowOverrides")}>
                {flowsState === "loading" ? (
                    <ListSkeleton rows={2} />
                ) : flowsState === "error" ? (
                    <Notice
                        title={t("sxClientDetailFlowsLoadErrorTitle")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setFlowsAttempt(n => n + 1)}
                    />
                ) : (
                    <Group>
                        {flowRow("browser", t("sxClientDetailBrowserFlow"))}
                        {flowRow("direct_grant", t("sxClientDetailDirectGrantFlow"))}
                    </Group>
                )}
            </Section>

            <Section label={t("sxClientDetailClustering")}>
                <Group>
                    <Row label={t("sxClientDetailNodeReRegTimeout")} hint={t("sxClientDetailSeconds")}>
                        <Input
                            size="sm"
                            type="number"
                            className="w-full sm:w-40"
                            placeholder={t("sxCommonDefault")}
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
            </Section>

            <ClusterNodes
                id={id}
                nodes={edited.registeredNodes || {}}
                adminClient={adminClient}
                addAlert={addAlert}
                addError={addError}
                reload={reload}
            />

            <SaveBar>
                <Button size="form" disabled={saving} onClick={save}>
                    {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                </Button>
            </SaveBar>

            <section className="border-t border-[#e5e5ea] pt-6 dark:border-[#38383a]">
                <h2 className="mb-1 text-[15px] font-semibold">{t("sxClientDetailRevocation")}</h2>
                <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">
                    {t("sxClientDetailRevocationHelp")}
                </p>
                <Button
                    size="form"
                    className={DANGER_BUTTON}
                    disabled={revoking}
                    onClick={revoke}
                >
                    {revoking ? t("sxCommonProcessing") : t("sxClientDetailRevokeAll")}
                </Button>
            </section>
        </div>
    );
}

function ClusterNodes({ id, nodes, adminClient, addAlert, addError, reload }: any) {
    const t = useT();
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
            addAlert(t("sxClientDetailNodeAdded"), AlertVariant.success);
            setHost("");
            await reload();
        } catch (err) {
            addError(t("sxClientDetailNodeAddFailed"), err);
        }
    };

    const remove = async (h: string) => {
        try {
            await adminClient.clients.deleteClusterNode({ id, node: h });
            addAlert(t("sxClientDetailNodeRemoved"), AlertVariant.success);
            await reload();
        } catch (err) {
            addError(t("sxClientDetailNodeRemoveFailed"), err);
        }
    };

    return (
        <Section label={t("sxClientDetailClusterNodes")}>
            <Group>
                {entries.length === 0 ? (
                    <EmptyRow>{t("sxClientDetailNoNodes")}</EmptyRow>
                ) : (
                    entries.map(([h, ts]: any) => (
                        <ItemRow
                            key={h}
                            title={h}
                            subtitle={<span className="tabular-nums">{fmtDate(ts)}</span>}
                            trailing={<RowDelete title={t("sxCommonRemove")} onClick={() => remove(h)} />}
                        />
                    ))
                )}
                <StackRow label={t("sxClientDetailAddNode")}>
                    <div className="flex items-center gap-2">
                        <Input
                            className="min-w-0 flex-1"
                            value={host}
                            onChange={(e: any) => setHost(e.target.value)}
                            onKeyDown={(e: any) => e.key === "Enter" && add()}
                            placeholder="node-host"
                        />
                        <Button
                            variant="tinted"
                            disabled={!host.trim()}
                            onClick={add}
                        >
                            {t("sxCommonAdd")}
                        </Button>
                    </div>
                </StackRow>
            </Group>
        </Section>
    );
}

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
    const t = useT();
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

    return (
        <div className="flex flex-col gap-6">
            <SegmentTabs
                ariaLabel={t("sxClientDetailEventTypeAria")}
                value={subTab}
                onChange={setSubTab}
                items={[
                    { value: "user", label: t("sxClientDetailUserEvents") },
                    { value: "admin", label: t("sxClientDetailAdminEvents") }
                ]}
            />

            {subTab === "user" &&
                (userLoading ? (
                    <ListSkeleton />
                ) : userFailed ? (
                    <Notice
                        title={t("sxClientDetailEventsLoadErrorTitle")}
                        description={t("sxClientDetailEventsLoadErrorDescription")}
                        onRetry={loadUser}
                    />
                ) : userRows.length === 0 ? (
                    <Notice
                        title={t("sxClientDetailNoEventsTitle")}
                        description={t("sxClientDetailNoUserEventsDescription")}
                    />
                ) : (
                    <ListGroup>
                        {userRows.map((e, i) => (
                            <EventRow
                                key={i}
                                tone={evtTone(e.type)}
                                label={e.type ?? "—"}
                                meta={
                                    e.details?.username ||
                                    e.userId?.slice(0, 8) ||
                                    t("sxClientDetailUnknown")
                                }
                                ip={e.ipAddress}
                                time={e.time}
                            />
                        ))}
                    </ListGroup>
                ))}

            {subTab === "admin" &&
                (adminLoading ? (
                    <ListSkeleton />
                ) : adminFailed ? (
                    <Notice
                        title={t("sxClientDetailEventsLoadErrorTitle")}
                        description={t("sxClientDetailEventsLoadErrorDescription")}
                        onRetry={loadAdmin}
                    />
                ) : adminRows.length === 0 ? (
                    <Notice
                        title={t("sxClientDetailNoEventsTitle")}
                        description={t("sxClientDetailNoAdminEventsDescription")}
                    />
                ) : (
                    <ListGroup>
                        {adminRows.map((e, i) => (
                            <EventRow
                                key={i}
                                tone={adminOpTone(e.operationType)}
                                label={
                                    ADMIN_OP_LABELS[e.operationType]
                                        ? t(ADMIN_OP_LABELS[e.operationType])
                                        : (e.operationType ?? "—")
                                }
                                meta={
                                    [e.resourceType, e.resourcePath]
                                        .filter(Boolean)
                                        .join(" ") || "—"
                                }
                                ip={e.authDetails?.ipAddress}
                                time={e.time}
                            />
                        ))}
                    </ListGroup>
                ))}
        </div>
    );
}

const ADMIN_OP_LABELS: Record<string, string> = {
    CREATE: "sxClientDetailOpCreate",
    UPDATE: "sxClientDetailOpUpdate",
    DELETE: "sxClientDetailOpDelete",
    ACTION: "sxClientDetailOpAction"
};

const EVT_CHIP: Record<string, any> = {
    blue: "info",
    green: "success",
    red: "danger",
    amber: "warning",
    gray: "neutral"
};

function EventRow({ tone, label, meta, ip, time }: any) {
    return (
        <ListRow
            title={meta}
            subtitle={
                <>
                    {ip && (
                        <>
                            <span className="font-mono">{ip}</span>
                            {" · "}
                        </>
                    )}
                    <span className="tabular-nums">{fmtDate(time)}</span>
                </>
            }
            trailing={<Chip tone={EVT_CHIP[tone] || "neutral"}>{label}</Chip>}
        />
    );
}

function AdminPermissionsTab({ id, adminClient, addAlert, addError }: any) {
    const t = useT();
    const [features, setFeatures] = useState<any[] | null>(null);
    const [featuresFailed, setFeaturesFailed] = useState(false);
    const [featuresAttempt, setFeaturesAttempt] = useState(0);
    const [perm, setPerm] = useState<any>(null);
    const [permLoading, setPermLoading] = useState(false);
    const [permFailed, setPermFailed] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        setFeatures(null);
        setFeaturesFailed(false);
        adminClient.serverInfo
            .find()
            .then(
                (si: any) =>
                    alive && setFeatures(Array.isArray(si?.features) ? si.features : [])
            )
            .catch(() => alive && setFeaturesFailed(true));
        return () => {
            alive = false;
        };
    }, [adminClient, featuresAttempt]);

    const featureOn = (name: string) =>
        Array.isArray(features) &&
        features.some((f: any) => f?.name === name && f?.enabled);
    const v1On = featureOn("ADMIN_FINE_GRAINED_AUTHZ");
    const v2On = featureOn("ADMIN_FINE_GRAINED_AUTHZ_V2");

    const loadPerm = useCallback(async () => {
        setPermLoading(true);
        setPermFailed(false);
        try {
            const res = await adminClient.clients.listFineGrainPermissions({ id });
            setPerm(res ?? {});
        } catch (_err) {
            setPerm(null);
            setPermFailed(true);
        } finally {
            setPermLoading(false);
        }
    }, [adminClient, id]);

    useEffect(() => {
        if (v1On) loadPerm();
    }, [v1On, loadPerm]);

    const toggle = async (v: boolean) => {
        setSaving(true);
        try {
            await adminClient.clients.updateFineGrainPermission({ id }, { enabled: v });
            addAlert(
                v
                    ? t("sxClientDetailPermsEnabled")
                    : t("sxClientDetailPermsDisabled"),
                AlertVariant.success
            );
            await loadPerm();
        } catch (err) {
            addError(t("sxClientDetailPermsUpdateFailed"), err);
        } finally {
            setSaving(false);
        }
    };

    if (featuresFailed)
        return (
            <Notice
                title={t("sxClientDetailFeaturesLoadErrorTitle")}
                description={t("sxLoadErrorDescription")}
                onRetry={() => setFeaturesAttempt(n => n + 1)}
            />
        );

    if (features === null) return <ListSkeleton />;

    if (v2On) {
        return (
            <Notice
                title={t("sxClientDetailPermsV2Title")}
                description={t("sxClientDetailPermsV2Description")}
            />
        );
    }

    if (!v1On) {
        return (
            <Notice
                title={t("sxClientDetailPermsOffTitle")}
                description={t("sxClientDetailPermsOffDescription", {
                    v1: "--features=admin-fine-grained-authz",
                    v2: "--features=admin-fine-grained-authz:v2"
                })}
            />
        );
    }

    if (permLoading && perm === null) return <ListSkeleton />;

    if (permFailed)
        return (
            <Notice
                title={t("sxClientDetailPermsLoadErrorTitle")}
                description={t("sxLoadErrorDescription")}
                onRetry={loadPerm}
            />
        );

    const enabled = !!perm?.enabled;
    const scopePermissions = perm?.scopePermissions || {};
    const scopeEntries = Object.entries(scopePermissions);

    return (
        <div className="flex flex-col gap-6">
            <Section label={t("sxNavAdminPermissions")}>
                <Group>
                    <SwitchRow
                        label={t("sxClientDetailPermsToggle")}
                        hint={t("sxClientDetailPermsToggleHint")}
                        checked={enabled}
                        disabled={saving}
                        onChange={toggle}
                    />
                </Group>
            </Section>

            {enabled && scopeEntries.length > 0 && (
                <Section label={t("sxClientDetailScopePermissions")}>
                    <Group>
                        {scopeEntries.map(([scope, permId]: any) => (
                            <div
                                key={scope}
                                className="flex min-h-12 flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                            >
                                <span className="text-[15px] font-medium">{scope}</span>
                                <code className="min-w-0 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
                                    {String(permId)}
                                </code>
                            </div>
                        ))}
                    </Group>
                    <GroupFooter>
                        <Trans
                            i18nKey="sxClientDetailScopePermissionsFooter"
                            values={{ client: "realm-management" }}
                            components={{ mono: <span className="font-mono" /> }}
                        />
                    </GroupFooter>
                </Section>
            )}
        </div>
    );
}
