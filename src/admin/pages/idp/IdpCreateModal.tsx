// @ts-nocheck
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useMemo, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { environment } from "../../environment";
import { Group, ListSkeleton, Notice, Section } from "../../ui/kit";
import { useT } from "../../ui/i18n";
import { useRealm } from "../../ui/realm";
import { findProviderInfo, providerKind } from "./IdpSettings";
import { DynamicFields, FormField, MULTI_SEPARATOR, SelectField, TextField, useTx } from "./shared";

const CLIENT_AUTHS = [
    { value: "client_secret_post", label: "sxIdpDetailAuthPost" },
    { value: "client_secret_basic", label: "sxIdpDetailAuthBasic" },
    { value: "client_secret_basic_unencoded", label: "sxIdpDetailAuthBasicUnencoded" },
    { value: "client_secret_jwt", label: "sxIdpDetailAuthJwtSecret" },
    { value: "private_key_jwt", label: "sxIdpDetailAuthJwtKey" }
];

export function providerGroups(info: any) {
    const list: any[] = Array.isArray(info?.identityProviders) ? info.identityProviders : [];
    const groups: Record<string, any[]> = {};
    list.forEach(p => {
        const g = p.groupName || "";
        (groups[g] = groups[g] || []).push(p);
    });
    return Object.entries(groups).map(([name, items]) => ({
        name,
        items: [...items].sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)))
    }));
}

export function IdpCreateModal({ server, existing, onClose, onCreated }: any) {
    const t = useT();
    const tx = useTx();
    const [providerId, setProviderId] = useState<string | null>(null);
    const groups = useMemo(() => providerGroups(server.info), [server.info]);

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{providerId ? t("sxIdpsAddTitle", { provider: providerName(groups, providerId) }) : t("sxIdpsNewTitle")}</ModalTitle>
                </ModalHeader>
                {!providerId ? (
                    <ModalBody>
                        {server.status === "loading" && <ListSkeleton rows={6} />}
                        {server.status === "error" && (
                            <Notice
                                title={t("sxIdpsProvidersLoadError")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={server.retry}
                            />
                        )}
                        {server.status === "ready" && groups.length === 0 && (
                            <Notice title={t("sxIdpsNoProviderTypes")} description={t("sxIdpsNoProviderTypesDescription")} />
                        )}
                        {server.status === "ready" && groups.length > 0 && (
                            <div className="flex max-h-[60svh] flex-col gap-5 overflow-y-auto">
                                {groups.map(g => (
                                    <Section key={g.name} label={tx(g.name) || t("sxIdpsOtherProviders")}>
                                        <Group>
                                            {g.items.map((p: any) => (
                                                <li key={p.id}>
                                                    <button
                                                        type="button"
                                                        data-testid={`${p.id}-card`}
                                                        onClick={() => setProviderId(p.id)}
                                                        className="flex min-h-13 w-full flex-col justify-center px-4 py-2.5 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
                                                    >
                                                        <span className="text-base font-medium">{p.name || p.id}</span>
                                                        <span className="font-mono text-[12px] text-muted-foreground">{p.id}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </Group>
                                    </Section>
                                ))}
                            </div>
                        )}
                    </ModalBody>
                ) : (
                    <CreateForm
                        key={providerId}
                        providerId={providerId}
                        server={server}
                        existing={existing}
                        onBack={() => setProviderId(null)}
                        onCreated={onCreated}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}

function providerName(groups: any[], id: string) {
    for (const g of groups) {
        const found = g.items.find((p: any) => p.id === id);
        if (found) return found.name || id;
    }
    return id;
}

function CreateForm({ providerId, server, existing, onBack, onCreated }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const kind = providerKind(providerId);
    const { isOIDC, isSAML, isOAuth2, isSPIFFE, isKubernetes, isJWT, isSocial } = kind;
    const providerInfo = findProviderInfo(server.info, providerId);
    const [alias, setAlias] = useState(providerId);
    const [displayName, setDisplayName] = useState("");
    const [config, setConfig] = useState<any>(() => {
        const base: any = {};
        if (isSAML || isSPIFFE || isKubernetes || isJWT) base.allowCreate = "true";
        if (isSAML) base.entityId = `${String(environment.serverBaseUrl || "").replace(/\/+$/, "")}/realms/${realm}`;
        if (isOIDC || isOAuth2) base.clientAuthMethod = "client_secret_post";
        if (isJWT) base.useJwksUrl = "true";
        (providerInfo?.properties || []).forEach((p: any) => {
            if (p?.defaultValue != null && p.defaultValue !== "")
                base[p.name] = Array.isArray(p.defaultValue) ? p.defaultValue.join(MULTI_SEPARATOR) : String(p.defaultValue);
        });
        return base;
    });
    const [discoveryUrl, setDiscoveryUrl] = useState("");
    const [discovering, setDiscovering] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [saving, setSaving] = useState(false);

    const cs = (k: string) => (config[k] == null ? "" : String(config[k]));
    const setC = (k: string, v: any) => setConfig((c: any) => ({ ...c, [k]: v }));

    const required: string[] = [];
    if (isSocial) required.push("clientId", "clientSecret");
    if (isOIDC || isOAuth2) {
        required.push("authorizationUrl", "tokenUrl", "clientId");
        if (cs("clientAuthMethod") !== "private_key_jwt") required.push("clientSecret");
    }
    if (isOAuth2) required.push("userInfoUrl");
    if (isSAML) required.push("entityId", "singleSignOnServiceUrl");
    if (isSPIFFE) required.push("trustDomain", "bundleEndpoint");
    if (isJWT) required.push("issuer", "jwksUrl");
    (providerInfo?.properties || []).forEach((p: any) => p?.required && required.push(p.name));
    const missing = new Set(required.filter(k => !cs(k).trim()));
    const aliasTrim = alias.trim();
    const aliasTaken = existing?.has?.(aliasTrim);
    const err = (k: string) => (showErrors && missing.has(k) ? t("sxIdpDetailFieldRequired") : undefined);

    const text = (k: string, label: string, o: any = {}) => (
        <TextField
            key={k}
            id={`idp-new-${k}`}
            label={label}
            hint={o.hint}
            type={o.type}
            placeholder={o.placeholder}
            required={required.includes(k)}
            error={err(k)}
            value={cs(k)}
            onChange={(v: string) => setC(k, v)}
        />
    );

    const discover = async () => {
        const fromUrl = discoveryUrl.trim();
        if (!fromUrl) return;
        setDiscovering(true);
        try {
            const result = await adminClient.identityProviders.importFromUrl({
                providerId: isSAML ? "saml" : "oidc",
                fromUrl
            });
            if (result && Object.keys(result).length) {
                setConfig((c: any) => ({ ...c, ...result }));
                addAlert(t("sxIdpDetailImported"), AlertVariant.success);
            } else {
                addError(t("sxIdpDetailImportError"), new Error(t("sxIdpDetailEmptyResponse")));
            }
        } catch (e) {
            addError(t("sxIdpDetailImportError"), e);
        } finally {
            setDiscovering(false);
        }
    };

    const submit = async () => {
        if (!aliasTrim) {
            setShowErrors(true);
            addAlert(t("sxIdpsAliasRequired"), AlertVariant.warning);
            return;
        }
        if (aliasTaken) {
            setShowErrors(true);
            return;
        }
        if (missing.size) {
            setShowErrors(true);
            addAlert(t("sxIdpDetailRequiredMissing"), AlertVariant.warning);
            return;
        }
        setSaving(true);
        try {
            await adminClient.identityProviders.create({
                alias: aliasTrim,
                providerId,
                displayName: displayName.trim() || undefined,
                enabled: true,
                config
            });
            addAlert(t("sxIdpsCreated"), AlertVariant.success);
            onCreated(aliasTrim);
        } catch (e) {
            addError(t("sxIdpsCreateError"), e);
            setSaving(false);
        }
    };

    return (
        <>
            <ModalBody>
                <div className="flex flex-col gap-4">
                    <TextField
                        id="idp-new-alias"
                        label={t("sxCommonAlias")}
                        hint={t("sxIdpsAliasHint")}
                        required
                        error={
                            showErrors && !aliasTrim
                                ? t("sxIdpDetailFieldRequired")
                                : aliasTaken
                                  ? t("sxIdpsAliasTaken")
                                  : undefined
                        }
                        value={alias}
                        onChange={setAlias}
                    />
                    {!isSPIFFE && !isKubernetes && !isJWT && (
                        <TextField
                            id="idp-new-display-name"
                            label={t("sxCommonDisplayName")}
                            hint={t("sxIdpsDisplayNameHelp")}
                            value={displayName}
                            onChange={setDisplayName}
                        />
                    )}
                    {isSocial && text("clientId", t("sxIdpDetailClientId"))}
                    {isSocial && text("clientSecret", t("sxIdpDetailClientSecret"), { type: "password" })}
                    {providerInfo && (
                        <DynamicFields
                            idPrefix="idp-new-prop"
                            properties={providerInfo.properties}
                            errors={showErrors ? missing : null}
                            read={(name: string) => config[name]}
                            write={(name: string, v: any) => setC(name, Array.isArray(v) ? v.join(MULTI_SEPARATOR) : v)}
                        />
                    )}
                    {isSAML && text("entityId", t("sxIdpDetailSpEntityId"), { hint: t("sxIdpDetailSpEntityIdHint") })}
                    {(isOIDC || isOAuth2 || isSAML) && (
                        <FormField
                            label={isSAML ? t("sxIdpsSamlDescriptorUrl") : t("sxIdpDetailDiscoveryUrl")}
                            htmlFor="idp-new-discovery"
                            hint={isSAML ? t("sxIdpsSamlDescriptorHint") : t("sxIdpDetailDiscoveryHint")}
                        >
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                    size="lg"
                                    id="idp-new-discovery"
                                    type="url"
                                    value={discoveryUrl}
                                    onChange={(e: any) => setDiscoveryUrl(e.target.value)}
                                    onKeyDown={(e: any) => e.key === "Enter" && discover()}
                                    placeholder={
                                        isSAML
                                            ? "https://idp.example.com/saml/metadata"
                                            : "https://idp.example.com/.well-known/openid-configuration"
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="h-13.5 shrink-0 rounded-xl px-5 text-[15px] font-medium"
                                    disabled={!discoveryUrl.trim() || discovering}
                                    onClick={discover}
                                >
                                    {discovering ? t("sxIdpDetailImporting") : t("sxIdpDetailImport")}
                                </Button>
                            </div>
                        </FormField>
                    )}
                    {(isOIDC || isOAuth2) && (
                        <>
                            {text("authorizationUrl", t("sxIdpDetailAuthorizationUrl"), { type: "url" })}
                            {text("tokenUrl", t("sxIdpDetailTokenUrl"), { type: "url" })}
                            {isOAuth2 && text("userInfoUrl", t("sxIdpDetailUserInfoUrl"), { type: "url" })}
                            {isOIDC && text("issuer", t("sxIdpDetailIssuer"))}
                            <SelectField
                                id="idp-new-client-auth"
                                label={t("sxIdpDetailClientAuth")}
                                value={cs("clientAuthMethod")}
                                onChange={(v: string) => setC("clientAuthMethod", v)}
                                options={CLIENT_AUTHS.map(o => ({ value: o.value, label: t(o.label) }))}
                            />
                            {text("clientId", t("sxIdpDetailClientId"))}
                            {text("clientSecret", t("sxIdpDetailClientSecret"), { type: "password" })}
                        </>
                    )}
                    {isSAML && text("singleSignOnServiceUrl", t("sxIdpDetailSsoUrl"), { type: "url" })}
                    {isSAML && text("idpEntityId", t("sxIdpDetailEntityId"))}
                    {isKubernetes &&
                        text("issuer", t("sxIdpDetailKubernetesIssuer"), { type: "url", hint: t("sxIdpDetailKubernetesIssuerHint") })}
                    {isSPIFFE && text("trustDomain", t("sxIdpDetailSpiffeTrustDomain"), { hint: t("sxIdpDetailSpiffeTrustDomainHint") })}
                    {isSPIFFE &&
                        text("bundleEndpoint", t("sxIdpDetailSpiffeBundleEndpoint"), { type: "url", hint: t("sxIdpDetailHttpsHint") })}
                    {isJWT && text("issuer", t("sxIdpDetailIssuer"))}
                    {isJWT && text("jwksUrl", t("sxIdpDetailJwksUrl"), { type: "url" })}
                    <p className="px-0.5 text-[13px] leading-[1.4] text-muted-foreground">{t("sxIdpsMoreSettingsHint")}</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <div className="flex w-full flex-col gap-1.5 sm:flex-row-reverse sm:justify-start">
                    <Button type="button" disabled={saving} onClick={submit}>
                        {saving ? t("sxCommonAdding") : t("sxCommonAdd")}
                    </Button>
                    <Button type="button" variant="plain" disabled={saving} onClick={onBack}>
                        {t("sxIdpsChooseAnother")}
                    </Button>
                </div>
            </ModalFooter>
        </>
    );
}
