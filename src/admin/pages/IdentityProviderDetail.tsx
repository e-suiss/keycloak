// @ts-nocheck

import {
    ArrowsClockwiseIcon,
    CaretLeftIcon,
    DotsThreeIcon,
    DownloadSimpleIcon,
    PencilSimpleIcon,
    PlugIcon,
    PlusIcon,
    TrashIcon
} from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
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
import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";

/* Protocol config field maps (read/written via idp.config). */
const OIDC_FIELDS = [
    { key: "authorizationUrl", label: "Yetkilendirme URL" },
    { key: "tokenUrl", label: "Token URL" },
    { key: "userInfoUrl", label: "Kullanıcı bilgisi URL" },
    { key: "logoutUrl", label: "Çıkış URL" },
    { key: "issuer", label: "Issuer" },
    { key: "clientId", label: "İstemci ID" },
    { key: "clientSecret", label: "İstemci sırrı", secret: true },
    { key: "defaultScope", label: "Varsayılan kapsamlar" },
    { key: "jwksUrl", label: "JWKS URL" }
];

const SAML_FIELDS = [
    { key: "singleSignOnServiceUrl", label: "SSO servis URL" },
    { key: "singleLogoutServiceUrl", label: "SLO servis URL" },
    { key: "idpEntityId", label: "IdP entity ID" },
    { key: "nameIDPolicyFormat", label: "NameID policy formatı" },
    { key: "signingCertificate", label: "İmzalama sertifikası" }
];

const CLIENT_AUTH_OPTIONS = [
    { value: "client_secret_post", label: "İstek gövdesinde gönder (POST)" },
    { value: "client_secret_basic", label: "Temel yetkilendirme (Basic)" },
    { value: "client_secret_jwt", label: "JWT (istemci sırrı)" },
    { value: "private_key_jwt", label: "JWT (özel anahtar)" }
];

/* config is a flat string->string map. Booleans are stored as "true"/"false". */
const cfgBool = (config: any, key: string) => String(config?.[key]) === "true";

const PAGE = "mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8";
const CAPTION = "mb-2 ms-1 text-sm font-medium text-muted-foreground";
const FOOTNOTE = "mt-2 ms-1 text-sm text-muted-foreground";

/* Separates an array of rows with ItemSeparator inside an inset ItemGroup. */
function withSeparators(nodes: any[]) {
    return nodes.filter(Boolean).map((n, i) => (
        <Fragment key={n.key ?? i}>
            {i > 0 && <ItemSeparator />}
            {n}
        </Fragment>
    ));
}

function SwitchItem({ label, hint, checked, onChange, disabled }: any) {
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
                    onCheckedChange={(v: boolean) => onChange(v)}
                />
            </ItemActions>
        </Item>
    );
}

function StackItem({ label, hint, children }: any) {
    return (
        <Item size="sm">
            <ItemContent className="min-w-0">
                {label && <ItemTitle>{label}</ItemTitle>}
                {hint && <ItemDescription>{hint}</ItemDescription>}
                {children}
            </ItemContent>
        </Item>
    );
}

function ConfirmDialog({ opts, setOpts }: any) {
    return (
        <Confirm open={!!opts} onOpenChange={o => !o && setOpts(null)}>
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
                            setOpts(null);
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

function EmptyBlock({ icon, title, desc }: any) {
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

export default function IdentityProviderDetail() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { alias } = useParams();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const [idp, setIdp] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("settings");

    const reload = useCallback(async () => {
        try {
            const found = await adminClient.identityProviders.findOne({ alias });
            setIdp(found ?? null);
        } catch (e) {
            addError("Kimlik sağlayıcı yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, alias, addError]);

    useEffect(() => {
        setLoading(true);
        reload();
    }, [reload]);

    if (loading)
        return (
            <div className={PAGE}>
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            </div>
        );
    if (!idp)
        return (
            <div className={PAGE}>
                <EmptyBlock icon={<PlugIcon />} title="Kimlik sağlayıcı bulunamadı" />
            </div>
        );

    const remove = () =>
        confirm({
            title: "Kimlik sağlayıcıyı sil",
            message: `“${idp.displayName || idp.alias}” kalıcı olarak silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.identityProviders.del({ alias });
                    addAlert("Kimlik sağlayıcı silindi.", AlertVariant.success);
                    navigate(`/${realm}/identity-providers`);
                } catch (e) {
                    addError("Silinemedi.", e);
                }
            }
        });

    const TABS = [
        { value: "settings", label: "Ayarlar" },
        { value: "mappers", label: "Eşleştiriciler" }
    ];

    return (
        <div className={PAGE}>
            {/* iOS nav-bar header */}
            <div className="relative mb-7 flex items-center">
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => navigate(`/${realm}/identity-providers`)}
                    aria-label="Geri"
                >
                    <CaretLeftIcon weight="bold" className="rtl:rotate-180" />
                </Button>
                <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-center">
                    <p className="font-semibold text-foreground">
                        {idp.displayName || idp.alias}
                    </p>
                    {!idp.enabled && <Badge variant="destructive">Devre dışı</Badge>}
                </div>
                <div className="ms-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                aria-label="Eylemler"
                            >
                                <DotsThreeIcon className="size-5" weight="bold" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem variant="destructive" onClick={remove}>
                                <TrashIcon /> Sil
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="mb-5 flex justify-center">
                <SegmentPicker value={tab} onValueChange={setTab}>
                    {TABS.map(t => (
                        <SegmentPickerItem
                            key={t.value}
                            value={t.value}
                            label={t.label}
                        />
                    ))}
                </SegmentPicker>
            </div>

            {tab === "settings" && <SettingsTab idp={idp} reload={reload} />}
            {tab === "mappers" && <MappersTab idp={idp} />}

            <ConfirmDialog opts={confirmOpts} setOpts={setConfirmOpts} />
        </div>
    );
}

/* ── Ayarlar ──────────────────────────────────────────────────────────── */
function SettingsTab({ idp, reload }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();

    const providerId = idp.providerId || "";
    const isOidc = /oidc/i.test(providerId);
    const isSaml = /saml/i.test(providerId);
    const PROTO_FIELDS = isSaml ? SAML_FIELDS : OIDC_FIELDS;

    const [general, setGeneral] = useState({
        displayName: idp.displayName || "",
        enabled: !!idp.enabled,
        trustEmail: !!idp.trustEmail,
        storeToken: !!idp.storeToken,
        linkOnly: !!idp.linkOnly,
        hideOnLoginPage: cfgBool(idp.config, "hideOnLoginPage")
    });
    const [config, setConfig] = useState<any>({ ...(idp.config || {}) });
    const [saving, setSaving] = useState(false);

    const setG = (k: string, v: any) => setGeneral(p => ({ ...p, [k]: v }));
    const setC = (k: string, v: any) => setConfig((c: any) => ({ ...c, [k]: v }));
    const cBool = (k: string) => String(config[k]) === "true";

    const save = async () => {
        setSaving(true);
        try {
            const nextConfig = {
                ...(idp.config || {}),
                ...config,
                hideOnLoginPage: general.hideOnLoginPage ? "true" : "false"
            };
            await adminClient.identityProviders.update(
                { alias: idp.alias },
                {
                    ...idp,
                    alias: idp.alias,
                    providerId,
                    displayName: general.displayName.trim() || undefined,
                    enabled: general.enabled,
                    trustEmail: general.trustEmail,
                    storeToken: general.storeToken,
                    linkOnly: general.linkOnly,
                    config: nextConfig
                }
            );
            addAlert("Kimlik sağlayıcı kaydedildi.", AlertVariant.success);
            reload();
        } catch (e) {
            addError("Kaydedilemedi.", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-xl space-y-6">
            {/* Genel */}
            <div>
                <h3 className={CAPTION}>Genel</h3>
                <ItemGroup variant="inset">
                    {withSeparators([
                        <Item size="sm" key="alias">
                            <ItemContent>
                                <ItemTitle>Alias</ItemTitle>
                            </ItemContent>
                            <ItemActions>
                                <span className="font-mono text-sm text-muted-foreground">
                                    {idp.alias}
                                </span>
                            </ItemActions>
                        </Item>,
                        <StackItem label="Görünen ad" key="displayName">
                            <Input
                                value={general.displayName}
                                onChange={(e: any) => setG("displayName", e.target.value)}
                                placeholder={idp.alias}
                            />
                        </StackItem>,
                        <SwitchItem
                            key="enabled"
                            label="Etkin"
                            checked={general.enabled}
                            onChange={(v: boolean) => setG("enabled", v)}
                        />,
                        <SwitchItem
                            key="trustEmail"
                            label="E-postaya güven"
                            hint="Bu sağlayıcıdan gelen e-postayı doğrulanmış kabul et."
                            checked={general.trustEmail}
                            onChange={(v: boolean) => setG("trustEmail", v)}
                        />,
                        <SwitchItem
                            key="storeToken"
                            label="Token sakla"
                            checked={general.storeToken}
                            onChange={(v: boolean) => setG("storeToken", v)}
                        />,
                        <SwitchItem
                            key="linkOnly"
                            label="Yalnızca bağlama"
                            hint="Yeni kullanıcı oluşturmaz, yalnızca mevcut hesaba bağlar."
                            checked={general.linkOnly}
                            onChange={(v: boolean) => setG("linkOnly", v)}
                        />,
                        <SwitchItem
                            key="hideOnLoginPage"
                            label="Giriş sayfasında gizle"
                            checked={general.hideOnLoginPage}
                            onChange={(v: boolean) => setG("hideOnLoginPage", v)}
                        />
                    ])}
                </ItemGroup>
                <p className={FOOTNOTE}>Sağlayıcı türü: {providerId || "—"}</p>
            </div>

            {/* Discovery import (OIDC) */}
            {isOidc && (
                <DiscoverySection
                    providerId={providerId}
                    onImport={merged => setConfig((c: any) => ({ ...c, ...merged }))}
                />
            )}

            {/* Protocol config */}
            <div>
                <h3 className={CAPTION}>
                    {isSaml ? "SAML yapılandırması" : "OpenID Connect yapılandırması"}
                </h3>
                <ItemGroup variant="inset">
                    {withSeparators([
                        ...PROTO_FIELDS.map(f => (
                            <StackItem key={f.key} label={f.label}>
                                <Input
                                    type={f.secret ? "password" : "text"}
                                    value={config[f.key] ?? ""}
                                    onChange={(e: any) => setC(f.key, e.target.value)}
                                />
                            </StackItem>
                        )),
                        isOidc && (
                            <Item size="sm" key="clientAuthMethod">
                                <ItemContent>
                                    <ItemTitle>İstemci kimlik doğrulaması</ItemTitle>
                                </ItemContent>
                                <ItemActions>
                                    <Select
                                        value={
                                            config.clientAuthMethod ||
                                            "client_secret_post"
                                        }
                                        onValueChange={(v: string) =>
                                            setC("clientAuthMethod", v)
                                        }
                                    >
                                        <SelectTrigger size="sm" className="max-w-56">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CLIENT_AUTH_OPTIONS.map(o => (
                                                <SelectItem key={o.value} value={o.value}>
                                                    {o.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </ItemActions>
                            </Item>
                        )
                    ])}
                </ItemGroup>
            </div>

            {/* Validation switches */}
            <div>
                <h3 className={CAPTION}>Doğrulama</h3>
                <ItemGroup variant="inset">
                    {withSeparators([
                        <SwitchItem
                            key="validateSignature"
                            label="İmzayı doğrula"
                            checked={cBool("validateSignature")}
                            onChange={(v: boolean) =>
                                setC("validateSignature", v ? "true" : "false")
                            }
                        />,
                        isOidc && (
                            <SwitchItem
                                key="useJwksUrl"
                                label="JWKS URL kullan"
                                checked={cBool("useJwksUrl")}
                                onChange={(v: boolean) =>
                                    setC("useJwksUrl", v ? "true" : "false")
                                }
                            />
                        )
                    ])}
                </ItemGroup>
            </div>

            <div className="flex justify-end">
                <Button disabled={saving} onClick={save}>
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>
        </div>
    );
}

/* ── OIDC discovery import ─────────────────────────────────────────────── */
function DiscoverySection({ providerId, onImport }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [url, setUrl] = useState("");
    const [busy, setBusy] = useState(false);

    const importUrl = async () => {
        const fromUrl = url.trim();
        if (!fromUrl) return;
        setBusy(true);
        try {
            const result = await adminClient.identityProviders.importFromUrl({
                providerId,
                fromUrl
            });
            if (result && Object.keys(result).length) {
                onImport(result);
                addAlert("Keşif belgesi içe aktarıldı.", AlertVariant.success);
            } else {
                addError("İçe aktarma başarısız.", new Error("Boş yanıt"));
            }
        } catch (e) {
            addError("İçe aktarma başarısız.", e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <h3 className={CAPTION}>Keşif belgesinden içe aktar</h3>
            <ItemGroup variant="inset">
                <StackItem
                    label="Discovery endpoint URL"
                    hint=".well-known/openid-configuration adresinden uç noktaları çeker."
                >
                    <Input
                        value={url}
                        onChange={(e: any) => setUrl(e.target.value)}
                        onKeyDown={(e: any) => e.key === "Enter" && importUrl()}
                        placeholder="https://idp.example.com/.well-known/openid-configuration"
                    />
                </StackItem>
                <ItemSeparator />
                <Item size="sm" asChild>
                    <button
                        type="button"
                        disabled={!url.trim() || busy}
                        onClick={importUrl}
                    >
                        <ItemMedia variant="icon">
                            <DownloadSimpleIcon />
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle className="text-primary">
                                {busy ? "İçe aktarılıyor…" : "İçe aktar"}
                            </ItemTitle>
                        </ItemContent>
                    </button>
                </Item>
            </ItemGroup>
        </div>
    );
}

/* ── Eşleştiriciler ───────────────────────────────────────────────────── */
function MappersTab({ idp }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const alias = idp.alias;
    const [mappers, setMappers] = useState<any[]>([]);
    const [types, setTypes] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<any>(null); // mapper being edited
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [list, t] = await Promise.all([
                adminClient.identityProviders.findMappers({ alias }),
                adminClient.identityProviders.findMapperTypes({ alias })
            ]);
            setMappers(Array.isArray(list) ? list : []);
            setTypes(t || {});
        } catch (e) {
            addError("Eşleştiriciler yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, alias, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const typeName = (id: string) => types[id]?.name || id;

    const remove = (m: any) =>
        confirm({
            title: "Eşleştiriciyi sil",
            message: `“${m.name}” kalıcı olarak silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.identityProviders.delMapper({ alias, id: m.id });
                    addAlert("Eşleştirici silindi.", AlertVariant.success);
                    setMappers(mappers.filter(x => x.id !== m.id));
                } catch (e) {
                    addError("Silinemedi.", e);
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
                    {mappers.length} eşleştirici
                </h3>
                <Button
                    type="button"
                    variant="plain"
                    size="sm"
                    onClick={() => setCreating(true)}
                    disabled={Object.keys(types).length === 0}
                >
                    <PlusIcon data-icon="inline-start" /> Eşleştirici ekle
                </Button>
            </div>

            {mappers.length === 0 ? (
                <EmptyBlock
                    icon={<ArrowsClockwiseIcon />}
                    title="Eşleştirici yok"
                    desc="Harici talepleri kullanıcı özniteliklerine ve rollerine eşlemek için eşleştirici ekle."
                />
            ) : (
                <ItemGroup variant="inset">
                    {withSeparators(
                        mappers.map(m => (
                            <Item size="sm" key={m.id}>
                                <ItemMedia variant="icon">
                                    <ArrowsClockwiseIcon />
                                </ItemMedia>
                                <ItemContent className="min-w-0">
                                    <ItemTitle>{m.name || "—"}</ItemTitle>
                                    <ItemDescription className="truncate">
                                        {typeName(m.identityProviderMapper)}
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        title="Düzenle"
                                        aria-label="Düzenle"
                                        onClick={() => setEditing(m)}
                                    >
                                        <PencilSimpleIcon />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        title="Sil"
                                        aria-label="Sil"
                                        onClick={() => remove(m)}
                                    >
                                        <TrashIcon />
                                    </Button>
                                </ItemActions>
                            </Item>
                        ))
                    )}
                </ItemGroup>
            )}

            {creating && (
                <MapperModal
                    alias={alias}
                    types={types}
                    onClose={() => setCreating(false)}
                    onSaved={() => {
                        setCreating(false);
                        load();
                    }}
                />
            )}
            {editing && (
                <MapperModal
                    alias={alias}
                    types={types}
                    mapper={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}
            <ConfirmDialog opts={confirmOpts} setOpts={setConfirmOpts} />
        </div>
    );
}

/* Create / edit mapper modal with a dynamic config form driven by mapper type properties. */
function MapperModal({ alias, types, mapper, onClose, onSaved }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const isEdit = !!mapper;

    const typeList = Object.values(types).sort((a: any, b: any) =>
        String(a.name).localeCompare(String(b.name))
    );

    const [name, setName] = useState(mapper?.name || "");
    const [typeId, setTypeId] = useState(
        mapper?.identityProviderMapper || (typeList[0] as any)?.id || ""
    );
    const [config, setConfig] = useState<any>({ ...(mapper?.config || {}) });
    const [saving, setSaving] = useState(false);

    const currentType: any = types[typeId];
    const properties: any[] = currentType?.properties || [];
    const setC = (k: string, v: any) => setConfig((c: any) => ({ ...c, [k]: v }));

    const save = async () => {
        const n = name.trim();
        if (!n || !typeId) return;
        setSaving(true);
        const payload = {
            name: n,
            identityProviderAlias: alias,
            identityProviderMapper: typeId,
            config
        };
        try {
            if (isEdit) {
                await adminClient.identityProviders.updateMapper(
                    { alias, id: mapper.id },
                    { ...payload, id: mapper.id }
                );
                addAlert("Eşleştirici kaydedildi.", AlertVariant.success);
            } else {
                await adminClient.identityProviders.createMapper({
                    alias,
                    identityProviderMapper: payload
                });
                addAlert("Eşleştirici oluşturuldu.", AlertVariant.success);
            }
            onSaved();
        } catch (e) {
            addError(isEdit ? "Kaydedilemedi." : "Oluşturulamadı.", e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>
                        {isEdit ? "Eşleştiriciyi düzenle" : "Eşleştirici ekle"}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <ItemGroup variant="inset">
                            <StackItem label="Ad">
                                <Input
                                    autoFocus
                                    value={name}
                                    onChange={(e: any) => setName(e.target.value)}
                                    placeholder="eşleştirici-adı"
                                />
                            </StackItem>
                            <ItemSeparator />
                            <Item size="sm">
                                <ItemContent>
                                    <ItemTitle>Eşleştirici türü</ItemTitle>
                                </ItemContent>
                                <ItemActions className="min-w-0">
                                    {isEdit ? (
                                        <span className="truncate text-sm text-muted-foreground">
                                            {currentType?.name || typeId}
                                        </span>
                                    ) : (
                                        <Select
                                            value={typeId}
                                            onValueChange={(v: string) => {
                                                setTypeId(v);
                                                setConfig({});
                                            }}
                                        >
                                            <SelectTrigger size="sm" className="max-w-64">
                                                <SelectValue placeholder="Tür seç…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {typeList.map((t: any) => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        {t.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </ItemActions>
                            </Item>
                        </ItemGroup>

                        {currentType?.helpText && (
                            <p className="ms-1 text-sm text-muted-foreground">
                                {currentType.helpText}
                            </p>
                        )}

                        {properties.length > 0 && (
                            <ItemGroup variant="inset">
                                {withSeparators(
                                    properties.map((p: any) => (
                                        <PropertyRow
                                            key={p.name}
                                            prop={p}
                                            value={
                                                config[p.name] ??
                                                (p.defaultValue != null
                                                    ? String(p.defaultValue)
                                                    : "")
                                            }
                                            onChange={(v: any) => setC(p.name, v)}
                                        />
                                    ))
                                )}
                            </ItemGroup>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving || !name.trim() || !typeId} onClick={save}>
                        {saving ? "Kaydediliyor…" : isEdit ? "Kaydet" : "Oluştur"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/* One dynamic config field, rendered by ConfigPropertyRepresentation.type. */
function PropertyRow({ prop, value, onChange }: any) {
    const type = String(prop.type || "String");
    const label = prop.label || prop.name;

    if (type === "boolean" || type === "Boolean") {
        return (
            <SwitchItem
                label={label}
                hint={prop.helpText}
                checked={String(value) === "true"}
                onChange={(v: boolean) => onChange(v ? "true" : "false")}
            />
        );
    }

    if (
        (type === "List" || type === "Select") &&
        Array.isArray(prop.options) &&
        prop.options.length
    ) {
        return (
            <Item size="sm">
                <ItemContent className="min-w-0">
                    <ItemTitle>{label}</ItemTitle>
                    {prop.helpText && <ItemDescription>{prop.helpText}</ItemDescription>}
                </ItemContent>
                <ItemActions>
                    <Select
                        value={value || "__none__"}
                        onValueChange={(v: string) => onChange(v === "__none__" ? "" : v)}
                    >
                        <SelectTrigger size="sm" className="max-w-56">
                            <SelectValue placeholder="Seç…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">Seç…</SelectItem>
                            {prop.options.map((o: string) => (
                                <SelectItem key={o} value={o}>
                                    {o}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </ItemActions>
            </Item>
        );
    }

    return (
        <StackItem label={label} hint={prop.helpText}>
            <Input
                type={prop.secret ? "password" : "text"}
                value={value}
                onChange={(e: any) => onChange(e.target.value)}
            />
        </StackItem>
    );
}
