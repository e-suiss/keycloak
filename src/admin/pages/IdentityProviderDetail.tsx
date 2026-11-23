// @ts-nocheck

import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
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
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import {
    AdminPage,
    Chip,
    Group,
    ListSkeleton,
    Notice,
    Row,
    Section,
    SegmentTabs,
    TextAction
} from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";

const OIDC_FIELDS = [
    { key: "authorizationUrl", label: "sxIdpDetailAuthorizationUrl" },
    { key: "tokenUrl", label: "sxIdpDetailTokenUrl" },
    { key: "userInfoUrl", label: "sxIdpDetailUserInfoUrl" },
    { key: "logoutUrl", label: "sxIdpDetailLogoutUrl" },
    { key: "issuer", label: "sxIdpDetailIssuer" },
    { key: "clientId", label: "sxIdpDetailClientId" },
    { key: "clientSecret", label: "sxIdpDetailClientSecret", secret: true },
    { key: "defaultScope", label: "sxIdpDetailDefaultScopes" },
    { key: "jwksUrl", label: "sxIdpDetailJwksUrl" }
];

const SAML_FIELDS = [
    { key: "singleSignOnServiceUrl", label: "sxIdpDetailSsoUrl" },
    { key: "singleLogoutServiceUrl", label: "sxIdpDetailSloUrl" },
    { key: "idpEntityId", label: "sxIdpDetailEntityId" },
    { key: "nameIDPolicyFormat", label: "sxIdpDetailNameIdFormat" },
    { key: "signingCertificate", label: "sxIdpDetailSigningCertificate" }
];

const CLIENT_AUTH_OPTIONS = [
    { value: "client_secret_post", label: "sxIdpDetailAuthPost" },
    { value: "client_secret_basic", label: "sxIdpDetailAuthBasic" },
    { value: "client_secret_jwt", label: "sxIdpDetailAuthJwtSecret" },
    { value: "private_key_jwt", label: "sxIdpDetailAuthJwtKey" }
];

const TABS = [
    { value: "settings", label: "sxIdpDetailTabSettings" },
    { value: "mappers", label: "sxIdpDetailTabMappers" }
];

const DANGER_BUTTON =
    "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";

const cfgBool = (config: any, key: string) => String(config?.[key]) === "true";

function SwitchRow({ label, hint, checked, onChange, disabled }: any) {
    return (
        <li className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
                <div className="text-base">{label}</div>
                {hint && <div className="mt-0.5 text-[13px] text-muted-foreground">{hint}</div>}
            </div>
            <Switch
                checked={!!checked}
                disabled={disabled}
                aria-label={typeof label === "string" ? label : undefined}
                onCheckedChange={(v: boolean) => onChange(v)}
            />
        </li>
    );
}

function FormField({ label, hint, htmlFor, children }: any) {
    return (
        <Field size="lg">
            <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
            {children}
            {hint && <FieldDescription className="ps-0.5 text-[13px]">{hint}</FieldDescription>}
        </Field>
    );
}

function OpenRow({ title, subtitle, onOpen, trailing, testId }: any) {
    return (
        <li
            data-testid={testId}
            className="flex items-center gap-3 pe-4 transition-colors hover:bg-black/3 dark:hover:bg-white/4"
        >
            <button
                type="button"
                onClick={onOpen}
                className="flex min-h-16 min-w-0 flex-1 flex-col justify-center py-3 ps-4 text-left outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/6"
            >
                <span className="w-full truncate text-base font-medium">{title}</span>
                {subtitle && (
                    <span className="mt-0.5 w-full text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                        {subtitle}
                    </span>
                )}
            </button>
            {trailing && <div className="flex shrink-0 items-center gap-3">{trailing}</div>}
        </li>
    );
}

function ConfirmDialog({ opts, setOpts }: any) {
    const t = useT();
    return (
        <Confirm open={!!opts} onOpenChange={o => !o && setOpts(null)}>
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{opts?.title}</ConfirmTitle>
                    {opts?.message && <ConfirmDescription>{opts.message}</ConfirmDescription>}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxCommonCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = opts?.onConfirm;
                            setOpts(null);
                            fn?.();
                        }}
                    >
                        {opts?.confirmLabel ?? t("sxCommonConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
}

export default function IdentityProviderDetail() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { alias } = useParams();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const [idp, setIdp] = useState<any>(null);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [tab, setTab] = useState("settings");

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.identityProviders
            .findOne({ alias })
            .then(found => {
                if (!alive) return;
                setIdp(found ?? null);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, alias, attempt]);

    const reload = async () => {
        try {
            const found = await adminClient.identityProviders.findOne({ alias });
            setIdp(found ?? null);
        } catch (e) {
            addError(t("sxIdpDetailLoadErrorToast"), e);
        }
    };

    const back = { label: t("sxNavIdentityProviders"), to: `/${realm}/identity-providers` };

    if (status !== "ready" || !idp)
        return (
            <AdminPage title={idp?.displayName || alias || t("sxIdpDetailFallbackTitle")} back={back} width="narrow">
                {status === "loading" && <ListSkeleton rows={4} />}
                {status === "error" && (
                    <Notice
                        title={t("sxIdpDetailLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && (
                    <Notice
                        title={t("sxIdpDetailNotFound")}
                        description={t("sxIdpDetailNotFoundDescription")}
                        action={<Button size="sm" onClick={() => navigate(back.to)}>{t("sxIdpDetailBackToList")}</Button>}
                    />
                )}
            </AdminPage>
        );

    const remove = () =>
        confirm({
            title: t("sxIdpDetailDeleteTitle"),
            message: t("sxIdpDetailDeleteMessage", { name: idp.displayName || idp.alias }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.identityProviders.del({ alias });
                    addAlert(t("sxIdpsDeleted"), AlertVariant.success);
                    navigate(`/${realm}/identity-providers`);
                } catch (e) {
                    addError(t("sxCommonDeleteError"), e);
                }
            }
        });

    return (
        <AdminPage
            title={idp.displayName || idp.alias}
            description={
                <span className="[overflow-wrap:anywhere]">
                    <span className="font-mono">{idp.alias}</span> · {idp.providerId || "—"}
                </span>
            }
            back={back}
            width="narrow"
            actions={!idp.enabled ? <Chip tone="danger">{t("sxIdpDetailDisabledChip")}</Chip> : undefined}
        >
            <SegmentTabs
                value={tab}
                onChange={setTab}
                items={TABS.map(item => ({ value: item.value, label: t(item.label) }))}
                ariaLabel={t("sxCommonSection")}
            />

            {tab === "settings" && <SettingsTab idp={idp} reload={reload} onDelete={remove} />}
            {tab === "mappers" && <MappersTab idp={idp} />}

            <ConfirmDialog opts={confirmOpts} setOpts={setConfirmOpts} />
        </AdminPage>
    );
}

function initialGeneral(idp: any) {
    return {
        displayName: idp.displayName || "",
        enabled: !!idp.enabled,
        trustEmail: !!idp.trustEmail,
        storeToken: !!idp.storeToken,
        linkOnly: !!idp.linkOnly,
        hideOnLoginPage: cfgBool(idp.config, "hideOnLoginPage")
    };
}

function SettingsTab({ idp, reload, onDelete }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();

    const providerId = idp.providerId || "";
    const isOidc = /oidc/i.test(providerId);
    const isSaml = /saml/i.test(providerId);
    const PROTO_FIELDS = isSaml ? SAML_FIELDS : OIDC_FIELDS;

    const [general, setGeneral] = useState(() => initialGeneral(idp));
    const [config, setConfig] = useState<any>({ ...(idp.config || {}) });
    const [saving, setSaving] = useState(false);

    const setG = (k: string, v: any) => setGeneral(p => ({ ...p, [k]: v }));
    const setC = (k: string, v: any) => setConfig((c: any) => ({ ...c, [k]: v }));
    const cBool = (k: string) => String(config[k]) === "true";

    const dirty =
        JSON.stringify(general) !== JSON.stringify(initialGeneral(idp)) ||
        JSON.stringify(config) !== JSON.stringify({ ...(idp.config || {}) });

    const reset = () => {
        setGeneral(initialGeneral(idp));
        setConfig({ ...(idp.config || {}) });
    };

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
            addAlert(t("sxIdpDetailSaved"), AlertVariant.success);
            reload();
        } catch (e) {
            addError(t("sxCommonSaveError"), e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Section label={t("sxCommonGeneral")}>
                <div className="flex flex-col gap-4">
                    <FormField label={t("sxCommonDisplayName")} htmlFor="idp-display-name">
                        <Input
                            size="lg"
                            id="idp-display-name"
                            value={general.displayName}
                            onChange={(e: any) => setG("displayName", e.target.value)}
                            placeholder={idp.alias}
                        />
                    </FormField>
                    <Group>
                        <Row
                            title={t("sxCommonAlias")}
                            className="min-h-14"
                            trailing={
                                <span className="max-w-48 truncate font-mono text-sm text-muted-foreground">
                                    {idp.alias}
                                </span>
                            }
                        />
                        <Row
                            title={t("sxIdpDetailProviderType")}
                            className="min-h-14"
                            trailing={<span className="text-sm text-muted-foreground">{providerId || "—"}</span>}
                        />
                    </Group>
                    <Group>
                        <SwitchRow
                            label={t("sxCommonEnabled")}
                            checked={general.enabled}
                            onChange={(v: boolean) => setG("enabled", v)}
                        />
                        <SwitchRow
                            label={t("sxIdpDetailTrustEmail")}
                            hint={t("sxIdpDetailTrustEmailHint")}
                            checked={general.trustEmail}
                            onChange={(v: boolean) => setG("trustEmail", v)}
                        />
                        <SwitchRow
                            label={t("sxIdpDetailStoreToken")}
                            checked={general.storeToken}
                            onChange={(v: boolean) => setG("storeToken", v)}
                        />
                        <SwitchRow
                            label={t("sxIdpDetailLinkOnly")}
                            hint={t("sxIdpDetailLinkOnlyHint")}
                            checked={general.linkOnly}
                            onChange={(v: boolean) => setG("linkOnly", v)}
                        />
                        <SwitchRow
                            label={t("sxIdpDetailHideOnLogin")}
                            checked={general.hideOnLoginPage}
                            onChange={(v: boolean) => setG("hideOnLoginPage", v)}
                        />
                    </Group>
                </div>
            </Section>

            {isOidc && (
                <DiscoverySection
                    providerId={providerId}
                    onImport={merged => setConfig((c: any) => ({ ...c, ...merged }))}
                />
            )}

            <Section label={t("sxIdpDetailProtocolConfig", { protocol: isSaml ? "SAML" : "OpenID Connect" })}>
                <div className="flex flex-col gap-4">
                    {PROTO_FIELDS.map(f => (
                        <FormField key={f.key} label={t(f.label)} htmlFor={`idp-${f.key}`}>
                            <Input
                                size="lg"
                                id={`idp-${f.key}`}
                                type={f.secret ? "password" : "text"}
                                value={config[f.key] ?? ""}
                                onChange={(e: any) => setC(f.key, e.target.value)}
                            />
                        </FormField>
                    ))}
                    {isOidc && (
                        <FormField label={t("sxIdpDetailClientAuth")} htmlFor="idp-client-auth">
                            <NativeSelect
                                id="idp-client-auth"
                                size="lg"
                                className="w-full"
                                value={config.clientAuthMethod || "client_secret_post"}
                                onChange={(e: any) => setC("clientAuthMethod", e.target.value)}
                            >
                                {CLIENT_AUTH_OPTIONS.map(o => (
                                    <NativeSelectOption key={o.value} value={o.value}>
                                        {t(o.label)}
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                        </FormField>
                    )}
                </div>
            </Section>

            <Section label={t("sxIdpDetailValidation")}>
                <Group>
                    <SwitchRow
                        label={t("sxIdpDetailValidateSignature")}
                        checked={cBool("validateSignature")}
                        onChange={(v: boolean) => setC("validateSignature", v ? "true" : "false")}
                    />
                    {isOidc && (
                        <SwitchRow
                            label={t("sxIdpDetailUseJwksUrl")}
                            checked={cBool("useJwksUrl")}
                            onChange={(v: boolean) => setC("useJwksUrl", v ? "true" : "false")}
                        />
                    )}
                </Group>
            </Section>

            <div className="flex flex-col gap-1.5">
                <Button size="form" block disabled={saving} onClick={save}>
                    {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                </Button>
                <Button variant="plain" size="form" block disabled={saving || !dirty} onClick={reset}>
                    {t("sxCommonCancel")}
                </Button>
            </div>

            <section className="border-t border-[#e5e5ea] pt-6 dark:border-[#38383a]">
                <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">
                    {t("sxIdpDetailDeleteNote")}
                </p>
                <Button size="form" block className={DANGER_BUTTON} onClick={onDelete}>
                    {t("sxIdpDetailDeleteTitle")}
                </Button>
            </section>
        </>
    );
}

function DiscoverySection({ providerId, onImport }: any) {
    const t = useT();
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
                addAlert(t("sxIdpDetailImported"), AlertVariant.success);
            } else {
                addError(t("sxIdpDetailImportError"), new Error(t("sxIdpDetailEmptyResponse")));
            }
        } catch (e) {
            addError(t("sxIdpDetailImportError"), e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Section label={t("sxIdpDetailImportSection")}>
            <FormField
                label={t("sxIdpDetailDiscoveryUrl")}
                htmlFor="idp-discovery-url"
                hint={t("sxIdpDetailDiscoveryHint")}
            >
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                        size="lg"
                        id="idp-discovery-url"
                        value={url}
                        onChange={(e: any) => setUrl(e.target.value)}
                        onKeyDown={(e: any) => e.key === "Enter" && importUrl()}
                        placeholder="https://idp.example.com/.well-known/openid-configuration"
                    />
                    <Button
                        variant="secondary"
                        className="h-13.5 shrink-0 rounded-xl px-5 text-[15px] font-medium"
                        disabled={!url.trim() || busy}
                        onClick={importUrl}
                    >
                        {busy ? t("sxIdpDetailImporting") : t("sxIdpDetailImport")}
                    </Button>
                </div>
            </FormField>
        </Section>
    );
}

function MappersTab({ idp }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const alias = idp.alias;
    const [mappers, setMappers] = useState<any[]>([]);
    const [types, setTypes] = useState<Record<string, any>>({});
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [editing, setEditing] = useState<any>(null);
    const [creating, setCreating] = useState(false);

    const fetchAll = () =>
        Promise.all([
            adminClient.identityProviders.findMappers({ alias }),
            adminClient.identityProviders.findMapperTypes({ alias })
        ]);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        fetchAll()
            .then(([list, found]) => {
                if (!alive) return;
                setMappers(Array.isArray(list) ? list : []);
                setTypes(found || {});
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, alias, attempt]);

    const load = async () => {
        try {
            const [list, found] = await fetchAll();
            setMappers(Array.isArray(list) ? list : []);
            setTypes(found || {});
        } catch (e) {
            addError(t("sxIdpDetailMappersLoadErrorToast"), e);
        }
    };

    const typeName = (id: string) => types[id]?.name || id;

    const remove = (m: any) =>
        confirm({
            title: t("sxIdpDetailMapperDeleteTitle"),
            message: t("sxIdpDetailMapperDeleteMessage", { name: m.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.identityProviders.delMapper({ alias, id: m.id });
                    addAlert(t("sxIdpDetailMapperDeleted"), AlertVariant.success);
                    setMappers(mappers.filter(x => x.id !== m.id));
                } catch (e) {
                    addError(t("sxCommonDeleteError"), e);
                }
            }
        });

    return (
        <Section
            label={
                status === "ready"
                    ? t("sxIdpDetailMappersCount", { total: mappers.length })
                    : t("sxIdpDetailTabMappers")
            }
            action={
                status === "ready" && (
                    <TextAction onClick={() => setCreating(true)} disabled={Object.keys(types).length === 0}>
                        {t("sxIdpDetailAddMapper")}
                    </TextAction>
                )
            }
        >
            {status === "loading" && <ListSkeleton />}
            {status === "error" && (
                <Notice
                    title={t("sxIdpDetailMappersLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            )}
            {status === "ready" && mappers.length === 0 && (
                <Notice
                    title={t("sxIdpDetailMappersEmpty")}
                    description={t("sxIdpDetailMappersEmptyDescription")}
                    action={
                        Object.keys(types).length > 0 && (
                            <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setCreating(true)}>
                                {t("sxIdpDetailAddMapper")}
                            </Button>
                        )
                    }
                />
            )}
            {status === "ready" && mappers.length > 0 && (
                <Group>
                    {mappers.map(m => (
                        <OpenRow
                            key={m.id}
                            testId={`mapper-${m.name}`}
                            onOpen={() => setEditing(m)}
                            title={m.name || "—"}
                            subtitle={typeName(m.identityProviderMapper)}
                            trailing={
                                <TextAction tone="danger" onClick={() => remove(m)}>
                                    {t("sxCommonDelete")}
                                </TextAction>
                            }
                        />
                    ))}
                </Group>
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
        </Section>
    );
}

function MapperModal({ alias, types, mapper, onClose, onSaved }: any) {
    const t = useT();
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
                addAlert(t("sxIdpDetailMapperSaved"), AlertVariant.success);
            } else {
                await adminClient.identityProviders.createMapper({
                    alias,
                    identityProviderMapper: payload
                });
                addAlert(t("sxIdpDetailMapperCreated"), AlertVariant.success);
            }
            onSaved();
        } catch (e) {
            addError(isEdit ? t("sxCommonSaveError") : t("sxCommonCreateError"), e);
            setSaving(false);
        }
    };

    const valueOf = (p: any) =>
        config[p.name] ?? (p.defaultValue != null ? String(p.defaultValue) : "");
    const switches = properties.filter(p => /^boolean$/i.test(String(p.type || "")));
    const others = properties.filter(p => !/^boolean$/i.test(String(p.type || "")));

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{isEdit ? t("sxIdpDetailEditMapper") : t("sxIdpDetailAddMapper")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <FormField label={t("sxCommonName")} htmlFor="idp-mapper-name">
                            <Input
                                size="lg"
                                id="idp-mapper-name"
                                autoFocus
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                                placeholder={t("sxIdpDetailMapperNamePlaceholder")}
                            />
                        </FormField>
                        <FormField
                            label={t("sxIdpDetailMapperType")}
                            htmlFor="idp-mapper-type"
                            hint={currentType?.helpText}
                        >
                            {isEdit ? (
                                <Input
                                    size="lg"
                                    id="idp-mapper-type"
                                    readOnly
                                    value={currentType?.name || typeId}
                                    className="text-muted-foreground"
                                />
                            ) : (
                                <NativeSelect
                                    id="idp-mapper-type"
                                    size="lg"
                                    className="w-full"
                                    value={typeId}
                                    onChange={(e: any) => {
                                        setTypeId(e.target.value);
                                        setConfig({});
                                    }}
                                >
                                    {typeList.map((item: any) => (
                                        <NativeSelectOption key={item.id} value={item.id}>
                                            {item.name}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            )}
                        </FormField>

                        {others.map((p: any) => (
                            <PropertyField
                                key={p.name}
                                prop={p}
                                value={valueOf(p)}
                                onChange={(v: any) => setC(p.name, v)}
                            />
                        ))}

                        {switches.length > 0 && (
                            <Group>
                                {switches.map((p: any) => (
                                    <SwitchRow
                                        key={p.name}
                                        label={p.label || p.name}
                                        hint={p.helpText}
                                        checked={String(valueOf(p)) === "true"}
                                        onChange={(v: boolean) => setC(p.name, v ? "true" : "false")}
                                    />
                                ))}
                            </Group>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving || !name.trim() || !typeId} onClick={save}>
                        {saving ? t("sxCommonSaving") : isEdit ? t("sxCommonSave") : t("sxCommonCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function PropertyField({ prop, value, onChange }: any) {
    const t = useT();
    const type = String(prop.type || "String");
    const label = prop.label || prop.name;
    const id = `idp-prop-${prop.name}`;

    if ((type === "List" || type === "Select") && Array.isArray(prop.options) && prop.options.length) {
        return (
            <FormField label={label} htmlFor={id} hint={prop.helpText}>
                <NativeSelect
                    id={id}
                    size="lg"
                    className="w-full"
                    value={value || ""}
                    onChange={(e: any) => onChange(e.target.value)}
                >
                    <NativeSelectOption value="">{t("sxCommonSelectPlaceholder")}</NativeSelectOption>
                    {prop.options.map((o: string) => (
                        <NativeSelectOption key={o} value={o}>
                            {o}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </FormField>
        );
    }

    return (
        <FormField label={label} htmlFor={id} hint={prop.helpText}>
            <Input
                size="lg"
                id={id}
                type={prop.secret ? "password" : "text"}
                value={value}
                onChange={(e: any) => onChange(e.target.value)}
            />
        </FormField>
    );
}
