// @ts-nocheck

import {
    AppWindowIcon,
    CaretRightIcon,
    CheckCircleIcon,
    DownloadSimpleIcon,
    KeyIcon,
    MagnifyingGlassIcon,
    TrashIcon,
    WarningIcon,
    XCircleIcon
} from "@phosphor-icons/react";
import { Alert, AlertTitle } from "@ui/components/alert";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@ui/components/card";
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
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet
} from "@ui/components/field";
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
import { Progress } from "@ui/components/progress";
import { Spinner } from "@ui/components/spinner";
import { Switch } from "@ui/components/switch";
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
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { ConfigForm } from "../components/ConfigForm";
import { MultiLineInput } from "../components/MultiLineInput";
import { useRealm } from "../ui/realm";

const PAGE = 20;
const _lines = (s: string) =>
    s
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);

export default function Clients() {
    const { realm } = useRealm();
    const [tab, setTab] = useState("list");

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-7">
                <h1 className="text-3xl font-semibold tracking-tight">İstemciler</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Realm’inize bağlı uygulamalar ve servisler.
                </p>
            </div>
            <Tabs value={tab} onValueChange={setTab} className="mb-5">
                <TabsList variant="line">
                    <TabsTrigger value="list">İstemci listesi</TabsTrigger>
                    <TabsTrigger value="iat">İlk Erişim Token'ı</TabsTrigger>
                    <TabsTrigger value="registration">İstemci Kaydı</TabsTrigger>
                </TabsList>
            </Tabs>
            {tab === "list" && <ClientList />}
            {tab === "iat" && <InitialAccessTokens key={realm} />}
            {tab === "registration" && <ClientRegistration key={realm} />}
        </div>
    );
}

function ClientList() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<any[]>([]);
    const [first, setFirst] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [query, setQuery] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    const load = async (firstArg = first, q = query) => {
        setLoading(true);
        try {
            const params: any = { first: firstArg, max: PAGE + 1 };
            if (q.trim()) {
                params.clientId = q.trim();
                params.search = true;
            }
            const list = (await adminClient.clients.find(params)) ?? [];
            setHasMore(list.length > PAGE);
            setClients(list.slice(0, PAGE));
        } catch (e) {
            addError("İstemciler yüklenemedi", e as Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setFirst(0);
        load(0, query);
        // eslint-disable-next-line
    }, [query, load]);

    // Live, debounced search — no separate "Ara" button.
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
            title: "İstemciyi sil",
            message: `“${c.clientId}” kalıcı olarak silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clients.del({ id: c.id });
                    addAlert(`“${c.clientId}” silindi.`, AlertVariant.success);
                    load();
                } catch (e) {
                    addError("Silme başarısız", e as Error);
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
            addError("Dışa aktarılamadı", e as Error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Toolbar — calm search on the left, a single emphasized action on the right */}
            <div className="flex flex-wrap items-center gap-3">
                <InputGroup className="w-full sm:w-80">
                    <InputGroupAddon>
                        <MagnifyingGlassIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        type="text"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="İstemci ID ara"
                    />
                </InputGroup>
                <div className="flex gap-2 sm:ml-auto">
                    <Button
                        variant="ghost"
                        onClick={() => setImportOpen(true)}
                    >
                        İçe aktar
                    </Button>
                    <Button
                        onClick={() => setCreateOpen(true)}
                    >
                        İstemci oluştur
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Spinner className="size-6" />
                </div>
            ) : clients.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <AppWindowIcon />
                        </EmptyMedia>
                        <EmptyTitle>
                            {query ? "Sonuç bulunamadı" : "Henüz istemci yok"}
                        </EmptyTitle>
                        <EmptyDescription>
                            {query
                                ? `“${query}” ile eşleşen bir istemci yok.`
                                : "İlk uygulamanı bağlamak için bir istemci oluştur."}
                        </EmptyDescription>
                    </EmptyHeader>
                    {!query && (
                        <EmptyContent>
                            <Button onClick={() => setCreateOpen(true)}>İstemci oluştur</Button>
                        </EmptyContent>
                    )}
                </Empty>
            ) : (
                <div className="space-y-4">
                    <ItemGroup variant="inset">
                        {clients.map((c, i) => {
                            const home = homeUrl(c);
                            const sub =
                                c.name ||
                                (home && /^https?:\/\//.test(home) ? home : "");
                            const go = () => navigate(`/${realm}/clients/${c.id}`);
                            return (
                                <Fragment key={c.id}>
                                    {i > 0 && <ItemSeparator />}
                                    <Item
                                        size="sm"
                                        role="button"
                                        tabIndex={0}
                                        className="cursor-pointer"
                                        onClick={go}
                                        onKeyDown={e =>
                                            e.target === e.currentTarget &&
                                            (e.key === "Enter" || e.key === " ") &&
                                            go()
                                        }
                                    >
                                        <ItemMedia>
                                            <Monogram
                                                text={c.clientId}
                                                saml={c.protocol === "saml"}
                                            />
                                        </ItemMedia>
                                        <ItemContent className="min-w-0">
                                            <ItemTitle>
                                                <span className="truncate font-mono">
                                                    {c.clientId}
                                                </span>
                                                <Badge variant="secondary">
                                                    {protocolName(c.protocol)}
                                                </Badge>
                                            </ItemTitle>
                                            <ItemDescription className="truncate">
                                                {sub || "—"}
                                            </ItemDescription>
                                        </ItemContent>
                                        <ItemActions>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="Dışa aktar"
                                                aria-label="Dışa aktar"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    exportClient(c);
                                                }}
                                            >
                                                <DownloadSimpleIcon />
                                            </Button>
                                            <CaretRightIcon
                                                className="text-muted-foreground rtl:rotate-180"
                                                weight="bold"
                                            />
                                        </ItemActions>
                                    </Item>
                                </Fragment>
                            );
                        })}
                    </ItemGroup>
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm text-muted-foreground tabular-nums">
                            {`${first + 1}–${first + clients.length}`}
                        </span>
                        <div className="flex gap-1.5">
                            <Button
                                variant="ghost"
                                disabled={first === 0}
                                onClick={() => page(-1)}
                            >
                                Önceki
                            </Button>
                            <Button
                                variant="ghost"
                                disabled={!hasMore}
                                onClick={() => page(1)}
                            >
                                Sonraki
                            </Button>
                        </div>
                    </div>
                </div>
            )}

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
            {confirmNode}
        </div>
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
            addError("Dosya ayrıştırılamadı", e as Error);
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
                message: (e as Error)?.message || "Bilinmeyen bir hata oluştu."
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>İstemci içe aktar</ModalTitle>
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
                                    ? `“${result.clientId}” içe aktarıldı`
                                    : "İçe aktarma başarısız"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {result.ok ? "İstemci başarıyla içe aktarıldı." : result.message}
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
                                <EmptyTitle>Dosyayı buraya bırakın</EmptyTitle>
                                <EmptyDescription>
                                    veya seçmek için tıklayın · JSON veya XML
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
                                        {protocol === "saml" ? "SAML" : "OpenID Connect"}{" "}
                                        istemcisi algılandı
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Değiştir
                                    </Button>
                                </ItemActions>
                            </Item>

                            <Field>
                                <FieldLabel>İstemci ID <span className="text-destructive">*</span></FieldLabel>
                                <Input
                                    value={clientId}
                                    onChange={e => setClientId(e.target.value)}
                                    placeholder="my-app"
                                />
                            </Field>
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
                            <SwitchRow
                                label="Kullanıcı arayüzünde her zaman göster"
                                checked={alwaysDisplay}
                                onChange={setAlwaysDisplay}
                            />
                            <Field>
                                <FieldLabel>Tür</FieldLabel>
                                <div>
                                    <Badge variant={protocol === "saml" ? "outline" : "default"}>
                                        {protocol === "saml" ? "SAML" : "OpenID Connect"}
                                    </Badge>
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
                                İstemciye git
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setResult(null)}
                            >
                                Geri dön
                            </Button>
                        )
                    ) : (
                        <Button
                            disabled={!imported || !clientId.trim() || saving}
                            onClick={doImport}
                        >
                            {saving ? "İçe aktarılıyor…" : "İçe aktar"}
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function InitialAccessTokens() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const [loading, setLoading] = useState(true);
    const [tokens, setTokens] = useState<any[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [created, setCreated] = useState<any>(null);

    const load = async () => {
        setLoading(true);
        try {
            const list = await adminClient.realms.getClientsInitialAccess({ realm });
            setTokens(Array.isArray(list) ? list : []);
        } catch (e) {
            addError("Token'lar yüklenemedi", e as Error);
            setTokens([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const list = await adminClient.realms.getClientsInitialAccess({ realm });
                if (alive) setTokens(Array.isArray(list) ? list : []);
            } catch (e) {
                if (alive) {
                    addError("Token'lar yüklenemedi", e as Error);
                    setTokens([]);
                }
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line
    }, [adminClient, realm, addError]);

    const remove = (t: any) =>
        confirm({
            title: "Token'ı sil",
            message: "Bu ilk erişim token'ı kalıcı olarak silinecek. Emin misiniz?",
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.realms.delClientsInitialAccess({ realm, id: t.id });
                    addAlert("Token silindi.", AlertVariant.success);
                    load();
                } catch (e) {
                    addError("Silme başarısız", e as Error);
                }
            }
        });

    const fmt = (ts: number) => (ts ? new Date(ts * 1000).toLocaleString("tr-TR") : "—");

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    Yeni istemcileri kaydetmek için kullanılan tek seferlik token'lar.
                </p>
                <Button
                    onClick={() => setCreateOpen(true)}
                >
                    Token oluştur
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Spinner className="size-6" />
                </div>
            ) : tokens.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <KeyIcon />
                        </EmptyMedia>
                        <EmptyTitle>Token yok</EmptyTitle>
                        <EmptyDescription>
                            İlk erişim token'ı oluşturarak istemci kaydına izin ver.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button onClick={() => setCreateOpen(true)}>Token oluştur</Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <ItemGroup variant="inset">
                    {tokens.map((t, i) => (
                        <Fragment key={t.id}>
                            {i > 0 && <ItemSeparator />}
                            <Item size="sm">
                                <ItemContent className="min-w-0">
                                    <ItemTitle className="font-mono">{t.id}</ItemTitle>
                                    <ItemDescription className="truncate">
                                        Kalan {t.remainingCount ?? 0}/{t.count ?? 0} ·
                                        Oluşturma {fmt(t.timestamp)}
                                        {t.expiration
                                            ? ` · Sona erme ${fmt(t.timestamp + t.expiration)}`
                                            : ""}
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        title="Sil"
                                        aria-label="Sil"
                                        onClick={() => remove(t)}
                                    >
                                        <TrashIcon />
                                    </Button>
                                </ItemActions>
                            </Item>
                        </Fragment>
                    ))}
                </ItemGroup>
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

            {created && (
                <ShowInitialAccessToken
                    token={created}
                    onClose={() => setCreated(null)}
                />
            )}
            {confirmNode}
        </div>
    );
}

function CreateInitialAccessToken({
    onClose,
    onCreated
}: {
    onClose: () => void;
    onCreated: (t: any) => void;
}) {
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
            addAlert("İlk erişim token'ı oluşturuldu.", AlertVariant.success);
            onCreated(tok);
        } catch (e) {
            addError("Token oluşturulamadı", e as Error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>İlk erişim token'ı oluştur</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Field>
                            <FieldLabel>Sona erme (saniye)</FieldLabel>
                            <Input
                                type="number"
                                value={expiration}
                                onChange={e => setExpiration(e.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel>Sayı</FieldLabel>
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
                        Oluştur
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function ShowInitialAccessToken({ token, onClose }: { token: any; onClose: () => void }) {
    const { addAlert } = useAlerts();
    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>İlk erişim token'ı</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Alert variant="destructive">
                            <WarningIcon />
                            <AlertTitle>Bu token bir daha gösterilmeyecek.</AlertTitle>
                        </Alert>
                        <Field>
                            <FieldLabel>Token</FieldLabel>
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
                                        addAlert("Token kopyalandı.", AlertVariant.success);
                                    }}
                                >
                                    Kopyala
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
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const [loading, setLoading] = useState(true);
    const [parentId, setParentId] = useState<string | undefined>(undefined);
    const [providers, setProviders] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);

    const [createSubType, setCreateSubType] = useState<string | null>(null);
    const [editPolicy, setEditPolicy] = useState<any>(null);

    const load = async () => {
        setLoading(true);
        try {
            const rr = await adminClient.realms.findOne({ realm });
            const pid = rr?.id;
            setParentId(pid);
            const list = await adminClient.components.find({
                type: POLICY_TYPE,
                parent: pid
            });
            setPolicies(Array.isArray(list) ? list : []);
        } catch (e) {
            addError("Politikalar yüklenemedi", e as Error);
            setPolicies([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                let provs: any[] = [];
                try {
                    const info = await adminClient.serverInfo.find();
                    provs = info?.componentTypes?.[POLICY_TYPE] ?? [];
                } catch {
                    provs = [];
                }
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
                }
            } catch (e) {
                if (alive) {
                    addError("Politikalar yüklenemedi", e as Error);
                    setPolicies([]);
                }
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line
    }, [adminClient, realm, addError]);

    const remove = (p: any) =>
        confirm({
            title: "Politikayı sil",
            message: `“${p.name}” kalıcı olarak silinecek. Emin misiniz?`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.components.del({ id: p.id });
                    addAlert("Politika silindi.", AlertVariant.success);
                    load();
                } catch (e) {
                    addError("Silme başarısız", e as Error);
                }
            }
        });

    const renderPolicies = (subType: string) => {
        const list = policies.filter(p => p.subType === subType);
        if (list.length === 0) {
            return (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    Politika yok.
                </p>
            );
        }
        return (
            <ItemGroup variant="inset">
                {list.map((p, i) => (
                    <Fragment key={p.id}>
                        {i > 0 && <ItemSeparator />}
                        <Item size="sm">
                            <ItemContent
                                className="min-w-0 cursor-pointer"
                                onClick={() => setEditPolicy(p)}
                            >
                                <ItemTitle>{p.name}</ItemTitle>
                            </ItemContent>
                            <ItemActions>
                                <Badge variant="secondary">{p.providerId}</Badge>
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
                                    aria-label="Düzenle"
                                    onClick={() => setEditPolicy(p)}
                                >
                                    <CaretRightIcon weight="bold" className="rtl:rotate-180" />
                                </Button>
                            </ItemActions>
                        </Item>
                    </Fragment>
                ))}
            </ItemGroup>
        );
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
                    <CardTitle>Anonim erişim politikaları</CardTitle>
                    <CardDescription>Anonim istemci kaydında uygulanan politikalar.</CardDescription>
                    <CardAction>
                        <Button
                            variant="ghost"
                            onClick={() => setCreateSubType("anonymous")}
                        >
                            Politika oluştur
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    {renderPolicies("anonymous")}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Kimliği doğrulanmış erişim politikaları</CardTitle>
                    <CardDescription>Kimliği doğrulanmış istemci kaydında uygulanan politikalar.</CardDescription>
                    <CardAction>
                        <Button
                            variant="ghost"
                            onClick={() => setCreateSubType("authenticated")}
                        >
                            Politika oluştur
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    {renderPolicies("authenticated")}
                </CardContent>
            </Card>

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
        </div>
    );
}

function CreatePolicy({ subType, parentId, providers, onClose, onCreated }: any) {
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
            addAlert("Sağlayıcı seçin.", AlertVariant.danger);
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
            addAlert("Politika oluşturuldu.", AlertVariant.success);
            onCreated();
        } catch (e) {
            addError("Oluşturma başarısız", e as Error);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>Politika oluştur</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <Field>
                            <FieldLabel>Sağlayıcı</FieldLabel>
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
                            <FieldLabel>Ad</FieldLabel>
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
                        Oluştur
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function EditPolicy({ policy, providers, onClose, onSaved }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [loading, setLoading] = useState(true);
    const [component, setComponent] = useState<any>(null);
    const [name, setName] = useState<string>(policy?.name ?? "");
    const [config, setConfig] = useState<any>({});
    const [busy, setBusy] = useState(false);

    const provider = (providers || []).find((p: any) => p.id === policy?.providerId);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const comp = await adminClient.components.findOne({ id: policy.id });
                if (alive) {
                    setComponent(comp);
                    setName(comp?.name ?? policy.name ?? "");
                    setConfig(comp?.config ?? {});
                }
            } catch (e) {
                if (alive) addError("Politika yüklenemedi", e as Error);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line
    }, [policy?.id, policy.name, adminClient.components.findOne, addError]);

    const submit = async () => {
        setBusy(true);
        try {
            await adminClient.components.update(
                { id: policy.id },
                { ...(component || policy), name, config }
            );
            addAlert("Politika kaydedildi.", AlertVariant.success);
            onSaved();
        } catch (e) {
            addError("Kaydetme başarısız", e as Error);
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
                        <div className="flex justify-center py-16">
                            <Spinner className="size-6" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Field>
                                <FieldLabel>Ad</FieldLabel>
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
                        disabled={busy || loading}
                        onClick={submit}
                    >
                        Kaydet
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
                  title: "Genel ayarlar",
                  desc: "İstemcinin kimliğini ve temel bilgilerini tanımlayın."
              },
              {
                  title: "Yetenek yapılandırması",
                  desc: "Kimlik doğrulama akışlarını ve yeteneklerini seçin."
              },
              {
                  title: "Giriş ayarları",
                  desc: "Yönlendirme URL'lerini ve origin'leri yapılandırın."
              }
          ]
        : [
              {
                  title: "Genel ayarlar",
                  desc: "İstemcinin kimliğini ve temel bilgilerini tanımlayın."
              },
              {
                  title: "Giriş ayarları",
                  desc: "SAML uç noktalarını ve yönlendirmeleri yapılandırın."
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
                message: (e as Error)?.message || "Bilinmeyen bir hata oluştu."
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
                    <ModalTitle>İstemci oluştur</ModalTitle>
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
                                    ? `“${result.clientId}” oluşturuldu`
                                    : "İstemci oluşturulamadı"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {result.ok ? "İstemci başarıyla oluşturuldu." : result.message}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="space-y-2.5">
                                <Progress
                                    value={((step + 1) / stepMeta.length) * 100}
                                    aria-label={`Adım ${step + 1} / ${stepMeta.length}`}
                                />
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Adım {step + 1} / {stepMeta.length}
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
                                        <FieldLabel>İstemci türü</FieldLabel>
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
                                        <FieldLabel>İstemci ID <span className="text-destructive">*</span></FieldLabel>
                                        <Input
                                            value={clientId}
                                            onChange={e => setClientId(e.target.value)}
                                            placeholder="my-app"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>Ad</FieldLabel>
                                        <Input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>Açıklama</FieldLabel>
                                        <Textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </Field>
                                    <SwitchRow
                                        label="Kullanıcı arayüzünde her zaman göster"
                                        checked={alwaysDisplay}
                                        onChange={setAlwaysDisplay}
                                    />
                                </div>
                            )}

                            {step === 1 && oidc && (
                                <div className="space-y-4">
                                    <FieldGroup variant="inset">
                                        <SwitchRow
                                            label="İstemci kimlik doğrulama"
                                            checked={clientAuth}
                                            onChange={onClientAuthChange}
                                        />
                                        <SwitchRow
                                            label="Yetkilendirme"
                                            checked={authz && clientAuth}
                                            disabled={!clientAuth}
                                            onChange={onAuthzChange}
                                        />
                                    </FieldGroup>

                                    <FieldSet>
                                        <FieldLegend variant="label">
                                            Kimlik doğrulama akışı
                                        </FieldLegend>
                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                            <CheckRow
                                                label="Standart akış"
                                                checked={standardFlow}
                                                onChange={setStandardFlow}
                                            />
                                            <CheckRow
                                                label="Doğrudan erişim izinleri"
                                                checked={directAccess}
                                                onChange={setDirectAccess}
                                            />
                                            <CheckRow
                                                label="Implicit akış"
                                                checked={implicitFlow}
                                                onChange={setImplicitFlow}
                                            />
                                            <CheckRow
                                                label="Servis hesabı rolleri"
                                                checked={serviceAccounts}
                                                disabled={!clientAuth || authz}
                                                onChange={setServiceAccounts}
                                            />
                                            <CheckRow
                                                label="Standart Token Değişimi"
                                                checked={standardTokenExchange && clientAuth}
                                                disabled={!clientAuth}
                                                onChange={setStandardTokenExchange}
                                            />
                                            <CheckRow
                                                label="JWT Authorization Grant"
                                                checked={jwtGrant && clientAuth}
                                                disabled={!clientAuth}
                                                onChange={setJwtGrant}
                                            />
                                            <CheckRow
                                                label="OAuth 2.0 Device Authorization Grant"
                                                checked={deviceGrant}
                                                onChange={setDeviceGrant}
                                            />
                                            <CheckRow
                                                label="OIDC CIBA Grant"
                                                checked={cibaGrant}
                                                disabled={!clientAuth}
                                                onChange={setCibaGrant}
                                            />
                                        </div>
                                    </FieldSet>

                                    <FieldGroup variant="inset">
                                        <SwitchRow
                                            label="PKCE zorunlu"
                                            checked={requirePkce}
                                            onChange={setRequirePkce}
                                        />
                                        <SwitchRow
                                            label="DPoP bağlı token zorunlu"
                                            checked={dpop}
                                            onChange={setDpop}
                                        />
                                    </FieldGroup>
                                </div>
                            )}

                            {step === loginStep && (
                                <div className="space-y-3">
                                    <Field>
                                        <FieldLabel>Kök URL</FieldLabel>
                                        <Input
                                            value={rootUrl}
                                            onChange={e => setRootUrl(e.target.value)}
                                            placeholder="https://app.example.com"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>Ana URL</FieldLabel>
                                        <Input
                                            value={baseUrl}
                                            onChange={e => setBaseUrl(e.target.value)}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>Geçerli yönlendirme URI'leri</FieldLabel>
                                        <MultiLineInput
                                            value={redirectUris}
                                            onChange={setRedirectUris}
                                            addLabel="Yönlendirme URI ekle"
                                            placeholder="https://app.example.com/*"
                                        />
                                        <FieldDescription>Başarılı giriş sonrası izin verilen yönlendirme desenleri.</FieldDescription>
                                    </Field>
                                    <Field>
                                        <FieldLabel>Geçerli post-logout yönlendirme URI'leri</FieldLabel>
                                        <MultiLineInput
                                            value={postLogout}
                                            onChange={setPostLogout}
                                            addLabel="Post-logout URI ekle"
                                            placeholder="+"
                                        />
                                        <FieldDescription>Çıkış sonrası izin verilen yönlendirme desenleri.</FieldDescription>
                                    </Field>
                                    {oidc && (
                                        <Field>
                                            <FieldLabel>Web origins</FieldLabel>
                                            <MultiLineInput
                                                value={webOrigins}
                                                onChange={setWebOrigins}
                                                addLabel="Web origin ekle"
                                                placeholder="+"
                                            />
                                            <FieldDescription>CORS için izin verilen origin'ler.</FieldDescription>
                                        </Field>
                                    )}
                                    {!oidc && (
                                        <>
                                            <Field>
                                                <FieldLabel>IDP-Initiated SSO URL adı</FieldLabel>
                                                <Input
                                                    value={idpSsoUrlName}
                                                    onChange={e =>
                                                        setIdpSsoUrlName(e.target.value)
                                                    }
                                                />
                                                <FieldDescription>IDP başlatımlı SSO için URL parçası.</FieldDescription>
                                            </Field>
                                            <Field>
                                                <FieldLabel>IDP Initiated SSO Relay State</FieldLabel>
                                                <Input
                                                    value={idpSsoRelayState}
                                                    onChange={e =>
                                                        setIdpSsoRelayState(e.target.value)
                                                    }
                                                />
                                                <FieldDescription>IDP başlatımlı SSO sırasında gönderilecek relay state.</FieldDescription>
                                            </Field>
                                            <Field>
                                                <FieldLabel>Master SAML Processing URL</FieldLabel>
                                                <Input
                                                    value={masterSamlUrl}
                                                    onChange={e =>
                                                        setMasterSamlUrl(e.target.value)
                                                    }
                                                    placeholder="https://app.example.com/saml"
                                                />
                                                <FieldDescription>Tüm SAML istek ve yanıtları için kullanılacak URL.</FieldDescription>
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
                                    Kapat
                                </Button>
                                <Button
                                                                        className="flex-1"
                                    onClick={() => onCreated(result.id)}
                                >
                                    İstemciye git
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={() => setResult(null)}
                            >
                                Geri dön
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
                                    Geri
                                </Button>
                            )}
                            {step < lastStep ? (
                                <Button
                                                                        className="flex-1"
                                    disabled={!canNext}
                                    onClick={() => setStep(s => s + 1)}
                                >
                                    İleri
                                </Button>
                            ) : (
                                <Button
                                                                        className="flex-1"
                                    disabled={saving}
                                    onClick={create}
                                >
                                    {saving ? "Oluşturuluyor…" : "Oluştur"}
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
        <Avatar size="lg" data-protocol={saml ? "saml" : "oidc"}>
            <AvatarFallback>{ch}</AvatarFallback>
        </Avatar>
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
