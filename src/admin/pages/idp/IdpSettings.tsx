// @ts-nocheck
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { environment } from "../../environment";
import { Group, Notice, Row, Section, TextAction } from "../../ui/kit";
import { useT } from "../../ui/i18n";
import { useRealm } from "../../ui/realm";
import {
    AreaField,
    CopyField,
    DANGER_BUTTON,
    DynamicFields,
    FormField,
    MULTI_SEPARATOR,
    MultiLineField,
    SelectField,
    SwitchRow,
    TextField
} from "./shared";

export const SOCIAL_NS = "org.keycloak.broker.social.SocialIdentityProvider";
export const PROVIDER_NS = "org.keycloak.broker.provider.IdentityProvider";

export function providerKind(providerId: string) {
    const id = String(providerId || "");
    const isOIDC = id.includes("oidc");
    const isSAML = id.includes("saml");
    const isOAuth2 = id.includes("oauth2");
    const isSPIFFE = id.includes("spiffe");
    const isKubernetes = id.includes("kubernetes");
    const isJWT = id.includes("jwt-authorization-grant");
    const isSocial = !isOIDC && !isSAML && !isOAuth2 && !isSPIFFE && !isKubernetes && !isJWT;
    return { isOIDC, isSAML, isOAuth2, isSPIFFE, isKubernetes, isJWT, isSocial };
}

export function findProviderInfo(info: any, providerId: string) {
    for (const ns of [SOCIAL_NS, PROVIDER_NS]) {
        const found = info?.componentTypes?.[ns]?.find((p: any) => p.id === providerId);
        if (found) return found;
    }
    return undefined;
}

export const brokerUrl = (realm: string) =>
    `${String(environment.serverBaseUrl || "").replace(/\/+$/, "")}/realms/${realm}/broker`;

const cfgBool = (config: any, key: string) => String(config?.[key]) === "true";

const CLIENT_AUTHS = [
    { value: "client_secret_post", label: "sxIdpDetailAuthPost" },
    { value: "client_secret_basic", label: "sxIdpDetailAuthBasic" },
    { value: "client_secret_basic_unencoded", label: "sxIdpDetailAuthBasicUnencoded" },
    { value: "client_secret_jwt", label: "sxIdpDetailAuthJwtSecret" },
    { value: "private_key_jwt", label: "sxIdpDetailAuthJwtKey" }
];
const PROMPTS = [
    { value: "", label: "sxIdpDetailPromptUnspecified" },
    { value: "none", label: "sxIdpDetailPromptNone" },
    { value: "consent", label: "sxIdpDetailPromptConsent" },
    { value: "login", label: "sxIdpDetailPromptLogin" },
    { value: "select_account", label: "sxIdpDetailPromptSelectAccount" }
];
const SYNC_MODES = [
    { value: "IMPORT", label: "sxIdpDetailSyncImport" },
    { value: "LEGACY", label: "sxIdpDetailSyncLegacy" },
    { value: "FORCE", label: "sxIdpDetailSyncForce" }
];
const ACCOUNT_CONSOLE = [
    { value: "ALWAYS", label: "sxIdpDetailShowAlways" },
    { value: "WHEN_LINKED", label: "sxIdpDetailShowWhenLinked" },
    { value: "NEVER", label: "sxIdpDetailShowNever" }
];
const NAME_ID_FORMATS = [
    { value: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent", label: "sxIdpDetailNameIdPersistent" },
    { value: "urn:oasis:names:tc:SAML:2.0:nameid-format:transient", label: "sxIdpDetailNameIdTransient" },
    { value: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress", label: "sxIdpDetailNameIdEmail" },
    { value: "urn:oasis:names:tc:SAML:2.0:nameid-format:kerberos", label: "sxIdpDetailNameIdKerberos" },
    { value: "urn:oasis:names:tc:SAML:1.1:nameid-format:X509SubjectName", label: "sxIdpDetailNameIdX509" },
    {
        value: "urn:oasis:names:tc:SAML:1.1:nameid-format:WindowsDomainQualifiedName",
        label: "sxIdpDetailNameIdWindows"
    },
    { value: "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified", label: "sxIdpDetailNameIdUnspecified" }
];
const PRINCIPAL_TYPES = [
    { value: "SUBJECT", label: "sxIdpDetailPrincipalSubject" },
    { value: "ATTRIBUTE", label: "sxIdpDetailPrincipalAttribute" },
    { value: "FRIENDLY_ATTRIBUTE", label: "sxIdpDetailPrincipalFriendly" }
];
const SAML_SIG_ALGS = ["RSA_SHA1", "RSA_SHA256", "RSA_SHA256_MGF1", "RSA_SHA512", "RSA_SHA512_MGF1", "DSA_SHA1"];
const KEY_NAME_TRANSFORMERS = [
    { value: "NONE", label: "NONE" },
    { value: "KEY_ID", label: "KEY_ID" },
    { value: "CERT_SUBJECT", label: "CERT_SUBJECT" }
];
const COMPARISONS = [
    { value: "exact", label: "sxIdpDetailComparisonExact" },
    { value: "minimum", label: "sxIdpDetailComparisonMinimum" },
    { value: "maximum", label: "sxIdpDetailComparisonMaximum" },
    { value: "better", label: "sxIdpDetailComparisonBetter" }
];
const OAUTH2_CLAIMS = {
    userIDClaim: "sub",
    userNameClaim: "preferred_username",
    emailClaim: "email",
    fullNameClaim: "name",
    givenNameClaim: "given_name",
    familyNameClaim: "family_name"
};

const DEFAULTS: Record<string, string> = {
    sendIdTokenOnLogout: "true",
    useJwksUrl: "true",
    clientAuthMethod: "client_secret_post",
    pkceMethod: "plain",
    syncMode: "IMPORT",
    showInAccountConsole: "ALWAYS",
    nameIDPolicyFormat: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
    principalType: "SUBJECT",
    signatureAlgorithm: "RSA_SHA256",
    xmlSigKeyInfoKeyNameTransformer: "KEY_ID",
    encryptionAlgorithm: "RSA-OAEP",
    authnContextComparisonType: "exact",
    allowedClockSkew: "0",
    jwtAuthorizationGrantMaxAllowedAssertionExpiration: "300",
    ...OAUTH2_CLAIMS
};

const parseRefs = (v: any) => {
    if (!v) return [];
    try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
        return [];
    }
};

function initDraft(idp: any) {
    return {
        ...idp,
        config: { ...(idp.config || {}) },
        hideOnLogin: idp.hideOnLogin ?? cfgBool(idp.config, "hideOnLoginPage"),
        storeToken: !!idp.storeToken,
        addReadTokenRoleOnCreate: !!idp.addReadTokenRoleOnCreate,
        trustEmail: !!idp.trustEmail,
        linkOnly: !!idp.linkOnly,
        enabled: !!idp.enabled,
        displayName: idp.displayName || ""
    };
}

export function IdpSettings({ idp, server, reload, onDelete }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const providerId = idp.providerId || "";
    const kind = providerKind(providerId);
    const { isOIDC, isSAML, isOAuth2, isSPIFFE, isKubernetes, isJWT, isSocial } = kind;
    const info = server.info;
    const providerInfo = findProviderInfo(info, providerId);
    const feature = server.isFeatureEnabled;

    const [draft, setDraft] = useState(() => initDraft(idp));
    const [showErrors, setShowErrors] = useState(false);
    const [saving, setSaving] = useState(false);
    const [oidcAdvanced, setOidcAdvanced] = useState(false);

    const cs = (k: string, d?: string) => {
        const v = draft.config[k];
        return v == null || v === "" ? (d ?? DEFAULTS[k] ?? "") : String(v);
    };
    const cb = (k: string, d = false) =>
        draft.config[k] == null || draft.config[k] === "" ? d : String(draft.config[k]) === "true";
    const setC = (k: string, v: any) => setDraft((p: any) => ({ ...p, config: { ...p.config, [k]: v } }));
    const setCb = (k: string, v: boolean) => setC(k, v ? "true" : "false");
    const setTop = (k: string, v: any) => setDraft((p: any) => ({ ...p, [k]: v }));

    const clientAuthMethod = cs("clientAuthMethod");
    const validateSignature = cb("validateSignature");
    const useJwks = cb("useJwksUrl", true);
    const jwtGrantEnabled = cb("jwtAuthorizationGrantEnabled");
    const supportsAssertions = cb("supportsClientAssertions");
    const clientAuthFederated = feature("CLIENT_AUTH_FEDERATED");
    const jwtGrantFeature = feature("JWT_AUTHORIZATION_GRANT");
    const isJwtGrantSupported =
        (isOAuth2 || isOIDC) && Array.isArray(idp.types) && idp.types.includes("JWT_AUTHORIZATION_GRANT") && jwtGrantFeature;
    const transient = feature("TRANSIENT_USERS") && cb("doNotStoreUsers");
    const showGeneral = !isSPIFFE && !isKubernetes && !isJWT;

    const required: string[] = [];
    if (isSocial) required.push("clientId", "clientSecret");
    if (isOIDC || isOAuth2) {
        required.push("authorizationUrl", "tokenUrl", "clientId");
        if (clientAuthMethod !== "private_key_jwt") required.push("clientSecret");
    }
    if (isOAuth2) required.push("userInfoUrl", "userIDClaim", "userNameClaim", "emailClaim");
    if ((isOIDC && (validateSignature || (isJwtGrantSupported && jwtGrantEnabled) || supportsAssertions)) || isJWT)
        required.push(useJwks ? "jwksUrl" : "publicKeySignatureVerifier");
    if (isJWT) required.push("issuer");
    if (isSAML) {
        required.push("singleSignOnServiceUrl");
        if (validateSignature && cb("useMetadataDescriptorUrl")) required.push("metadataDescriptorUrl");
    }
    if (isSPIFFE) required.push("trustDomain", "bundleEndpoint");
    if (cb("filteredByClaim") && (isOIDC || (!isSAML && !isOAuth2))) required.push("claimFilterName", "claimFilterValue");
    (providerInfo?.properties || []).forEach((p: any) => p?.required && required.push(p.name));
    const missing = new Set(required.filter(k => !cs(k).trim()));
    const err = (k: string) => (showErrors && missing.has(k) ? t("sxIdpDetailFieldRequired") : undefined);

    const initial = initDraft(idp);
    const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

    const reset = () => {
        setDraft(initDraft(idp));
        setShowErrors(false);
    };

    const save = async () => {
        if (missing.size) {
            setShowErrors(true);
            addAlert(t("sxIdpDetailRequiredMissing"), AlertVariant.warning);
            return;
        }
        setSaving(true);
        try {
            const config = { ...(idp.config || {}), ...draft.config };
            if (isOAuth2)
                Object.entries(OAUTH2_CLAIMS).forEach(([k, v]) => {
                    if (!config[k]) config[k] = v;
                });
            await adminClient.identityProviders.update(
                { alias: idp.alias },
                {
                    ...draft,
                    alias: idp.alias,
                    providerId,
                    displayName: String(draft.displayName || "").trim() || undefined,
                    config
                }
            );
            addAlert(t("sxIdpDetailSaved"), AlertVariant.success);
            setShowErrors(false);
            reload();
        } catch (e) {
            addError(t("sxCommonSaveError"), e);
        } finally {
            setSaving(false);
        }
    };

    const text = (k: string, label: string, o: any = {}) => (
        <TextField
            key={k}
            id={`idp-${k}`}
            label={label}
            hint={o.hint}
            type={o.type}
            min={o.min}
            placeholder={o.placeholder}
            required={required.includes(k)}
            error={err(k)}
            value={draft.config[k] == null ? (o.def ?? DEFAULTS[k] ?? "") : String(draft.config[k])}
            onChange={(v: string) => setC(k, v)}
        />
    );
    const sw = (k: string, label: string, hint?: string, def = false) => (
        <SwitchRow key={k} label={label} hint={hint} checked={cb(k, def)} onChange={(v: boolean) => setCb(k, v)} />
    );
    const select = (k: string, label: string, options: any[], hint?: string) => (
        <SelectField
            key={k}
            id={`idp-${k}`}
            label={label}
            hint={hint}
            value={cs(k)}
            onChange={(v: string) => setC(k, v)}
            options={options.map(o => ({ value: o.value, label: o.label.startsWith("sx") ? t(o.label) : o.label }))}
        />
    );
    const algOptions = (map: any) => [
        { value: "", label: "sxIdpDetailAlgorithmNotSpecified" },
        ...Object.keys(map || {})
            .sort()
            .map(p => ({ value: p, label: p }))
    ];

    const jwks = () => (
        <>
            <Group>{sw("useJwksUrl", t("sxIdpDetailUseJwksUrl"), undefined, true)}</Group>
            {useJwks ? (
                text("jwksUrl", t("sxIdpDetailJwksUrl"), { type: "url" })
            ) : (
                <>
                    {!cs("publicKeySignatureVerifier").trim().startsWith("{") &&
                        text("publicKeySignatureVerifierKeyId", t("sxIdpDetailValidatingKeyId"))}
                    <AreaField
                        id="idp-publicKeySignatureVerifier"
                        label={t("sxIdpDetailValidatingKey")}
                        required
                        error={err("publicKeySignatureVerifier")}
                        value={cs("publicKeySignatureVerifier")}
                        onChange={(v: string) => setC("publicKeySignatureVerifier", v)}
                    />
                </>
            )}
        </>
    );

    const assertionSettings = () => (
        <>
            <Group>
                {sw(
                    "jwtAuthorizationGrantAssertionReuseAllowed",
                    t("sxIdpDetailJwtReuseAllowed"),
                    t("sxIdpDetailJwtReuseAllowedHint")
                )}
                {sw(
                    "jwtAuthorizationGrantLimitAccessTokenExp",
                    t("sxIdpDetailJwtLimitTokenExp")
                )}
            </Group>
            {text("jwtAuthorizationGrantMaxAllowedAssertionExpiration", t("sxIdpDetailJwtMaxExp"), {
                type: "number",
                min: 0,
                hint: t("sxIdpDetailSecondsHint")
            })}
            {select(
                "jwtAuthorizationGrantAssertionSignatureAlg",
                t("sxIdpDetailJwtSignatureAlg"),
                algOptions(info?.providers?.signature?.providers)
            )}
        </>
    );

    const clientAuth = () => (
        <Section label={t("sxIdpDetailClientAuthSection")}>
            <div className="flex flex-col gap-4">
                {select("clientAuthMethod", t("sxIdpDetailClientAuth"), CLIENT_AUTHS)}
                {text("clientId", t("sxIdpDetailClientId"))}
                {text("clientSecret", t("sxIdpDetailClientSecret"), { type: "password" })}
                {select(
                    "clientAssertionSigningAlg",
                    t("sxIdpDetailClientAssertionAlg"),
                    algOptions(info?.providers?.clientSignature?.providers)
                )}
                {(clientAuthMethod === "private_key_jwt" || clientAuthMethod === "client_secret_jwt") &&
                    text("clientAssertionAudience", t("sxIdpDetailClientAssertionAudience"))}
                {clientAuthMethod === "private_key_jwt" && (
                    <Group>{sw("jwtX509HeadersEnabled", t("sxIdpDetailJwtX509Headers"))}</Group>
                )}
            </div>
        </Section>
    );

    const pkce = () => (
        <>
            <Group>{sw("pkceEnabled", t("sxIdpDetailPkceEnabled"))}</Group>
            {cb("pkceEnabled") &&
                select("pkceMethod", t("sxIdpDetailPkceMethod"), [
                    { value: "plain", label: "plain" },
                    { value: "S256", label: "S256" }
                ])}
        </>
    );

    const advancedToggle = (
        <TextAction onClick={() => setOidcAdvanced(v => !v)}>
            {oidcAdvanced ? t("sxIdpDetailHideAdvanced") : t("sxIdpDetailShowAdvanced")}
        </TextAction>
    );

    return (
        <>
            {showGeneral && (
                <Section label={t("sxIdpDetailGeneralSettings")}>
                    <div className="flex flex-col gap-4">
                        <CopyField
                            id="idp-redirect-uri"
                            label={t("sxIdpDetailRedirectUri")}
                            hint={t("sxIdpDetailRedirectUriHint")}
                            value={`${brokerUrl(realm)}/${idp.alias}/endpoint`}
                        />
                        <TextField id="idp-alias" label={t("sxCommonAlias")} value={idp.alias} readOnly mono />
                        <TextField
                            id="idp-display-name"
                            label={t("sxCommonDisplayName")}
                            value={draft.displayName}
                            placeholder={idp.alias}
                            onChange={(v: string) => setTop("displayName", v)}
                        />
                        {text("guiOrder", t("sxIdpDetailDisplayOrder"), {
                            type: "number",
                            min: 0,
                            hint: t("sxIdpDetailDisplayOrderHint")
                        })}
                        {isSocial && text("clientId", t("sxIdpDetailClientId"))}
                        {isSocial && text("clientSecret", t("sxIdpDetailClientSecret"), { type: "password" })}
                        {isSAML && (
                            <FormField label={t("sxIdpDetailEndpoints")}>
                                <a
                                    href={`${String(environment.adminBaseUrl || environment.serverBaseUrl || "").replace(/\/+$/, "")}/realms/${realm}/broker/${idp.alias}/endpoint/descriptor`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ps-0.5 text-[15px] text-primary [overflow-wrap:anywhere] hover:underline"
                                >
                                    {t("sxIdpDetailSamlDescriptor")}
                                </a>
                            </FormField>
                        )}
                        {providerInfo && (
                            <DynamicFields
                                idPrefix="idp-prop"
                                properties={providerInfo.properties}
                                errors={showErrors ? missing : null}
                                read={(name: string) => draft.config[name]}
                                write={(name: string, v: any) =>
                                    setC(name, Array.isArray(v) ? v.join(MULTI_SEPARATOR) : v)
                                }
                            />
                        )}
                        <Group>
                            <SwitchRow
                                label={t("sxCommonEnabled")}
                                checked={draft.enabled}
                                onChange={(v: boolean) => setTop("enabled", v)}
                            />
                        </Group>
                        <Group>
                            <Row
                                title={t("sxIdpDetailProviderType")}
                                className="min-h-14"
                                trailing={<span className="text-sm text-muted-foreground">{providerId || "—"}</span>}
                            />
                        </Group>
                    </div>
                </Section>
            )}

            {isSPIFFE && (
                <Section label={t("sxIdpDetailGeneralSettings")}>
                    <div className="flex flex-col gap-4">
                        <TextField id="idp-alias" label={t("sxCommonAlias")} value={idp.alias} readOnly mono />
                        {text("trustDomain", t("sxIdpDetailSpiffeTrustDomain"), { hint: t("sxIdpDetailSpiffeTrustDomainHint") })}
                        {text("bundleEndpoint", t("sxIdpDetailSpiffeBundleEndpoint"), {
                            type: "url",
                            hint: t("sxIdpDetailHttpsHint")
                        })}
                        {text("fedClientAssertionMaxExp", t("sxIdpDetailFedAssertionMaxExp"), {
                            type: "number",
                            min: 0,
                            hint: t("sxIdpDetailSecondsHint")
                        })}
                        <Group>
                            <SwitchRow
                                label={t("sxCommonEnabled")}
                                checked={draft.enabled}
                                onChange={(v: boolean) => setTop("enabled", v)}
                            />
                        </Group>
                    </div>
                </Section>
            )}

            {isKubernetes && (
                <Section label={t("sxIdpDetailGeneralSettings")}>
                    <div className="flex flex-col gap-4">
                        <TextField id="idp-alias" label={t("sxCommonAlias")} value={idp.alias} readOnly mono />
                        {text("issuer", t("sxIdpDetailKubernetesIssuer"), { type: "url", hint: t("sxIdpDetailKubernetesIssuerHint") })}
                        {text("fedClientAssertionMaxExp", t("sxIdpDetailFedAssertionMaxExp"), {
                            type: "number",
                            min: 0,
                            hint: t("sxIdpDetailSecondsHint")
                        })}
                        <Group>
                            <SwitchRow
                                label={t("sxCommonEnabled")}
                                checked={draft.enabled}
                                onChange={(v: boolean) => setTop("enabled", v)}
                            />
                        </Group>
                    </div>
                </Section>
            )}

            {isJWT && (
                <Section label={t("sxIdpDetailGeneralSettings")}>
                    <div className="flex flex-col gap-4">
                        <TextField id="idp-alias" label={t("sxCommonAlias")} value={idp.alias} readOnly mono />
                        {text("issuer", t("sxIdpDetailIssuer"))}
                        {jwks()}
                        {assertionSettings()}
                        {text("jwtAuthorizationGrantAllowedClockSkew", t("sxIdpDetailAllowedClockSkew"), {
                            type: "number",
                            min: 0,
                            def: "0",
                            hint: t("sxIdpDetailAllowedClockSkewHint")
                        })}
                        <Group>
                            <SwitchRow
                                label={t("sxCommonEnabled")}
                                checked={draft.enabled}
                                onChange={(v: boolean) => setTop("enabled", v)}
                            />
                        </Group>
                    </div>
                </Section>
            )}

            {(isOIDC || isOAuth2) && (
                <DiscoverySection
                    providerId={isOAuth2 ? "oidc" : providerId}
                    onImport={(merged: any) => setDraft((p: any) => ({ ...p, config: { ...p.config, ...merged } }))}
                />
            )}

            {(isOIDC || isOAuth2) && (
                <Section label={isOIDC ? t("sxIdpDetailOidcSettings") : t("sxIdpDetailOAuthSettings")}>
                    <div className="flex flex-col gap-4">
                        {text("authorizationUrl", t("sxIdpDetailAuthorizationUrl"), { type: "url" })}
                        {text("tokenUrl", t("sxIdpDetailTokenUrl"), { type: "url" })}
                        {isOIDC && text("logoutUrl", t("sxIdpDetailLogoutUrl"))}
                        {text("userInfoUrl", t("sxIdpDetailUserInfoUrl"))}
                        {text("tokenIntrospectionUrl", t("sxIdpDetailTokenIntrospectionUrl"), { type: "url" })}
                        {isOIDC && text("issuer", t("sxIdpDetailIssuer"))}
                        {isOIDC && (
                            <Group>
                                {sw("validateSignature", t("sxIdpDetailValidateSignature"))}
                            </Group>
                        )}
                        {isOIDC && (validateSignature || (isJwtGrantSupported && jwtGrantEnabled) || supportsAssertions) && jwks()}
                        {pkce()}
                    </div>
                </Section>
            )}

            {(isOIDC || isOAuth2) && clientAuth()}

            {isOAuth2 && (
                <Section label={t("sxIdpDetailUserProfileClaims")}>
                    <div className="flex flex-col gap-4">
                        {text("userIDClaim", t("sxIdpDetailUserIdClaim"))}
                        {text("userNameClaim", t("sxIdpDetailUserNameClaim"))}
                        {text("emailClaim", t("sxIdpDetailEmailClaim"))}
                        {text("fullNameClaim", t("sxIdpDetailFullNameClaim"))}
                        {text("givenNameClaim", t("sxIdpDetailGivenNameClaim"))}
                        {text("familyNameClaim", t("sxIdpDetailFamilyNameClaim"))}
                    </div>
                </Section>
            )}

            {(isOIDC || isOAuth2) && (
                <Section label={t("sxIdpDetailAdvanced")} action={advancedToggle}>
                    {!oidcAdvanced ? (
                        <p className="px-0.5 text-[13px] leading-[1.4] text-muted-foreground">
                            {t("sxIdpDetailAdvancedCollapsed")}
                        </p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {isOIDC && (
                                <Group>
                                    {sw("loginHint", t("sxIdpDetailPassLoginHint"), t("sxIdpDetailPassLoginHintHint"))}
                                    {sw("passMaxAge", t("sxIdpDetailPassMaxAge"), t("sxIdpDetailPassMaxAgeHint"))}
                                    {sw("uiLocales", t("sxIdpDetailPassLocale"), t("sxIdpDetailPassLocaleHint"))}
                                    {sw("backchannelSupported", t("sxIdpDetailBackchannelLogout"))}
                                    {sw("sendIdTokenOnLogout", t("sxIdpDetailSendIdTokenOnLogout"), undefined, true)}
                                    {sw("sendClientIdOnLogout", t("sxIdpDetailSendClientIdOnLogout"))}
                                    {sw("disableUserInfo", t("sxIdpDetailDisableUserInfo"), t("sxIdpDetailDisableUserInfoHint"))}
                                    {sw("disableNonce", t("sxIdpDetailDisableNonce"), t("sxIdpDetailDisableNonceHint"))}
                                    {sw("disableTypeClaimCheck", t("sxIdpDetailDisableTypeClaimCheck"))}
                                </Group>
                            )}
                            {text("defaultScope", t("sxIdpDetailDefaultScopes"), { hint: t("sxIdpDetailScopesHint") })}
                            {select("prompt", t("sxIdpDetailPrompt"), PROMPTS)}
                            <Group>
                                {sw(
                                    "acceptsPromptNoneForwardFromClient",
                                    t("sxIdpDetailAcceptsPromptNone")
                                )}
                                {sw("requiresShortStateParameter", t("sxIdpDetailShortState"))}
                            </Group>
                            {text("allowedClockSkew", t("sxIdpDetailAllowedClockSkew"), {
                                type: "number",
                                min: 0,
                                hint: t("sxIdpDetailAllowedClockSkewHint")
                            })}
                            {text("forwardParameters", t("sxIdpDetailForwardParameters"))}
                        </div>
                    )}
                </Section>
            )}

            {isJwtGrantSupported && (
                <Section label={t("sxIdpDetailAuthGrantSettings")}>
                    <div className="flex flex-col gap-4">
                        <Group>{sw("jwtAuthorizationGrantEnabled", t("sxIdpDetailJwtGrantEnabled"), t("sxIdpDetailJwtGrantEnabledHint"))}</Group>
                        {jwtGrantEnabled && assertionSettings()}
                    </div>
                </Section>
            )}

            {isSAML && (
                <SamlSettings
                    idp={idp}
                    dirty={dirty}
                    cs={cs}
                    cb={cb}
                    setC={setC}
                    text={text}
                    sw={sw}
                    select={select}
                    err={err}
                />
            )}

            {isSAML && (
                <Section label={t("sxIdpDetailReqAuthnConstraints")}>
                    <div className="flex flex-col gap-4">
                        {select("authnContextComparisonType", t("sxIdpDetailComparison"), COMPARISONS, t("sxIdpDetailComparisonHint"))}
                        <MultiLineField
                            id="idp-authn-class-refs"
                            label={t("sxIdpDetailAuthnClassRefs")}
                            hint={t("sxIdpDetailOnePerLine")}
                            values={parseRefs(draft.config.authnContextClassRefs)}
                            onChange={(vals: string[]) =>
                                setC("authnContextClassRefs", JSON.stringify(vals))
                            }
                        />
                        <MultiLineField
                            id="idp-authn-decl-refs"
                            label={t("sxIdpDetailAuthnDeclRefs")}
                            hint={t("sxIdpDetailOnePerLine")}
                            values={parseRefs(draft.config.authnContextDeclRefs)}
                            onChange={(vals: string[]) =>
                                setC("authnContextDeclRefs", JSON.stringify(vals))
                            }
                        />
                    </div>
                </Section>
            )}

            {showGeneral && (
                <Section label={t("sxIdpDetailAdvancedSettings")}>
                    <div className="flex flex-col gap-4">
                        {isSocial && text("defaultScope", t("sxIdpDetailDefaultScopes"), { hint: t("sxIdpDetailScopesHint") })}
                        <Group>
                            {feature("IDENTITY_BROKERING_API_V2") &&
                                sw("storeTokenInSession", t("sxIdpDetailStoreTokenInSession"), undefined, !isSAML)}
                            <SwitchRow
                                label={t("sxIdpDetailStoreToken")}
                                checked={draft.storeToken}
                                onChange={(v: boolean) => setTop("storeToken", v)}
                            />
                            {(isSAML || isOIDC || isOAuth2) && (
                                <SwitchRow
                                    label={t("sxIdpDetailStoredTokensReadable")}
                                    hint={t("sxIdpDetailStoredTokensReadableHint")}
                                    checked={draft.addReadTokenRoleOnCreate}
                                    onChange={(v: boolean) => setTop("addReadTokenRoleOnCreate", v)}
                                />
                            )}
                            {isSocial &&
                                sw(
                                    "acceptsPromptNoneForwardFromClient",
                                    t("sxIdpDetailAcceptsPromptNone")
                                )}
                            {isSocial && sw("disableUserInfo", t("sxIdpDetailDisableUserInfo"), t("sxIdpDetailDisableUserInfoHint"))}
                            {isOIDC && sw("isAccessTokenJWT", t("sxIdpDetailAccessTokenJwt"), t("sxIdpDetailAccessTokenJwtHint"))}
                            <SwitchRow
                                label={t("sxIdpDetailTrustEmail")}
                                hint={t("sxIdpDetailTrustEmailHint")}
                                checked={draft.trustEmail}
                                onChange={(v: boolean) => setTop("trustEmail", v)}
                            />
                            <SwitchRow
                                label={t("sxIdpDetailLinkOnly")}
                                hint={t("sxIdpDetailLinkOnlyHint")}
                                checked={draft.linkOnly}
                                onChange={(v: boolean) => setTop("linkOnly", v)}
                            />
                            <SwitchRow
                                label={t("sxIdpDetailHideOnLogin")}
                                hint={t("sxIdpDetailHideOnLoginHint")}
                                checked={!!draft.hideOnLogin}
                                onChange={(v: boolean) => setTop("hideOnLogin", v)}
                            />
                            {sw(
                                "caseSensitiveOriginalUsername",
                                t("sxIdpDetailCaseSensitiveUsername")
                            )}
                        </Group>
                        {select(
                            "showInAccountConsole",
                            t("sxIdpDetailShowInAccountConsole"),
                            ACCOUNT_CONSOLE
                        )}
                        {(isOIDC || (!isSAML && !isOAuth2)) && (
                            <Group>{sw("filteredByClaim", t("sxIdpDetailFilteredByClaim"))}</Group>
                        )}
                        {(isOIDC || (!isSAML && !isOAuth2)) && cb("filteredByClaim") && (
                            <>
                                {text("claimFilterName", t("sxIdpDetailClaimFilterName"), { hint: t("sxIdpDetailClaimFilterNameHint") })}
                                {text("claimFilterValue", t("sxIdpDetailClaimFilterValue"), {
                                    hint: t("sxIdpDetailClaimFilterValueHint")
                                })}
                            </>
                        )}
                        <FlowSelect
                            id="idp-first-broker-flow"
                            label={t("sxIdpDetailFirstLoginFlow")}
                            emptyLabel={t("sxIdpDetailFlowRealmDefault")}
                            value={draft.firstBrokerLoginFlowAlias || ""}
                            onChange={(v: string) => setTop("firstBrokerLoginFlowAlias", v)}
                        />
                        <FlowSelect
                            id="idp-post-broker-flow"
                            label={t("sxIdpDetailPostLoginFlow")}
                            emptyLabel={t("sxIdpDetailFlowNone")}
                            value={draft.postBrokerLoginFlowAlias || ""}
                            onChange={(v: string) => setTop("postBrokerLoginFlowAlias", v)}
                        />
                        {feature("TRANSIENT_USERS") && (
                            <Group>
                                <SwitchRow
                                    label={t("sxIdpDetailDoNotStoreUsers")}
                                    hint={t("sxIdpDetailDoNotStoreUsersHint")}
                                    checked={cb("doNotStoreUsers")}
                                    onChange={(v: boolean) =>
                                        setDraft((p: any) => ({
                                            ...p,
                                            config: {
                                                ...p.config,
                                                doNotStoreUsers: v ? "true" : "false",
                                                ...(v ? { syncMode: "IMPORT" } : {})
                                            }
                                        }))
                                    }
                                />
                            </Group>
                        )}
                        {!transient && select("syncMode", t("sxIdpDetailSyncMode"), SYNC_MODES)}
                        {clientAuthFederated && isOIDC && (
                            <Group>
                                {sw(
                                    "supportsClientAssertions",
                                    t("sxIdpDetailSupportsClientAssertions")
                                )}
                                {supportsAssertions &&
                                    sw("supportsClientAssertionReuse", t("sxIdpDetailSupportsAssertionReuse"))}
                            </Group>
                        )}
                        {isOIDC &&
                            ((clientAuthFederated && supportsAssertions) || (jwtGrantFeature && jwtGrantEnabled)) && (
                                <>
                                    <Group>{sw("allowClientIdAsAudience", t("sxIdpDetailAllowClientIdAudience"))}</Group>
                                    {text("fedClientAssertionMaxExp", t("sxIdpDetailFedAssertionMaxExp"), {
                                        type: "number",
                                        min: 0,
                                        hint: t("sxIdpDetailSecondsHint")
                                    })}
                                </>
                            )}
                    </div>
                </Section>
            )}

            <div className="flex flex-col gap-1.5">
                <Button size="form" block disabled={saving} onClick={save}>
                    {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                </Button>
                <Button variant="plain" size="form" block disabled={saving || !dirty} onClick={reset}>
                    {t("sxCommonCancel")}
                </Button>
            </div>

            <section className="border-t border-[#e5e5ea] pt-6 dark:border-[#38383a]">
                <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">{t("sxIdpDetailDeleteNote")}</p>
                <Button size="form" block className={DANGER_BUTTON} onClick={onDelete}>
                    {t("sxIdpDetailDeleteTitle")}
                </Button>
            </section>
        </>
    );
}

function SamlSettings({ idp, dirty, cs, cb, setC, text, sw, select }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [busy, setBusy] = useState(false);
    const validateSignature = cb("validateSignature");
    const useMetadata = cb("useMetadataDescriptorUrl");
    const metadataUrl = cs("metadataDescriptorUrl");
    const canReload = validateSignature && useMetadata && !!metadataUrl && !dirty && !!idp.enabled;
    const canImport = validateSignature && !useMetadata && !!metadataUrl && !dirty;

    const reloadKeys = async () => {
        setBusy(true);
        try {
            const ok = await adminClient.identityProviders.reloadKeys({ alias: idp.alias });
            if (ok) addAlert(t("sxIdpDetailReloadKeysSuccess"), AlertVariant.success);
            else addAlert(t("sxIdpDetailReloadKeysNoChange"), AlertVariant.warning);
        } catch (e) {
            addError(t("sxIdpDetailReloadKeysError"), e);
        } finally {
            setBusy(false);
        }
    };

    const importKeys = async () => {
        setBusy(true);
        try {
            const result = await adminClient.identityProviders.importFromUrl({
                providerId: idp.providerId,
                fromUrl: metadataUrl
            });
            if (result?.signingCertificate) {
                await adminClient.identityProviders.update(
                    { alias: idp.alias },
                    { ...idp, config: { ...(idp.config || {}), signingCertificate: result.signingCertificate } }
                );
                addAlert(t("sxIdpDetailImportKeysSuccess"), AlertVariant.success);
            } else {
                addError(t("sxIdpDetailImportKeysError"), new Error(t("sxIdpDetailNoSigningCertificate")));
            }
        } catch (e) {
            addError(t("sxIdpDetailImportKeysError"), e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Section
            label={t("sxIdpDetailSamlSettings")}
            action={
                canReload ? (
                    <TextAction disabled={busy} onClick={reloadKeys}>
                        {t("sxIdpDetailReloadKeys")}
                    </TextAction>
                ) : canImport ? (
                    <TextAction disabled={busy} onClick={importKeys}>
                        {t("sxIdpDetailImportKeys")}
                    </TextAction>
                ) : undefined
            }
        >
            <div className="flex flex-col gap-4">
                {text("entityId", t("sxIdpDetailSpEntityId"), { hint: t("sxIdpDetailSpEntityIdHint") })}
                {text("idpEntityId", t("sxIdpDetailEntityId"), { hint: t("sxIdpDetailIdpEntityIdHint") })}
                {text("singleSignOnServiceUrl", t("sxIdpDetailSsoUrl"), { type: "url" })}
                {text("artifactResolutionServiceUrl", t("sxIdpDetailArtifactResolutionUrl"), { type: "url" })}
                {text("singleLogoutServiceUrl", t("sxIdpDetailSloUrl"), { type: "url" })}
                <Group>
                    {sw("backchannelSupported", t("sxIdpDetailBackchannelLogout"))}
                    {sw("sendIdTokenOnLogout", t("sxIdpDetailSendIdTokenOnLogout"), undefined, true)}
                    {sw("sendClientIdOnLogout", t("sxIdpDetailSendClientIdOnLogout"))}
                </Group>
                {select("nameIDPolicyFormat", t("sxIdpDetailNameIdFormat"), NAME_ID_FORMATS)}
                {select("principalType", t("sxIdpDetailPrincipalType"), PRINCIPAL_TYPES)}
                {String(cs("principalType")).includes("ATTRIBUTE") &&
                    text("principalAttribute", t("sxIdpDetailPrincipalAttributeName"))}
                <Group>
                    {sw("allowCreate", t("sxIdpDetailAllowCreate"))}
                    {sw("postBindingResponse", t("sxIdpDetailPostBindingResponse"))}
                    {sw("artifactBindingResponse", t("sxIdpDetailArtifactBindingResponse"))}
                    {sw("postBindingAuthnRequest", t("sxIdpDetailPostBindingAuthn"))}
                    {sw("postBindingLogout", t("sxIdpDetailPostBindingLogout"))}
                    {sw("wantAuthnRequestsSigned", t("sxIdpDetailWantAuthnSigned"))}
                </Group>
                {cb("wantAuthnRequestsSigned") && (
                    <>
                        {select(
                            "signatureAlgorithm",
                            t("sxIdpDetailSignatureAlgorithm"),
                            SAML_SIG_ALGS.map(a => ({ value: a, label: a }))
                        )}
                        {select("xmlSigKeyInfoKeyNameTransformer", t("sxIdpDetailKeyNameTransformer"), KEY_NAME_TRANSFORMERS)}
                    </>
                )}
                <Group>
                    {sw("wantAssertionsSigned", t("sxIdpDetailWantAssertionsSigned"))}
                    {sw("wantAssertionsEncrypted", t("sxIdpDetailWantAssertionsEncrypted"))}
                </Group>
                {cb("wantAssertionsEncrypted") &&
                    select("encryptionAlgorithm", t("sxIdpDetailEncryptionAlgorithm"), [
                        { value: "RSA-OAEP", label: "RSA-OAEP" },
                        { value: "RSA1_5", label: "RSA1_5" }
                    ])}
                <Group>
                    {sw("forceAuthn", t("sxIdpDetailForceAuthn"))}
                    {sw("validateSignature", t("sxIdpDetailValidateSignature"))}
                </Group>
                {validateSignature && (
                    <>
                        {text("metadataDescriptorUrl", t("sxIdpDetailMetadataUrl"), {
                            type: "url",
                            hint: t("sxIdpDetailMetadataUrlHint")
                        })}
                        <Group>{sw("useMetadataDescriptorUrl", t("sxIdpDetailUseMetadataUrl"))}</Group>
                        {!useMetadata && (
                            <AreaField
                                id="idp-signingCertificate"
                                label={t("sxIdpDetailSigningCertificate")}
                                value={cs("signingCertificate")}
                                onChange={(v: string) => setC("signingCertificate", v)}
                            />
                        )}
                    </>
                )}
                <Group>
                    {sw("signSpMetadata", t("sxIdpDetailSignSpMetadata"))}
                    {sw("loginHint", t("sxIdpDetailPassSubject"), t("sxIdpDetailPassSubjectHint"))}
                </Group>
                {text("allowedClockSkew", t("sxIdpDetailAllowedClockSkew"), {
                    type: "number",
                    min: 0,
                    hint: t("sxIdpDetailAllowedClockSkewHint")
                })}
                {text("attributeConsumingServiceIndex", t("sxIdpDetailAcsIndex"), { type: "number", min: 0, def: "" })}
                {text("attributeConsumingServiceName", t("sxIdpDetailAcsName"))}
            </div>
        </Section>
    );
}

function FlowSelect({ id, label, hint, emptyLabel, value, onChange }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const [state, setState] = useState<any>({ status: "loading", flows: [] });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let alive = true;
        setState({ status: "loading", flows: [] });
        adminClient.authenticationManagement
            .getFlows()
            .then((flows: any[]) =>
                alive &&
                setState({
                    status: "ready",
                    flows: (flows || []).filter(f => f.providerId === "basic-flow").map(f => f.alias)
                })
            )
            .catch(() => alive && setState({ status: "error", flows: [] }));
        return () => {
            alive = false;
        };
    }, [adminClient, attempt]);

    if (state.status === "loading")
        return (
            <FormField label={label} hint={hint}>
                <div className="h-13.5 animate-pulse rounded-xl bg-black/5 dark:bg-white/8" />
            </FormField>
        );
    if (state.status === "error")
        return (
            <FormField label={label}>
                <Notice
                    title={t("sxIdpDetailFlowsLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            </FormField>
        );
    const options = [...state.flows];
    if (value && !options.includes(value)) options.unshift(value);
    return (
        <SelectField
            id={id}
            label={label}
            hint={hint}
            value={value}
            onChange={onChange}
            options={[{ value: "", label: emptyLabel }, ...options.map(a => ({ value: a, label: a }))]}
        />
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
            const result = await adminClient.identityProviders.importFromUrl({ providerId, fromUrl });
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
            <FormField label={t("sxIdpDetailDiscoveryUrl")} htmlFor="idp-discovery-url" hint={t("sxIdpDetailDiscoveryHint")}>
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
