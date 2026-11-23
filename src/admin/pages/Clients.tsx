// @ts-nocheck

import { CheckCircleIcon, DownloadSimpleIcon, WarningIcon, XCircleIcon } from "@phosphor-icons/react";
import { Alert, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@ui/components/empty";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet
} from "@ui/components/field";
import { Input } from "@ui/components/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@ui/components/item";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Progress } from "@ui/components/progress";
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
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { ConfigForm } from "../components/ConfigForm";
import { MultiLineInput } from "../components/MultiLineInput";
import {
    AdminPage,
    Chip,
    Group,
    ListSkeleton,
    Notice,
    Pager,
    Row,
    SearchField,
    Section,
    SegmentTabs,
    TextAction
} from "../ui/kit";
import { i18n } from "../i18n/i18n";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";

const PAGE = 20;
const _lines = (s: string) =>
    s
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);

const TABS = [
    { value: "list", label: "sxClientsTabList" },
    { value: "iat", label: "sxClientsTabIat" },
    { value: "registration", label: "sxClientsTabRegistration" }
];

export default function Clients() {
    const t = useT();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const [tab, setTab] = useState("list");
    const [createOpen, setCreateOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    return (
        <AdminPage
            title={t("sxNavClients")}
            description={t("sxClientsDescription")}
            actions={
                tab === "list" ? (
                    <>
                        <Button variant="plain" onClick={() => setImportOpen(true)}>
                            {t("sxClientsImport")}
                        </Button>
                        <Button onClick={() => setCreateOpen(true)}>{t("sxClientsCreate")}</Button>
                    </>
                ) : undefined
            }
        >
            <SegmentTabs
                value={tab}
                onChange={setTab}
                items={TABS.map(item => ({ value: item.value, label: t(item.label) }))}
                ariaLabel={t("sxClientsSections")}
            />
            {tab === "list" && <ClientList onCreate={() => setCreateOpen(true)} />}
            {tab === "iat" && <InitialAccessTokens key={realm} />}
            {tab === "registration" && <ClientRegistration key={realm} />}

            {createOpen && (
                <CreateClient
                    onClose={() => setCreateOpen(false)}
                    onCreated={id => {
                        setCreateOpen(false);
                        navigate(`/${realm}/clients/${id}`);
                    }}
                />
            )}
            {importOpen && (
                <ImportClient
                    onClose={() => setImportOpen(false)}
                    onImported={id => {
                        setImportOpen(false);
                        navigate(`/${realm}/clients/${id}`);
                    }}
                />
            )}
        </AdminPage>
    );
}

function ClientList({ onCreate }: { onCreate: () => void }) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [clients, setClients] = useState<any[]>([]);
    const [first, setFirst] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [query, setQuery] = useState("");

    const load = async (firstArg = first, q = query) => {
        setStatus("loading");
        try {
            const params: any = { first: firstArg, max: PAGE + 1 };
            if (q.trim()) {
                params.clientId = q.trim();
                params.search = true;
            }
            const list = (await adminClient.clients.find(params)) ?? [];
            setHasMore(list.length > PAGE);
            setClients(list.slice(0, PAGE));
            setStatus("ready");
        } catch {
            setStatus("error");
        }
    };

    useEffect(() => {
        setFirst(0);
        load(0, query);
    }, [query]);

    useEffect(() => {
        const id = setTimeout(() => setQuery(searchInput.trim()), 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    const page = (dir: number) => {
        const f = Math.max(0, first + dir * PAGE);
        setFirst(f);
        load(f, query);
    };

    const _remove = (c: any) =>
        confirm({
            title: t("sxClientsDeleteTitle"),
            message: t("sxClientsDeleteMessage", { name: c.clientId }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.del({ id: c.id });
                    addAlert(t("sxClientsDeleted", { name: c.clientId }), AlertVariant.success);
                    load();
                } catch (e) {
                    addError(t("sxCommonDeleteFailed"), e as Error);
                }
            }
        });

    const protocolName = (p: string) =>
        p === "saml" ? "SAML" : p === "openid-connect" || !p ? "OpenID Connect" : p;
    const homeUrl = (c: any) => c.rootUrl || "";

    const exportClient = async (c: any) => {
        try {
            const rep = await adminClient.clients.findOne({ id: c.id });
            const blob = new Blob([JSON.stringify(rep, null, 2)], {
                type: "application/json"
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${c.clientId}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (e) {
            addError(t("sxClientsExportError"), e as Error);
        }
    };

    return (
        <>
            <SearchField value={searchInput} onChange={setSearchInput} placeholder={t("sxClientsSearch")} />

            <Section label={t("sxNavClients")}>
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice
                        title={t("sxClientsLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => load(first, query)}
                    />
                )}
                {status === "ready" && clients.length === 0 && (
                    <Notice
                        title={query ? t("sxClientsNoResults") : t("sxClientsEmpty")}
                        description={
                            query
                                ? t("sxClientsNoResultsDescription", { query })
                                : t("sxClientsEmptyDescription")
                        }
                        action={
                            !query && (
                                <Button size="sm" className="h-8.5 px-4 font-medium" onClick={onCreate}>
                                    {t("sxClientsCreate")}
                                </Button>
                            )
                        }
                    />
                )}
                {status === "ready" && clients.length > 0 && (
                    <Group>
                        {clients.map(c => {
                            const home = homeUrl(c);
                            const sub = (c.name && !/^\$\{.*\}$/.test(c.name) ? c.name : "") || (home && /^https?:\/\//.test(home) ? home : "");
                            return (
                                <li
                                    key={c.id}
                                    data-testid={`client-${c.clientId}`}
                                    className="flex items-center gap-3 pe-4 transition-colors hover:bg-black/3 dark:hover:bg-white/4"
                                >
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/${realm}/clients/${c.id}`)}
                                        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 ps-4 text-left outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/6"
                                    >
                                        <span className="grid size-10 shrink-0 place-items-center">
                                            <Monogram text={c.clientId} saml={c.protocol === "saml"} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-mono text-[15px] font-medium">
                                                {c.clientId}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                                                {[protocolName(c.protocol), sub].filter(Boolean).join(" · ")}
                                            </span>
                                        </span>
                                    </button>
                                    <TextAction className="hidden sm:inline-flex" onClick={() => exportClient(c)}>
                                        {t("sxClientsExport")}
                                    </TextAction>
                                    <button
                                        type="button"
                                        title={t("sxClientsExport")}
                                        aria-label={t("sxClientsExport")}
                                        onClick={() => exportClient(c)}
                                        className="grid size-8 shrink-0 place-items-center rounded-md text-primary outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50 sm:hidden"
                                    >
                                        <DownloadSimpleIcon className="size-4.5" />
                                    </button>
                                </li>
                            );
                        })}
                    </Group>
                )}
                {status === "ready" && (
                    <div className="mt-3">
                        <Pager
                            page={Math.floor(first / PAGE) + 1}
                            hasPrev={first > 0}
                            hasNext={hasMore}
                            onPrev={() => page(-1)}
                            onNext={() => page(1)}
                        />
                    </div>
                )}
            </Section>
            {confirmNode}
        </>
    );
}

const isXml = (text: string) => !!text.match(/(<.[^(><.)]+>)/g);

function ImportClient({
    onClose,
    onImported
}: {
    onClose: () => void;
    onImported: (id: string) => void;
}) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();

    const [imported, setImported] = useState<any>(null);
    const [fileName, setFileName] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const [clientId, setClientId] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [alwaysDisplay, setAlwaysDisplay] = useState(false);
    const [protocol, setProtocol] = useState("openid-connect");
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<any>(null);
    const fileInputRef = useRef<any>(null);

    const _reset = () => {
        setImported(null);
        setFileName("");
        setClientId("");
        setName("");
        setDescription("");
        setAlwaysDisplay(false);
        setProtocol("openid-connect");
    };

    const parseContents = async (contents: string) => {
        if (!isXml(contents)) return JSON.parse(contents);
        // SAML/XML descriptor → use Keycloak's client-description-converter.
        const token = await adminClient.getAccessToken();
        const base = adminClient.baseUrl.endsWith("/")
            ? adminClient.baseUrl
            : `${adminClient.baseUrl}/`;
        const res = await fetch(
            `${base}admin/realms/${realm}/client-description-converter`,
            {
                method: "POST",
                body: contents,
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
    };

    const handleFile = async (file: File) => {
        try {
            const contents = await file.text();
            const parsed = await parseContents(contents);
            setFileName(file.name);
            setImported(parsed);
            setClientId(parsed.clientId ?? "");
            setName(parsed.name ?? "");
            setDescription(parsed.description ?? "");
            setAlwaysDisplay(!!parsed.alwaysDisplayInConsole);
            setProtocol(parsed.protocol ?? "openid-connect");
        } catch (e) {
            addError(t("sxClientsParseError"), e as Error);
        }
    };

    const doImport = async () => {
        if (!clientId.trim()) return;
        setSaving(true);
        try {
            const { id: _drop, ...rest } = imported ?? {};
            const rep: any = {
                ...rest,
                clientId: clientId.trim(),
                name: name || undefined,
                description: description || undefined,
                protocol,
                alwaysDisplayInConsole: alwaysDisplay
            };
            const created = await adminClient.clients.create(rep);
            setResult({ ok: true, id: created.id, clientId: rep.clientId });
        } catch (e) {
            setResult({
                ok: false,
                message: (e as Error)?.message || t("sxCommonUnknownError")
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxClientsImportTitle")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {/* Single hidden picker, shared by the dropzone and the "Değiştir" action. */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.xml,application/json,text/xml,application/xml"
                        className="hidden"
                        onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) handleFile(f);
                            e.target.value = "";
                        }}
                    />

                    {result ? (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            {result.ok ? (
                                <CheckCircleIcon
                                    weight="fill"
                                    className="zoom-in-50 size-16 animate-in text-primary duration-300"
                                />
                            ) : (
                                <XCircleIcon
                                    weight="fill"
                                    className="zoom-in-50 size-16 animate-in text-destructive duration-300"
                                />
                            )}
                            <p className="text-base font-medium">
                                {result.ok
                                    ? t("sxClientsImportedName", { name: result.clientId })
                                    : t("sxClientsImportFailed")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {result.ok ? t("sxClientsImportedDescription") : result.message}
                            </p>
                        </div>
                    ) : !imported ? (
                        // Step 1 — the file IS the hero. Nothing else until something is parsed.
                        <Empty
                            role="button"
                            tabIndex={0}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={e =>
                                (e.key === "Enter" || e.key === " ") &&
                                fileInputRef.current?.click()
                            }
                            onDragOver={e => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={e => {
                                e.preventDefault();
                                setDragOver(false);
                                const f = e.dataTransfer.files?.[0];
                                if (f) handleFile(f);
                            }}
                            className={cn("cursor-pointer border", dragOver && "border-primary")}
                        >
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <DownloadSimpleIcon className="rotate-180" />
                                </EmptyMedia>
                                <EmptyTitle>{t("sxClientsDropFile")}</EmptyTitle>
                                <EmptyDescription>
                                    {t("sxClientsDropFileHint")}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        // Step 2 — file recognised; reveal what we detected.
                        <div className="space-y-4">
                            <Item variant="muted" size="sm">
                                <ItemMedia variant="icon">
                                    <CheckCircleIcon weight="fill" className="text-primary" />
                                </ItemMedia>
                                <ItemContent className="min-w-0">
                                    <ItemTitle>{fileName}</ItemTitle>
                                    <ItemDescription>
                                        {t("sxClientsDetected", {
                                            protocol: protocol === "saml" ? "SAML" : "OpenID Connect"
                                        })}
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {t("sxClientsChangeFile")}
                                    </Button>
                                </ItemActions>
                            </Item>

                            <Field>
                                <FieldLabel>{t("sxClientsClientId")} <span className="text-destructive">*</span></FieldLabel>
                                <Input
                                    value={clientId}
                                    onChange={e => setClientId(e.target.value)}
                                    placeholder="my-app"
                                />
                            </Field>
                            <Field>
                                <FieldLabel>{t("sxCommonName")}</FieldLabel>
                                <Input value={name} onChange={e => setName(e.target.value)} />
                            </Field>
                            <Field>
                                <FieldLabel>{t("sxCommonDescription")}</FieldLabel>
                                <Textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </Field>
                            <SwitchRow
                                label={t("sxClientsAlwaysDisplay")}
                                checked={alwaysDisplay}
                                onChange={setAlwaysDisplay}
                            />
                            <Field>
                                <FieldLabel>{t("sxCommonType")}</FieldLabel>
                                <div>
                                    <Chip tone={protocol === "saml" ? "neutral" : "info"}>
                                        {protocol === "saml" ? "SAML" : "OpenID Connect"}
                                    </Chip>
                                </div>
                            </Field>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    {result ? (
                        result.ok ? (
                            <Button
                                onClick={() => onImported(result.id)}
                            >
                                {t("sxClientsGoToClient")}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setResult(null)}
                            >
                                {t("sxClientsGoBack")}
                            </Button>
                        )
                    ) : (
                        <Button
                            disabled={!imported || !clientId.trim() || saving}
                            onClick={doImport}
                        >
                            {saving ? t("sxClientsImporting") : t("sxClientsImport")}
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function InitialAccessTokens() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [tokens, setTokens] = useState<any[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [created, setCreated] = useState<any>(null);

    const load = async () => {
        try {
            const list = await adminClient.realms.getClientsInitialAccess({ realm });
            setTokens(Array.isArray(list) ? list : []);
            setStatus("ready");
        } catch {
            setStatus("error");
        }
    };

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.realms
            .getClientsInitialAccess({ realm })
            .then(list => {
                if (!alive) return;
                setTokens(Array.isArray(list) ? list : []);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, realm, attempt]);

    const remove = (token: any) =>
        confirm({
            title: t("sxClientsIatDeleteTitle"),
            message: t("sxClientsIatDeleteMessage"),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.realms.delClientsInitialAccess({ realm, id: token.id });
                    addAlert(t("sxClientsIatDeleted"), AlertVariant.success);
                    load();
                } catch (e) {
                    addError(t("sxCommonDeleteFailed"), e as Error);
                }
            }
        });

    const fmt = (ts: number) => (ts ? new Date(ts * 1000).toLocaleString(i18n.language) : "—");

    return (
        <Section
            label={t("sxClientsIatLabel")}
            action={<TextAction onClick={() => setCreateOpen(true)}>{t("sxClientsIatCreate")}</TextAction>}
        >
            <p className="-mt-1 mb-3 px-0.5 text-[13px] text-muted-foreground">
                {t("sxClientsIatHint")}
            </p>
            {status === "loading" && <ListSkeleton />}
            {status === "error" && (
                <Notice
                    title={t("sxClientsIatLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            )}
            {status === "ready" && tokens.length === 0 && (
                <Notice
                    title={t("sxClientsIatEmpty")}
                    description={t("sxClientsIatEmptyDescription")}
                    action={
                        <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setCreateOpen(true)}>
                            {t("sxClientsIatCreate")}
                        </Button>
                    }
                />
            )}
            {status === "ready" && tokens.length > 0 && (
                <Group>
                    {tokens.map(token => (
                        <Row
                            key={token.id}
                            title={<span className="font-mono text-[15px]">{token.id}</span>}
                            subtitle={
                                token.expiration
                                    ? t("sxClientsIatMetaWithExpiry", {
                                          remaining: token.remainingCount ?? 0,
                                          total: token.count ?? 0,
                                          created: fmt(token.timestamp),
                                          expires: fmt(token.timestamp + token.expiration)
                                      })
                                    : t("sxClientsIatMeta", {
                                          remaining: token.remainingCount ?? 0,
                                          total: token.count ?? 0,
                                          created: fmt(token.timestamp)
                                      })
                            }
                            trailing={
                                <TextAction tone="danger" onClick={() => remove(token)}>
                                    {t("sxCommonDelete")}
                                </TextAction>
                            }
                        />
                    ))}
                </Group>
            )}

            {createOpen && (
                <CreateInitialAccessToken
                    onClose={() => setCreateOpen(false)}
                    onCreated={tok => {
                        setCreateOpen(false);
                        setCreated(tok);
                        load();
                    }}
                />
            )}

            {created && <ShowInitialAccessToken token={created} onClose={() => setCreated(null)} />}
            {confirmNode}
        </Section>
    );
}

function CreateInitialAccessToken({
    onClose,
    onCreated
}: {
    onClose: () => void;
    onCreated: (token: any) => void;
}) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [expiration, setExpiration] = useState(86400);
    const [count, setCount] = useState(1);
    const [saving, setSaving] = useState(false);

    const create = async () => {
        setSaving(true);
        try {
            const tok = await adminClient.realms.createClientsInitialAccess(
                { realm },
                { count: Number(count) || 1, expiration: Number(expiration) || 0 }
            );
            addAlert(t("sxClientsIatCreated"), AlertVariant.success);
            onCreated(tok);
        } catch (e) {
            addError(t("sxClientsIatCreateError"), e as Error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxClientsIatCreateTitle")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Field>
                            <FieldLabel>{t("sxClientsIatExpiration")}</FieldLabel>
                            <Input
                                type="number"
                                value={expiration}
                                onChange={e => setExpiration(e.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel>{t("sxClientsIatCount")}</FieldLabel>
                            <Input
                                type="number"
                                value={count}
                                onChange={e => setCount(e.target.value)}
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

function ShowInitialAccessToken({ token, onClose }: { token: any; onClose: () => void }) {
    const t = useT();
    const { addAlert } = useAlerts();
    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxClientsIatShowTitle")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Alert variant="destructive">
                            <WarningIcon />
                            <AlertTitle>{t("sxClientsIatShownOnce")}</AlertTitle>
                        </Alert>
                        <Field>
                            <FieldLabel>{t("sxClientsIatToken")}</FieldLabel>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={token?.token ?? ""}
                                    className="font-mono"
                                />
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        navigator.clipboard?.writeText(token?.token ?? "");
                                        addAlert(t("sxClientsIatCopied"), AlertVariant.success);
                                    }}
                                >
                                    {t("sxCommonCopy")}
                                </Button>
                            </div>
                        </Field>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

const POLICY_TYPE =
    "org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy";

function ClientRegistration() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [parentId, setParentId] = useState<string | undefined>(undefined);
    const [providers, setProviders] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);

    const [createSubType, setCreateSubType] = useState<string | null>(null);
    const [editPolicy, setEditPolicy] = useState<any>(null);

    const load = () => setAttempt(n => n + 1);

    useEffect(() => {
        let alive = true;
        (async () => {
            setStatus("loading");
            try {
                const info = await adminClient.serverInfo.find();
                const provs = info?.componentTypes?.[POLICY_TYPE] ?? [];
                const rr = await adminClient.realms.findOne({ realm });
                const pid = rr?.id;
                const list = await adminClient.components.find({
                    type: POLICY_TYPE,
                    parent: pid
                });
                if (alive) {
                    setProviders(Array.isArray(provs) ? provs : []);
                    setParentId(pid);
                    setPolicies(Array.isArray(list) ? list : []);
                    setStatus("ready");
                }
            } catch {
                if (alive) setStatus("error");
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, realm, attempt]);

    const remove = (p: any) =>
        confirm({
            title: t("sxClientsPolicyDeleteTitle"),
            message: t("sxClientsDeleteMessage", { name: p.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.components.del({ id: p.id });
                    addAlert(t("sxClientsPolicyDeleted"), AlertVariant.success);
                    load();
                } catch (e) {
                    addError(t("sxCommonDeleteFailed"), e as Error);
                }
            }
        });

    const renderPolicies = (subType: string) => {
        const list = policies.filter(p => p.subType === subType);
        if (list.length === 0) {
            return (
                <Notice
                    title={t("sxClientsPolicyEmpty")}
                    description={t("sxClientsPolicyEmptyDescription")}
                    action={
                        <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setCreateSubType(subType)}>
                            {t("sxClientsPolicyCreate")}
                        </Button>
                    }
                />
            );
        }
        return (
            <Group>
                {list.map(p => (
                    <li
                        key={p.id}
                        className="flex items-center gap-3 pe-4 transition-colors hover:bg-black/3 dark:hover:bg-white/4"
                    >
                        <button
                            type="button"
                            onClick={() => setEditPolicy(p)}
                            className="flex min-h-16 min-w-0 flex-1 flex-col justify-center py-3 ps-4 text-left outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/6"
                        >
                            <span className="w-full truncate text-base font-medium">{p.name}</span>
                            <span className="mt-0.5 w-full truncate text-[13px] text-muted-foreground">
                                {p.providerId}
                            </span>
                        </button>
                        <TextAction tone="danger" onClick={() => remove(p)}>
                            {t("sxCommonDelete")}
                        </TextAction>
                    </li>
                ))}
            </Group>
        );
    };

    if (status === "loading") return <ListSkeleton />;
    if (status === "error")
        return (
            <Notice
                title={t("sxClientsPolicyLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={() => setAttempt(n => n + 1)}
            />
        );

    return (
        <>
            <Section
                label={t("sxClientsPolicyAnonymous")}
                action={<TextAction onClick={() => setCreateSubType("anonymous")}>{t("sxClientsPolicyCreate")}</TextAction>}
            >
                <p className="-mt-1 mb-3 px-0.5 text-[13px] text-muted-foreground">
                    {t("sxClientsPolicyAnonymousHint")}
                </p>
                {renderPolicies("anonymous")}
            </Section>
            <Section
                label={t("sxClientsPolicyAuthenticated")}
                action={
                    <TextAction onClick={() => setCreateSubType("authenticated")}>{t("sxClientsPolicyCreate")}</TextAction>
                }
            >
                <p className="-mt-1 mb-3 px-0.5 text-[13px] text-muted-foreground">
                    {t("sxClientsPolicyAuthenticatedHint")}
                </p>
                {renderPolicies("authenticated")}
            </Section>

            {createSubType && (
                <CreatePolicy
                    subType={createSubType}
                    parentId={parentId}
                    providers={providers}
                    onClose={() => setCreateSubType(null)}
                    onCreated={() => {
                        setCreateSubType(null);
                        load();
                    }}
                />
            )}
            {editPolicy && (
                <EditPolicy
                    policy={editPolicy}
                    providers={providers}
                    onClose={() => setEditPolicy(null)}
                    onSaved={() => {
                        setEditPolicy(null);
                        load();
                    }}
                />
            )}
            {confirmNode}
        </>
    );
}

function CreatePolicy({ subType, parentId, providers, onClose, onCreated }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [providerId, setProviderId] = useState<string>(providers?.[0]?.id ?? "");
    const [name, setName] = useState<string>(providers?.[0]?.id ?? "");
    const [config, setConfig] = useState<any>({});
    const [busy, setBusy] = useState(false);

    const selectedProvider = (providers || []).find((p: any) => p.id === providerId);

    const pickProvider = (id: string) => {
        setProviderId(id);
        setName(id);
        setConfig({});
    };

    const submit = async () => {
        if (!providerId) {
            addAlert(t("sxClientsPolicySelectProvider"), AlertVariant.danger);
            return;
        }
        setBusy(true);
        try {
            await adminClient.components.create({
                name: name || providerId,
                providerId,
                providerType: POLICY_TYPE,
                parentId,
                subType,
                config
            });
            addAlert(t("sxClientsPolicyCreated"), AlertVariant.success);
            onCreated();
        } catch (e) {
            addError(t("sxCommonCreateFailed"), e as Error);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxClientsPolicyCreate")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Field>
                            <FieldLabel>{t("sxClientsPolicyProvider")}</FieldLabel>
                            <NativeSelect
                                className="w-full"
                                value={providerId}
                                onChange={(e: any) => pickProvider(e.target.value)}
                            >
                                {(providers || []).map((p: any) => (
                                    <NativeSelectOption key={p.id} value={p.id}>
                                        {p.id}
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                        </Field>
                        <Field>
                            <FieldLabel>{t("sxCommonName")}</FieldLabel>
                            <Input value={name} onChange={(e: any) => setName(e.target.value)} />
                        </Field>
                        {selectedProvider && (
                            <ConfigForm
                                properties={selectedProvider.properties}
                                value={config}
                                onChange={(n: string, v: string[]) =>
                                    setConfig((c: any) => ({ ...c, [n]: v }))
                                }
                            />
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={busy}
                        onClick={submit}
                    >
                        {t("sxCommonCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function EditPolicy({ policy, providers, onClose, onSaved }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [component, setComponent] = useState<any>(null);
    const [name, setName] = useState<string>(policy?.name ?? "");
    const [config, setConfig] = useState<any>({});
    const [busy, setBusy] = useState(false);

    const provider = (providers || []).find((p: any) => p.id === policy?.providerId);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setLoadError(false);
            try {
                const comp = await adminClient.components.findOne({ id: policy.id });
                if (alive) {
                    setComponent(comp);
                    setName(comp?.name ?? policy.name ?? "");
                    setConfig(comp?.config ?? {});
                }
            } catch {
                if (alive) setLoadError(true);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line
    }, [adminClient, policy?.id, policy?.name, attempt]);

    const submit = async () => {
        setBusy(true);
        try {
            await adminClient.components.update(
                { id: policy.id },
                { ...(component || policy), name, config }
            );
            addAlert(t("sxClientsPolicySaved"), AlertVariant.success);
            onSaved();
        } catch (e) {
            addError(t("sxCommonSaveFailed"), e as Error);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{policy?.name}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {loading ? (
                        <ListSkeleton rows={2} />
                    ) : loadError ? (
                        <Notice
                            title={t("sxClientsPolicyLoadOneError")}
                            description={t("sxLoadErrorDescription")}
                            onRetry={() => setAttempt(n => n + 1)}
                        />
                    ) : (
                        <div className="space-y-4">
                            <Field>
                                <FieldLabel>{t("sxCommonName")}</FieldLabel>
                                <Input
                                    value={name}
                                    onChange={(e: any) => setName(e.target.value)}
                                />
                            </Field>
                            <ConfigForm
                                properties={provider?.properties}
                                value={config}
                                onChange={(n: string, v: string[]) =>
                                    setConfig((c: any) => ({ ...c, [n]: v }))
                                }
                            />
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        disabled={busy || loading || loadError}
                        onClick={submit}
                    >
                        {t("sxCommonSave")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function CreateClient({
    onClose,
    onCreated
}: {
    onClose: () => void;
    onCreated: (id: string) => void;
}) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [saving, setSaving] = useState(false);

    const [protocol, setProtocol] = useState("openid-connect");
    const [clientId, setClientId] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [alwaysDisplay, setAlwaysDisplay] = useState(false);

    const [clientAuth, setClientAuth] = useState(true); // true = confidential
    const [authz, setAuthz] = useState(false);
    const [standardFlow, setStandardFlow] = useState(true);
    const [directAccess, setDirectAccess] = useState(true);
    const [implicitFlow, setImplicitFlow] = useState(false);
    const [serviceAccounts, setServiceAccounts] = useState(false);
    const [standardTokenExchange, setStandardTokenExchange] = useState(false);
    const [jwtGrant, setJwtGrant] = useState(false);
    const [deviceGrant, setDeviceGrant] = useState(false);
    const [cibaGrant, setCibaGrant] = useState(false);
    const [requirePkce, setRequirePkce] = useState(false);
    const [dpop, setDpop] = useState(false);

    const [rootUrl, setRootUrl] = useState("");
    const [baseUrl, setBaseUrl] = useState("");
    const [redirectUris, setRedirectUris] = useState<string[]>([]);
    const [postLogout, setPostLogout] = useState<string[]>([]);
    const [webOrigins, setWebOrigins] = useState<string[]>([]);
    // SAML-only
    const [idpSsoUrlName, setIdpSsoUrlName] = useState("");
    const [idpSsoRelayState, setIdpSsoRelayState] = useState("");
    const [masterSamlUrl, setMasterSamlUrl] = useState("");

    // Wizard — OIDC has a capability step, SAML does not.
    const [step, setStep] = useState(0);
    const [result, setResult] = useState<any>(null); // null | { ok, id, clientId } | { ok:false, message }

    const oidc = protocol === "openid-connect";
    const stepMeta = oidc
        ? [
              {
                  title: t("sxClientsStepGeneral"),
                  desc: t("sxClientsStepGeneralDescription")
              },
              {
                  title: t("sxClientsStepCapability"),
                  desc: t("sxClientsStepCapabilityDescription")
              },
              {
                  title: t("sxClientsStepLogin"),
                  desc: t("sxClientsStepLoginDescription")
              }
          ]
        : [
              {
                  title: t("sxClientsStepGeneral"),
                  desc: t("sxClientsStepGeneralDescription")
              },
              {
                  title: t("sxClientsStepLogin"),
                  desc: t("sxClientsStepLoginSamlDescription")
              }
          ];
    const lastStep = stepMeta.length - 1;
    const loginStep = lastStep; // login settings are always the final step

    // When client authentication is turned off (public), reset confidential-only capabilities.
    const onClientAuthChange = (v: boolean) => {
        setClientAuth(v);
        if (!v) {
            setAuthz(false);
            setServiceAccounts(false);
            setCibaGrant(false);
            setStandardTokenExchange(false);
            setJwtGrant(false);
        }
    };
    const onAuthzChange = (v: boolean) => {
        setAuthz(v);
        if (v) setServiceAccounts(true);
    };

    const create = async () => {
        setSaving(true);
        try {
            const attributes: any = {
                "post.logout.redirect.uris": postLogout.join("##")
            };
            const rep: any = {
                clientId: clientId.trim(),
                name: name || undefined,
                description: description || undefined,
                protocol,
                enabled: true,
                alwaysDisplayInConsole: alwaysDisplay,
                rootUrl: rootUrl || undefined,
                baseUrl: baseUrl || undefined,
                redirectUris: redirectUris,
                attributes
            };
            if (oidc) {
                rep.publicClient = !clientAuth;
                rep.authorizationServicesEnabled = authz || undefined;
                rep.serviceAccountsEnabled = serviceAccounts;
                rep.standardFlowEnabled = standardFlow;
                rep.directAccessGrantsEnabled = directAccess;
                rep.implicitFlowEnabled = implicitFlow;
                rep.webOrigins = webOrigins;
                attributes["oauth2.device.authorization.grant.enabled"] =
                    String(deviceGrant);
                attributes["oidc.ciba.grant.enabled"] = String(cibaGrant);
                attributes["standard.token.exchange.enabled"] =
                    String(standardTokenExchange);
                attributes["oauth2.jwt.authorization.grant.enabled"] = String(jwtGrant);
                attributes["pkce.code.challenge.method"] = requirePkce ? "S256" : "";
                attributes["dpop.bound.access.tokens"] = String(dpop);
            } else {
                rep.adminUrl = masterSamlUrl || undefined;
                attributes.saml_idp_initiated_sso_url_name = idpSsoUrlName;
                attributes.saml_idp_initiated_sso_relay_state = idpSsoRelayState;
            }
            const created = await adminClient.clients.create(rep);
            setResult({ ok: true, id: created.id, clientId: rep.clientId });
        } catch (e) {
            setResult({
                ok: false,
                message: (e as Error)?.message || t("sxCommonUnknownError")
            });
        } finally {
            setSaving(false);
        }
    };

    const canNext = step !== 0 || !!clientId.trim();

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxClientsCreate")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {result ? (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            {result.ok ? (
                                <CheckCircleIcon
                                    weight="fill"
                                    className="zoom-in-50 size-16 animate-in text-primary duration-300"
                                />
                            ) : (
                                <XCircleIcon
                                    weight="fill"
                                    className="zoom-in-50 size-16 animate-in text-destructive duration-300"
                                />
                            )}
                            <p className="text-base font-medium">
                                {result.ok
                                    ? t("sxClientsCreatedName", { name: result.clientId })
                                    : t("sxClientsCreateError")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {result.ok ? t("sxClientsCreatedDescription") : result.message}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="space-y-2.5">
                                <Progress
                                    value={((step + 1) / stepMeta.length) * 100}
                                    aria-label={t("sxClientsStepOf", { step: step + 1, total: stepMeta.length })}
                                />
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {t("sxClientsStepOf", { step: step + 1, total: stepMeta.length })}
                                    </p>
                                    <p className="text-base font-semibold tracking-tight">
                                        {stepMeta[step].title}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {stepMeta[step].desc}
                                    </p>
                                </div>
                            </div>

                            {step === 0 && (
                                <div className="space-y-3">
                                    <Field>
                                        <FieldLabel>{t("sxClientsClientType")}</FieldLabel>
                                        <NativeSelect
                                            className="w-full"
                                            value={protocol}
                                            onChange={e => setProtocol(e.target.value)}
                                        >
                                            <NativeSelectOption value="openid-connect">OpenID Connect</NativeSelectOption>
                                            <NativeSelectOption value="saml">SAML</NativeSelectOption>
                                        </NativeSelect>
                                    </Field>
                                    <Field>
                                        <FieldLabel>{t("sxClientsClientId")} <span className="text-destructive">*</span></FieldLabel>
                                        <Input
                                            value={clientId}
                                            onChange={e => setClientId(e.target.value)}
                                            placeholder="my-app"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>{t("sxCommonName")}</FieldLabel>
                                        <Input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>{t("sxCommonDescription")}</FieldLabel>
                                        <Textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </Field>
                                    <SwitchRow
                                        label={t("sxClientsAlwaysDisplay")}
                                        checked={alwaysDisplay}
                                        onChange={setAlwaysDisplay}
                                    />
                                </div>
                            )}

                            {step === 1 && oidc && (
                                <div className="space-y-4">
                                    <FieldGroup variant="inset">
                                        <SwitchRow
                                            label={t("sxClientsClientAuth")}
                                            checked={clientAuth}
                                            onChange={onClientAuthChange}
                                        />
                                        <SwitchRow
                                            label={t("sxClientsAuthorization")}
                                            checked={authz && clientAuth}
                                            disabled={!clientAuth}
                                            onChange={onAuthzChange}
                                        />
                                    </FieldGroup>

                                    <FieldSet>
                                        <FieldLegend variant="label">
                                            {t("sxClientsAuthFlow")}
                                        </FieldLegend>
                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                            <CheckRow
                                                label={t("sxClientsStandardFlow")}
                                                checked={standardFlow}
                                                onChange={setStandardFlow}
                                            />
                                            <CheckRow
                                                label={t("sxClientsDirectAccess")}
                                                checked={directAccess}
                                                onChange={setDirectAccess}
                                            />
                                            <CheckRow
                                                label={t("sxClientsImplicitFlow")}
                                                checked={implicitFlow}
                                                onChange={setImplicitFlow}
                                            />
                                            <CheckRow
                                                label={t("sxClientsServiceAccounts")}
                                                checked={serviceAccounts}
                                                disabled={!clientAuth || authz}
                                                onChange={setServiceAccounts}
                                            />
                                            <CheckRow
                                                label={t("sxClientsTokenExchange")}
                                                checked={standardTokenExchange && clientAuth}
                                                disabled={!clientAuth}
                                                onChange={setStandardTokenExchange}
                                            />
                                            <CheckRow
                                                label={t("sxClientsJwtGrant")}
                                                checked={jwtGrant && clientAuth}
                                                disabled={!clientAuth}
                                                onChange={setJwtGrant}
                                            />
                                            <CheckRow
                                                label={t("sxClientsDeviceGrant")}
                                                checked={deviceGrant}
                                                onChange={setDeviceGrant}
                                            />
                                            <CheckRow
                                                label={t("sxClientsCibaGrant")}
                                                checked={cibaGrant}
                                                disabled={!clientAuth}
                                                onChange={setCibaGrant}
                                            />
                                        </div>
                                    </FieldSet>

                                    <FieldGroup variant="inset">
                                        <SwitchRow
                                            label={t("sxClientsRequirePkce")}
                                            checked={requirePkce}
                                            onChange={setRequirePkce}
                                        />
                                        <SwitchRow
                                            label={t("sxClientsRequireDpop")}
                                            checked={dpop}
                                            onChange={setDpop}
                                        />
                                    </FieldGroup>
                                </div>
                            )}

                            {step === loginStep && (
                                <div className="space-y-3">
                                    <Field>
                                        <FieldLabel>{t("sxClientsRootUrl")}</FieldLabel>
                                        <Input
                                            value={rootUrl}
                                            onChange={e => setRootUrl(e.target.value)}
                                            placeholder="https://app.example.com"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>{t("sxClientsHomeUrl")}</FieldLabel>
                                        <Input
                                            value={baseUrl}
                                            onChange={e => setBaseUrl(e.target.value)}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>{t("sxClientsRedirectUris")}</FieldLabel>
                                        <MultiLineInput
                                            value={redirectUris}
                                            onChange={setRedirectUris}
                                            addLabel={t("sxClientsAddRedirectUri")}
                                            placeholder="https://app.example.com/*"
                                        />
                                        <FieldDescription>{t("sxClientsRedirectUrisHint")}</FieldDescription>
                                    </Field>
                                    <Field>
                                        <FieldLabel>{t("sxClientsPostLogoutUris")}</FieldLabel>
                                        <MultiLineInput
                                            value={postLogout}
                                            onChange={setPostLogout}
                                            addLabel={t("sxClientsAddPostLogoutUri")}
                                            placeholder="+"
                                        />
                                        <FieldDescription>{t("sxClientsPostLogoutUrisHint")}</FieldDescription>
                                    </Field>
                                    {oidc && (
                                        <Field>
                                            <FieldLabel>{t("sxClientsWebOrigins")}</FieldLabel>
                                            <MultiLineInput
                                                value={webOrigins}
                                                onChange={setWebOrigins}
                                                addLabel={t("sxClientsAddWebOrigin")}
                                                placeholder="+"
                                            />
                                            <FieldDescription>{t("sxClientsWebOriginsHint")}</FieldDescription>
                                        </Field>
                                    )}
                                    {!oidc && (
                                        <>
                                            <Field>
                                                <FieldLabel>{t("sxClientsIdpSsoUrlName")}</FieldLabel>
                                                <Input
                                                    value={idpSsoUrlName}
                                                    onChange={e =>
                                                        setIdpSsoUrlName(e.target.value)
                                                    }
                                                />
                                                <FieldDescription>{t("sxClientsIdpSsoUrlNameHint")}</FieldDescription>
                                            </Field>
                                            <Field>
                                                <FieldLabel>{t("sxClientsIdpSsoRelayState")}</FieldLabel>
                                                <Input
                                                    value={idpSsoRelayState}
                                                    onChange={e =>
                                                        setIdpSsoRelayState(e.target.value)
                                                    }
                                                />
                                                <FieldDescription>{t("sxClientsIdpSsoRelayStateHint")}</FieldDescription>
                                            </Field>
                                            <Field>
                                                <FieldLabel>{t("sxClientsMasterSamlUrl")}</FieldLabel>
                                                <Input
                                                    value={masterSamlUrl}
                                                    onChange={e =>
                                                        setMasterSamlUrl(e.target.value)
                                                    }
                                                    placeholder="https://app.example.com/saml"
                                                />
                                                <FieldDescription>{t("sxClientsMasterSamlUrlHint")}</FieldDescription>
                                            </Field>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    {result ? (
                        result.ok ? (
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={onClose}
                                >
                                    {t("sxCommonClose")}
                                </Button>
                                <Button
                                                                        className="flex-1"
                                    onClick={() => onCreated(result.id)}
                                >
                                    {t("sxClientsGoToClient")}
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={() => setResult(null)}
                            >
                                {t("sxClientsGoBack")}
                            </Button>
                        )
                    ) : (
                        <div className="flex gap-2">
                            {step > 0 && (
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setStep(s => s - 1)}
                                >
                                    {t("sxCommonBack")}
                                </Button>
                            )}
                            {step < lastStep ? (
                                <Button
                                                                        className="flex-1"
                                    disabled={!canNext}
                                    onClick={() => setStep(s => s + 1)}
                                >
                                    {t("sxCommonNext")}
                                </Button>
                            ) : (
                                <Button
                                                                        className="flex-1"
                                    disabled={saving}
                                    onClick={create}
                                >
                                    {saving ? t("sxCommonCreating") : t("sxCommonCreate")}
                                </Button>
                            )}
                        </div>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function Monogram({ text, saml }: { text?: string; saml?: boolean }) {
    const ch = (text || "?").trim().charAt(0).toUpperCase() || "?";
    return (
        <span
            data-protocol={saml ? "saml" : "oidc"}
            className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-[13px] font-semibold text-white dark:bg-[#48484a]"
        >
            {ch}
        </span>
    );
}

function CheckRow({ label, checked, onChange, disabled }: any) {
    return (
        <Field orientation="horizontal" data-disabled={disabled || undefined}>
            <Checkbox
                checked={!!checked}
                disabled={disabled}
                onCheckedChange={(v: any) => onChange(v === true)}
            />
            <FieldLabel>{label}</FieldLabel>
        </Field>
    );
}

function SwitchRow({ label, hint, checked, onChange, disabled }: any) {
    return (
        <Field orientation="horizontal" data-disabled={disabled || undefined}>
            <FieldContent>
                <FieldLabel>{label}</FieldLabel>
                {hint && <FieldDescription>{hint}</FieldDescription>}
            </FieldContent>
            <Switch
                checked={!!checked}
                disabled={disabled}
                onCheckedChange={(v: boolean) => onChange(v)}
            />
        </Field>
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
