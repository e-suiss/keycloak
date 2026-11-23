// @ts-nocheck

import { XIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useT } from "../ui/i18n";
import {
    AdminPage,
    Chip,
    GROUP,
    Group,
    ListSkeleton,
    Notice,
    Row,
    SEPARATOR,
    Section,
    SegmentTabs
} from "../ui/kit";
import { useRealm } from "../ui/realm";
import { adminFetch } from "../ui/util";

const TABS = [
    { key: "general", label: "sxRealmSettingsTabGeneral" },
    { key: "login", label: "sxRealmSettingsTabLogin" },
    { key: "email", label: "sxRealmSettingsTabEmail" },
    { key: "themes", label: "sxRealmSettingsTabThemes" },
    { key: "localization", label: "sxRealmSettingsTabLocalization" },
    { key: "sessions", label: "sxRealmSettingsTabSessions" },
    { key: "tokens", label: "sxRealmSettingsTabTokens" },
    { key: "security", label: "sxRealmSettingsTabSecurity" },
    { key: "keys", label: "sxRealmSettingsTabKeys" },
    { key: "events-config", label: "sxRealmSettingsTabEventsConfig" },
    { key: "user-profile", label: "sxRealmSettingsTabUserProfile" },
    { key: "client-policies", label: "sxRealmSettingsTabClientPolicies" }
];

const PER_TAB_SAVE = ["keys", "events-config", "user-profile", "client-policies"];

const SSL_OPTIONS = [
    { value: "none", label: "sxRealmSettingsSslNone" },
    { value: "external", label: "sxRealmSettingsSslExternal" },
    { value: "all", label: "sxRealmSettingsSslAll" }
];

const SIG_ALGS = [
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "PS256",
    "PS384",
    "PS512",
    "HS256",
    "HS384",
    "HS512"
];

export default function RealmSettings() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [e, setE] = useState<any>(null);
    const [tab, setTab] = useState("general");
    const [themes, setThemes] = useState<any>({
        login: [],
        account: [],
        admin: [],
        email: []
    });

    const realmRef = useRef(realm);
    realmRef.current = realm;
    const inFlight = useRef(new Set<string>());

    const [keys, setKeys] = useState<any>(null);
    const [keysFailed, setKeysFailed] = useState(false);
    const [keyProviders, setKeyProviders] = useState<any[] | null>(null);
    const [keyProvidersFailed, setKeyProvidersFailed] = useState(false);

    const [eventsCfg, setEventsCfg] = useState<any>(null);
    const [eventsFailed, setEventsFailed] = useState(false);
    const [eventTypes, setEventTypes] = useState<string[]>([]);
    const [eventListeners, setEventListeners] = useState<string[]>([]);
    const [savingEvents, setSavingEvents] = useState(false);

    const [profile, setProfile] = useState<any>(null);
    const [profileJson, setProfileJson] = useState("");
    const [profileErr, setProfileErr] = useState("");
    const [profileFailed, setProfileFailed] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    const [profilesDoc, setProfilesDoc] = useState<any>(null);
    const [policiesDoc, setPoliciesDoc] = useState<any>(null);
    const [cpFailed, setCpFailed] = useState(false);
    const [profilesJson, setProfilesJson] = useState("");
    const [policiesJson, setPoliciesJson] = useState("");
    const [cpErr, setCpErr] = useState("");
    const [savingProfiles, setSavingProfiles] = useState(false);
    const [savingPolicies, setSavingPolicies] = useState(false);

    const load = async (initial = false) => {
        const target = realm;
        setLoading(true);
        try {
            const [rep, info] = await Promise.all([
                adminClient.realms.findOne({ realm: target }),
                adminClient.serverInfo.find().catch(() => null)
            ]);
            if (realmRef.current !== target) return;
            setE(rep || null);
            if (info?.themes) {
                const pick = (k: string) =>
                    (info.themes[k] || []).map((x: any) => x.name).filter(Boolean);
                setThemes({
                    login: pick("login"),
                    account: pick("account"),
                    admin: pick("admin"),
                    email: pick("email")
                });
            }
        } catch (err) {
            if (realmRef.current !== target) return;
            if (!initial) addError(t("sxRealmSettingsLoadError"), err);
        } finally {
            if (realmRef.current === target) setLoading(false);
        }
    };

    useEffect(() => {
        setE(null);
        load(true);
    }, [realm]);

    const set = (k: string, v: any) => setE((p: any) => ({ ...p, [k]: v }));
    const setNum = (k: string, v: any) => set(k, v === "" ? undefined : Number(v));
    const setNested = (obj: string, k: string, v: any) =>
        setE((p: any) => ({ ...p, [obj]: { ...(p[obj] || {}), [k]: v } }));
    const setAttr = (k: string, v: any) =>
        setE((p: any) => ({ ...p, attributes: { ...(p.attributes || {}), [k]: v } }));

    const save = async () => {
        setSaving(true);
        try {
            await adminClient.realms.update({ realm }, e);
            addAlert(t("sxRealmSettingsSaved"), AlertVariant.success);
            await load();
        } catch (err) {
            addError(t("sxRealmSettingsSaveError"), err);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        setKeys(null);
        setKeysFailed(false);
        setKeyProviders(null);
        setKeyProvidersFailed(false);
        setEventsCfg(null);
        setEventsFailed(false);
        setProfile(null);
        setProfileFailed(false);
        setProfilesDoc(null);
        setPoliciesDoc(null);
        setCpFailed(false);
    }, [realm]);

    const needKeys = keys === null && !keysFailed;
    const needKeyProviders = keyProviders === null && !keyProvidersFailed;
    const needEvents = eventsCfg === null && !eventsFailed;
    const needProfile = profile === null && !profileFailed;
    const needPolicies = profilesDoc === null && !cpFailed;

    useEffect(() => {
        if (loading) return;
        const target = realm;
        const run = (name: string, task: () => Promise<any>) => {
            const id = `${target}:${name}`;
            if (inFlight.current.has(id)) return;
            inFlight.current.add(id);
            task().finally(() => inFlight.current.delete(id));
        };
        const current = () => realmRef.current === target;
        if (tab === "keys" && needKeys) {
            run("keys", () =>
                adminClient.realms
                    .getKeys({ realm: target })
                    .then((k: any) => current() && setKeys(k || { keys: [] }))
                    .catch(() => current() && setKeysFailed(true))
            );
        }
        if (tab === "keys" && needKeyProviders) {
            run("key-providers", () =>
                adminClient.components
                    .find({ realm: target, type: "org.keycloak.keys.KeyProvider" })
                    .then((comps: any) => current() && setKeyProviders(comps || []))
                    .catch(() => current() && setKeyProvidersFailed(true))
            );
        }
        if (tab === "events-config" && needEvents) {
            run("events", () =>
                Promise.all([
                    adminClient.realms.getConfigEvents({ realm: target }),
                    adminClient.serverInfo.find().catch(() => null),
                    adminFetch(adminClient, target, "ui-ext/available-event-listeners").catch(
                        () => []
                    )
                ])
                    .then(([cfg, info, listeners]) => {
                        if (!current()) return;
                        setEventsCfg(cfg || {});
                        setEventTypes((info?.enums?.eventType as string[]) || []);
                        const ids = Array.isArray(listeners)
                            ? listeners.map((x: any) => x.id || x).filter(Boolean)
                            : [];
                        setEventListeners(ids);
                    })
                    .catch(() => current() && setEventsFailed(true))
            );
        }
        if (tab === "user-profile" && needProfile) {
            run("profile", () =>
                adminClient.users
                    .getProfile({ realm: target })
                    .then((p: any) => {
                        if (!current()) return;
                        setProfile(p || {});
                        setProfileJson(JSON.stringify(p || {}, null, 2));
                    })
                    .catch(() => current() && setProfileFailed(true))
            );
        }
        if (tab === "client-policies" && needPolicies) {
            run("client-policies", () =>
                Promise.all([
                    adminClient.clientPolicies.listProfiles({
                        realm: target,
                        includeGlobalProfiles: true
                    }),
                    adminClient.clientPolicies.listPolicies({ realm: target })
                ])
                    .then(([prof, pol]) => {
                        if (!current()) return;
                        setProfilesDoc(prof || {});
                        setPoliciesDoc(pol || {});
                        setProfilesJson(JSON.stringify(prof || {}, null, 2));
                        setPoliciesJson(JSON.stringify(pol || {}, null, 2));
                    })
                    .catch(() => current() && setCpFailed(true))
            );
        }
    }, [tab, loading, realm, needKeys, needKeyProviders, needEvents, needProfile, needPolicies]);

    const retryKeys = () => {
        setKeys(null);
        setKeysFailed(false);
    };
    const retryKeyProviders = () => {
        setKeyProviders(null);
        setKeyProvidersFailed(false);
    };
    const retryEvents = () => {
        setEventsCfg(null);
        setEventsFailed(false);
    };
    const retryProfile = () => {
        setProfile(null);
        setProfileFailed(false);
    };
    const retryPolicies = () => {
        setProfilesDoc(null);
        setPoliciesDoc(null);
        setCpFailed(false);
    };

    const setEvt = (k: string, v: any) =>
        setEventsCfg((p: any) => ({ ...(p || {}), [k]: v }));

    const saveEvents = async () => {
        setSavingEvents(true);
        try {
            await adminClient.realms.updateConfigEvents({ realm }, eventsCfg);
            addAlert(t("sxRealmSettingsEventsSaved"), AlertVariant.success);
        } catch (err) {
            addError(t("sxRealmSettingsSaveError"), err);
        } finally {
            setSavingEvents(false);
        }
    };

    const saveProfile = async () => {
        let parsed: any;
        try {
            parsed = JSON.parse(profileJson);
            setProfileErr("");
        } catch (err: any) {
            setProfileErr(t("sxRealmSettingsInvalidJson", { message: err.message }));
            return;
        }
        setSavingProfile(true);
        try {
            const updated = await adminClient.users.updateProfile({ ...parsed, realm });
            setProfile(updated || parsed);
            setProfileJson(JSON.stringify(updated || parsed, null, 2));
            addAlert(t("sxRealmSettingsUserProfileSaved"), AlertVariant.success);
        } catch (err) {
            addError(t("sxRealmSettingsSaveError"), err);
        } finally {
            setSavingProfile(false);
        }
    };

    const saveProfiles = async () => {
        let parsed: any;
        try {
            parsed = JSON.parse(profilesJson);
            setCpErr("");
        } catch (err: any) {
            setCpErr(t("sxRealmSettingsProfilesInvalidJson", { message: err.message }));
            return;
        }
        setSavingProfiles(true);
        try {
            await adminClient.clientPolicies.createProfiles({ ...parsed, realm });
            addAlert(t("sxRealmSettingsClientProfilesSaved"), AlertVariant.success);
        } catch (err) {
            addError(t("sxRealmSettingsSaveError"), err);
        } finally {
            setSavingProfiles(false);
        }
    };

    const savePolicies = async () => {
        let parsed: any;
        try {
            parsed = JSON.parse(policiesJson);
            setCpErr("");
        } catch (err: any) {
            setCpErr(t("sxRealmSettingsPoliciesInvalidJson", { message: err.message }));
            return;
        }
        setSavingPolicies(true);
        try {
            await adminClient.clientPolicies.updatePolicy({ ...parsed, realm });
            addAlert(t("sxRealmSettingsClientPoliciesSaved"), AlertVariant.success);
        } catch (err) {
            addError(t("sxRealmSettingsSaveError"), err);
        } finally {
            setSavingPolicies(false);
        }
    };

    const isGlobalTab = !PER_TAB_SAVE.includes(tab);

    const page = (actions: any, children: any) => (
        <AdminPage
            width="wide"
            title={t("sxRealmSettingsTitle")}
            description={t("sxRealmSettingsDescription")}
            actions={actions}
        >
            {children}
        </AdminPage>
    );

    if (!e) {
        return page(
            undefined,
            loading ? (
                <ListSkeleton rows={4} />
            ) : (
                <Notice
                    title={t("sxRealmSettingsLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => load(true)}
                />
            )
        );
    }

    const smtp = e.smtpServer || {};
    const hdr = e.browserSecurityHeaders || {};
    const locales = e.supportedLocales || [];

    const loadError = (title: string, onRetry: () => void) => (
        <Notice title={title} description={t("sxLoadErrorDescription")} onRetry={onRetry} />
    );

    return page(
        isGlobalTab ? (
            <Button type="button" onClick={save} disabled={saving || loading}>
                {saving ? t("sxRealmSettingsSaving") : t("sxRealmSettingsSave")}
            </Button>
        ) : undefined,
        <>
            <SegmentTabs
                value={tab}
                onChange={setTab}
                items={TABS.map(x => ({ value: x.key, label: t(x.label) }))}
                ariaLabel={t("sxRealmSettingsTabsLabel")}
            />

            {tab === "general" && (
                <>
                    <Section label={t("sxRealmSettingsGeneral")}>
                        <Card>
                            <InfoRow label={t("sxRealmSettingsRealmId")}>
                                <span className="font-mono text-sm text-muted-foreground [overflow-wrap:anywhere]">
                                    {e.realm}
                                </span>
                            </InfoRow>
                            <TextField
                                label={t("sxRealmSettingsDisplayName")}
                                value={e.displayName}
                                onChange={(v: string) => set("displayName", v)}
                            />
                            <TextField
                                label={t("sxRealmSettingsHtmlDisplayName")}
                                hint={t("sxRealmSettingsHtmlDisplayNameHint")}
                                value={e.displayNameHtml}
                                onChange={(v: string) => set("displayNameHtml", v)}
                            />
                            <TextField
                                label={t("sxRealmSettingsFrontendUrl")}
                                hint={t("sxRealmSettingsFrontendUrlHint")}
                                value={e.attributes?.frontendUrl}
                                onChange={(v: string) => setAttr("frontendUrl", v)}
                                placeholder="https://login.example.com"
                            />
                            <ChoiceField
                                label={t("sxRealmSettingsSslRequired")}
                                value={e.sslRequired ?? "external"}
                                onChange={(v: string) => set("sslRequired", v)}
                                options={SSL_OPTIONS.map(o => ({ value: o.value, label: t(o.label) }))}
                            />
                        </Card>
                    </Section>
                    <Section label={t("sxRealmSettingsFeatures")}>
                        <Card>
                            <ToggleRow
                                label={t("sxRealmSettingsRealmEnabled")}
                                checked={e.enabled}
                                onChange={(v: boolean) => set("enabled", v)}
                            />
                            <ToggleRow
                                label={t("sxRealmSettingsUma")}
                                checked={e.userManagedAccessAllowed}
                                onChange={(v: boolean) => set("userManagedAccessAllowed", v)}
                            />
                            <ToggleRow
                                label={t("sxRealmSettingsOrganizations")}
                                checked={e.organizationsEnabled}
                                onChange={(v: boolean) => set("organizationsEnabled", v)}
                            />
                            <ToggleRow
                                label={t("sxRealmSettingsAdminPermissions")}
                                hint={t("sxRealmSettingsAdminPermissionsHint", {
                                    feature: "admin-fine-grained-authz:v2"
                                })}
                                checked={e.adminPermissionsEnabled}
                                onChange={(v: boolean) => set("adminPermissionsEnabled", v)}
                            />
                        </Card>
                    </Section>
                </>
            )}

            {tab === "login" && (
                <Section label={t("sxRealmSettingsLoginSettings")}>
                    <Card>
                        <ToggleRow
                            label={t("sxRealmSettingsUserRegistration")}
                            checked={e.registrationAllowed}
                            onChange={(v: boolean) => set("registrationAllowed", v)}
                        />
                        <ToggleRow
                            label={t("sxRealmSettingsEmailAsUsername")}
                            checked={e.registrationEmailAsUsername}
                            onChange={(v: boolean) => set("registrationEmailAsUsername", v)}
                        />
                        <ToggleRow
                            label={t("sxRealmSettingsLoginWithEmail")}
                            checked={e.loginWithEmailAllowed}
                            onChange={(v: boolean) => set("loginWithEmailAllowed", v)}
                        />
                        <ToggleRow
                            label={t("sxRealmSettingsDuplicateEmails")}
                            checked={e.duplicateEmailsAllowed}
                            onChange={(v: boolean) => set("duplicateEmailsAllowed", v)}
                        />
                        <ToggleRow
                            label={t("sxRealmSettingsResetPassword")}
                            checked={e.resetPasswordAllowed}
                            onChange={(v: boolean) => set("resetPasswordAllowed", v)}
                        />
                        <ToggleRow
                            label={t("sxRealmSettingsRememberMe")}
                            checked={e.rememberMe}
                            onChange={(v: boolean) => set("rememberMe", v)}
                        />
                        <ToggleRow
                            label={t("sxRealmSettingsVerifyEmail")}
                            checked={e.verifyEmail}
                            onChange={(v: boolean) => set("verifyEmail", v)}
                        />
                        <ToggleRow
                            label={t("sxRealmSettingsEditUsername")}
                            checked={e.editUsernameAllowed}
                            onChange={(v: boolean) => set("editUsernameAllowed", v)}
                        />
                    </Card>
                </Section>
            )}

            {tab === "email" && (
                <>
                    <Section label={t("sxRealmSettingsSmtpServer")}>
                        <Card>
                            <TextField
                                label={t("sxRealmSettingsSmtpHost")}
                                value={smtp.host}
                                onChange={(v: string) => setNested("smtpServer", "host", v)}
                                placeholder="smtp.example.com"
                            />
                            <TextField
                                label={t("sxRealmSettingsSmtpPort")}
                                value={smtp.port}
                                onChange={(v: string) => setNested("smtpServer", "port", v)}
                                placeholder="587"
                            />
                            <ToggleRow
                                label="SSL"
                                checked={smtp.ssl === "true" || smtp.ssl === true}
                                onChange={(v: boolean) => setNested("smtpServer", "ssl", String(v))}
                            />
                            <ToggleRow
                                label="StartTLS"
                                checked={smtp.starttls === "true" || smtp.starttls === true}
                                onChange={(v: boolean) =>
                                    setNested("smtpServer", "starttls", String(v))
                                }
                            />
                        </Card>
                    </Section>
                    <Section label={t("sxRealmSettingsSender")}>
                        <Card>
                            <TextField
                                label={t("sxRealmSettingsFrom")}
                                value={smtp.from}
                                onChange={(v: string) => setNested("smtpServer", "from", v)}
                                placeholder="noreply@example.com"
                            />
                            <TextField
                                label={t("sxRealmSettingsFromDisplayName")}
                                value={smtp.fromDisplayName}
                                onChange={(v: string) =>
                                    setNested("smtpServer", "fromDisplayName", v)
                                }
                            />
                            <TextField
                                label={t("sxRealmSettingsReplyTo")}
                                value={smtp.replyTo}
                                onChange={(v: string) => setNested("smtpServer", "replyTo", v)}
                            />
                        </Card>
                    </Section>
                    <Section label={t("sxRealmSettingsSmtpAuthentication")}>
                        <Card>
                            <ToggleRow
                                label={t("sxRealmSettingsSmtpAuthRequired")}
                                checked={smtp.auth === "true" || smtp.auth === true}
                                onChange={(v: boolean) => setNested("smtpServer", "auth", String(v))}
                            />
                            <TextField
                                label={t("sxRealmSettingsSmtpUsername")}
                                value={smtp.user}
                                onChange={(v: string) => setNested("smtpServer", "user", v)}
                            />
                            <TextField
                                label={t("sxRealmSettingsSmtpPassword")}
                                type="password"
                                value={smtp.password}
                                onChange={(v: string) => setNested("smtpServer", "password", v)}
                            />
                        </Card>
                    </Section>
                </>
            )}

            {tab === "themes" && (
                <Section label={t("sxRealmSettingsThemeSection")}>
                    <Card>
                        <ThemeField
                            label={t("sxRealmSettingsLoginTheme")}
                            value={e.loginTheme}
                            options={themes.login}
                            onChange={(v: any) => set("loginTheme", v)}
                        />
                        <ThemeField
                            label={t("sxRealmSettingsAccountTheme")}
                            value={e.accountTheme}
                            options={themes.account}
                            onChange={(v: any) => set("accountTheme", v)}
                        />
                        <ThemeField
                            label={t("sxRealmSettingsAdminTheme")}
                            value={e.adminTheme}
                            options={themes.admin}
                            onChange={(v: any) => set("adminTheme", v)}
                        />
                        <ThemeField
                            label={t("sxRealmSettingsEmailTheme")}
                            value={e.emailTheme}
                            options={themes.email}
                            onChange={(v: any) => set("emailTheme", v)}
                        />
                    </Card>
                    <Footnote>{t("sxRealmSettingsThemeFootnote")}</Footnote>
                </Section>
            )}

            {tab === "localization" && (
                <Section label={t("sxRealmSettingsTabLocalization")}>
                    <Card>
                        <ToggleRow
                            label={t("sxRealmSettingsInternationalization")}
                            checked={e.internationalizationEnabled}
                            onChange={(v: boolean) => set("internationalizationEnabled", v)}
                        />
                        {e.internationalizationEnabled && (
                            <TextField
                                label={t("sxRealmSettingsSupportedLocales")}
                                hint={t("sxRealmSettingsSupportedLocalesHint")}
                                value={locales.join(", ")}
                                onChange={(v: string) =>
                                    set(
                                        "supportedLocales",
                                        v
                                            .split(",")
                                            .map((s: string) => s.trim())
                                            .filter(Boolean)
                                    )
                                }
                            />
                        )}
                        {e.internationalizationEnabled && (
                            <ChoiceField
                                label={t("sxRealmSettingsDefaultLocale")}
                                value={e.defaultLocale || (locales[0] ?? "")}
                                onChange={(v: string) => set("defaultLocale", v)}
                                options={locales.length ? locales : ["tr", "en"]}
                            />
                        )}
                    </Card>
                </Section>
            )}

            {tab === "sessions" && (
                <>
                    <Section label={t("sxRealmSettingsSsoSession")}>
                        <Card>
                            <NumField
                                label={t("sxRealmSettingsIdleTimeout")}
                                v={e.ssoSessionIdleTimeout}
                                on={(x: any) => setNum("ssoSessionIdleTimeout", x)}
                            />
                            <NumField
                                label={t("sxRealmSettingsMaxLifespan")}
                                v={e.ssoSessionMaxLifespan}
                                on={(x: any) => setNum("ssoSessionMaxLifespan", x)}
                            />
                            <NumField
                                label={t("sxRealmSettingsIdleRememberMe")}
                                v={e.ssoSessionIdleTimeoutRememberMe}
                                on={(x: any) => setNum("ssoSessionIdleTimeoutRememberMe", x)}
                            />
                            <NumField
                                label={t("sxRealmSettingsMaxLifespanRememberMe")}
                                v={e.ssoSessionMaxLifespanRememberMe}
                                on={(x: any) => setNum("ssoSessionMaxLifespanRememberMe", x)}
                            />
                        </Card>
                    </Section>
                    <Section label={t("sxRealmSettingsOfflineSession")}>
                        <Card>
                            <NumField
                                label={t("sxRealmSettingsIdleTimeout")}
                                v={e.offlineSessionIdleTimeout}
                                on={(x: any) => setNum("offlineSessionIdleTimeout", x)}
                            />
                            <ToggleRow
                                label={t("sxRealmSettingsMaxLifespanLimit")}
                                checked={e.offlineSessionMaxLifespanEnabled}
                                onChange={(v: boolean) => set("offlineSessionMaxLifespanEnabled", v)}
                            />
                            {e.offlineSessionMaxLifespanEnabled && (
                                <NumField
                                    label={t("sxRealmSettingsMaxLifespan")}
                                    v={e.offlineSessionMaxLifespan}
                                    on={(x: any) => setNum("offlineSessionMaxLifespan", x)}
                                />
                            )}
                        </Card>
                    </Section>
                    <Section label={t("sxRealmSettingsClientSession")}>
                        <Card>
                            <NumField
                                label={t("sxRealmSettingsIdleTimeout")}
                                v={e.clientSessionIdleTimeout}
                                on={(x: any) => setNum("clientSessionIdleTimeout", x)}
                            />
                            <NumField
                                label={t("sxRealmSettingsMaxLifespan")}
                                v={e.clientSessionMaxLifespan}
                                on={(x: any) => setNum("clientSessionMaxLifespan", x)}
                            />
                        </Card>
                        <Footnote>{t("sxRealmSettingsDurationsInSeconds")}</Footnote>
                    </Section>
                </>
            )}

            {tab === "tokens" && (
                <>
                    <Section label={t("sxRealmSettingsSignature")}>
                        <Card>
                            <ChoiceField
                                label={t("sxRealmSettingsDefaultSignatureAlgorithm")}
                                value={e.defaultSignatureAlgorithm || "RS256"}
                                onChange={(v: string) => set("defaultSignatureAlgorithm", v)}
                                options={SIG_ALGS}
                            />
                            <ToggleRow
                                label={t("sxRealmSettingsRevokeRefreshToken")}
                                checked={e.revokeRefreshToken}
                                onChange={(v: boolean) => set("revokeRefreshToken", v)}
                            />
                            {e.revokeRefreshToken && (
                                <NumField
                                    label={t("sxRealmSettingsRefreshTokenMaxReuse")}
                                    v={e.refreshTokenMaxReuse}
                                    on={(x: any) => setNum("refreshTokenMaxReuse", x)}
                                    unit=""
                                />
                            )}
                        </Card>
                    </Section>
                    <Section label={t("sxRealmSettingsTokenLifespans")}>
                        <Card>
                            <NumField
                                label={t("sxRealmSettingsAccessTokenLifespan")}
                                v={e.accessTokenLifespan}
                                on={(x: any) => setNum("accessTokenLifespan", x)}
                            />
                            <NumField
                                label={t("sxRealmSettingsAccessTokenImplicit")}
                                v={e.accessTokenLifespanForImplicitFlow}
                                on={(x: any) => setNum("accessTokenLifespanForImplicitFlow", x)}
                            />
                            <NumField
                                label={t("sxRealmSettingsClientLoginTimeout")}
                                v={e.accessCodeLifespan}
                                on={(x: any) => setNum("accessCodeLifespan", x)}
                            />
                            <NumField
                                label={t("sxRealmSettingsLoginActionTimeout")}
                                v={e.accessCodeLifespanUserAction}
                                on={(x: any) => setNum("accessCodeLifespanUserAction", x)}
                            />
                        </Card>
                    </Section>
                    <Section label={t("sxRealmSettingsActionTokens")}>
                        <Card>
                            <NumField
                                label={t("sxRealmSettingsUserActionToken")}
                                v={e.actionTokenGeneratedByUserLifespan}
                                on={(x: any) => setNum("actionTokenGeneratedByUserLifespan", x)}
                            />
                            <NumField
                                label={t("sxRealmSettingsAdminActionToken")}
                                v={e.actionTokenGeneratedByAdminLifespan}
                                on={(x: any) => setNum("actionTokenGeneratedByAdminLifespan", x)}
                            />
                        </Card>
                        <Footnote>{t("sxRealmSettingsDurationsInSeconds")}</Footnote>
                    </Section>
                </>
            )}

            {tab === "security" && (
                <>
                    <Section label={t("sxRealmSettingsBruteForceDetection")}>
                        <Card>
                            <ToggleRow
                                label={t("sxRealmSettingsBruteForceProtection")}
                                checked={e.bruteForceProtected}
                                onChange={(v: boolean) => set("bruteForceProtected", v)}
                            />
                            {e.bruteForceProtected && (
                                <ToggleRow
                                    label={t("sxRealmSettingsPermanentLockout")}
                                    checked={e.permanentLockout}
                                    onChange={(v: boolean) => set("permanentLockout", v)}
                                />
                            )}
                            {e.bruteForceProtected && (
                                <NumField
                                    label={t("sxRealmSettingsMaxLoginFailures")}
                                    v={e.failureFactor}
                                    on={(x: any) => setNum("failureFactor", x)}
                                    unit=""
                                />
                            )}
                            {e.bruteForceProtected && (
                                <NumField
                                    label={t("sxRealmSettingsWaitIncrement")}
                                    v={e.waitIncrementSeconds}
                                    on={(x: any) => setNum("waitIncrementSeconds", x)}
                                />
                            )}
                            {e.bruteForceProtected && (
                                <NumField
                                    label={t("sxRealmSettingsMaxWait")}
                                    v={e.maxFailureWaitSeconds}
                                    on={(x: any) => setNum("maxFailureWaitSeconds", x)}
                                />
                            )}
                            {e.bruteForceProtected && (
                                <NumField
                                    label={t("sxRealmSettingsQuickLoginCheck")}
                                    v={e.quickLoginCheckMilliSeconds}
                                    on={(x: any) => setNum("quickLoginCheckMilliSeconds", x)}
                                    unit="ms"
                                />
                            )}
                        </Card>
                    </Section>
                    <Section label={t("sxRealmSettingsSecurityHeaders")}>
                        <Card>
                            <TextField
                                wide
                                mono
                                label="Content-Security-Policy"
                                value={hdr.contentSecurityPolicy}
                                onChange={(x: string) =>
                                    setNested("browserSecurityHeaders", "contentSecurityPolicy", x)
                                }
                            />
                            <TextField
                                mono
                                label="X-Frame-Options"
                                value={hdr.xFrameOptions}
                                onChange={(x: string) =>
                                    setNested("browserSecurityHeaders", "xFrameOptions", x)
                                }
                            />
                            <TextField
                                mono
                                label="X-Content-Type-Options"
                                value={hdr.xContentTypeOptions}
                                onChange={(x: string) =>
                                    setNested("browserSecurityHeaders", "xContentTypeOptions", x)
                                }
                            />
                            <TextField
                                mono
                                label="Strict-Transport-Security"
                                value={hdr.strictTransportSecurity}
                                onChange={(x: string) =>
                                    setNested("browserSecurityHeaders", "strictTransportSecurity", x)
                                }
                            />
                            <TextField
                                mono
                                label="Referrer-Policy"
                                value={hdr.referrerPolicy}
                                onChange={(x: string) =>
                                    setNested("browserSecurityHeaders", "referrerPolicy", x)
                                }
                            />
                        </Card>
                    </Section>
                </>
            )}

            {tab === "keys" && (
                <>
                    {keysFailed ? (
                        loadError(t("sxRealmSettingsKeysLoadError"), retryKeys)
                    ) : keys === null ? (
                        <ListSkeleton />
                    ) : (
                        ["SIG", "ENC"].map(use => {
                            const list = (keys.keys || []).filter((k: any) => keyUse(k) === use);
                            return (
                                <Section
                                    key={use}
                                    label={
                                        use === "SIG"
                                            ? t("sxRealmSettingsSigningKeys")
                                            : t("sxRealmSettingsEncryptionKeys")
                                    }
                                >
                                    {list.length === 0 ? (
                                        <Notice
                                            title={t("sxRealmSettingsNoKeysTitle")}
                                            description={t("sxRealmSettingsNoKeysDescription")}
                                        />
                                    ) : (
                                        <Group>
                                            {list.map((k: any, i: number) => (
                                                <li key={k.kid || i} className="px-4 py-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-base font-medium">
                                                                {k.algorithm || "—"}
                                                            </div>
                                                            <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                                                {[k.type, k.providerId].filter(Boolean).join(" · ")}
                                                            </div>
                                                        </div>
                                                        <StatusChip status={k.status} />
                                                    </div>
                                                    <code className="mt-2 block truncate font-mono text-xs text-muted-foreground">
                                                        {k.kid || "—"}
                                                    </code>
                                                    {k.certificate && (
                                                        <code className="mt-1.5 block max-h-16 overflow-auto font-mono text-xs break-all text-muted-foreground">
                                                            {k.certificate}
                                                        </code>
                                                    )}
                                                </li>
                                            ))}
                                        </Group>
                                    )}
                                </Section>
                            );
                        })
                    )}
                    <Section label={t("sxRealmSettingsKeyProviders")}>
                        {keyProvidersFailed ? (
                            loadError(t("sxRealmSettingsKeyProvidersLoadError"), retryKeyProviders)
                        ) : keyProviders === null ? (
                            <ListSkeleton rows={2} />
                        ) : keyProviders.length === 0 ? (
                            <Notice
                                title={t("sxRealmSettingsNoKeyProvidersTitle")}
                                description={t("sxRealmSettingsNoKeyProvidersDescription")}
                            />
                        ) : (
                            <Group>
                                {[...keyProviders]
                                    .sort(
                                        (a, b) =>
                                            Number(b.config?.priority?.[0] || 0) -
                                            Number(a.config?.priority?.[0] || 0)
                                    )
                                    .map((c: any) => (
                                        <Row
                                            key={c.id}
                                            title={c.name}
                                            subtitle={c.providerId}
                                            trailing={
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {t("sxRealmSettingsKeyPriority", {
                                                        priority: c.config?.priority?.[0] ?? "0"
                                                    })}
                                                </span>
                                            }
                                        />
                                    ))}
                            </Group>
                        )}
                        <Footnote>{t("sxRealmSettingsKeysFootnote")}</Footnote>
                    </Section>
                </>
            )}

            {tab === "events-config" &&
                (eventsFailed ? (
                    loadError(t("sxRealmSettingsEventsLoadError"), retryEvents)
                ) : eventsCfg === null ? (
                    <ListSkeleton />
                ) : (
                    <>
                        <Section label={t("sxRealmSettingsUserEvents")}>
                            <Card>
                                <ToggleRow
                                    label={t("sxRealmSettingsSaveUserEvents")}
                                    checked={eventsCfg.eventsEnabled}
                                    onChange={(v: boolean) => setEvt("eventsEnabled", v)}
                                />
                                {eventsCfg.eventsEnabled && (
                                    <NumField
                                        label={t("sxRealmSettingsEventsExpiration")}
                                        v={eventsCfg.eventsExpiration}
                                        on={(x: any) =>
                                            setEvt("eventsExpiration", x === "" ? undefined : Number(x))
                                        }
                                    />
                                )}
                                {eventsCfg.eventsEnabled && (
                                    <FieldItem
                                        wide
                                        label={t("sxRealmSettingsSavedEventTypes")}
                                        hint={
                                            eventTypes.length
                                                ? t("sxRealmSettingsSavedEventTypesHint")
                                                : t("sxRealmSettingsEventTypesUnavailable")
                                        }
                                    >
                                        <ChipMulti
                                            selected={eventsCfg.enabledEventTypes || []}
                                            options={eventTypes}
                                            onChange={(v: string[]) => setEvt("enabledEventTypes", v)}
                                            placeholder={t("sxRealmSettingsAddEventType")}
                                        />
                                    </FieldItem>
                                )}
                            </Card>
                        </Section>
                        <Section label={t("sxRealmSettingsAdminEvents")}>
                            <Card>
                                <ToggleRow
                                    label={t("sxRealmSettingsSaveAdminEvents")}
                                    checked={eventsCfg.adminEventsEnabled}
                                    onChange={(v: boolean) => setEvt("adminEventsEnabled", v)}
                                />
                                {eventsCfg.adminEventsEnabled && (
                                    <ToggleRow
                                        label={t("sxRealmSettingsIncludeRepresentation")}
                                        checked={eventsCfg.adminEventsDetailsEnabled}
                                        onChange={(v: boolean) =>
                                            setEvt("adminEventsDetailsEnabled", v)
                                        }
                                    />
                                )}
                            </Card>
                        </Section>
                        <Section label={t("sxRealmSettingsEventListeners")}>
                            <Card>
                                <FieldItem
                                    wide
                                    label={t("sxRealmSettingsActiveListeners")}
                                    hint={
                                        eventListeners.length
                                            ? undefined
                                            : t("sxRealmSettingsListenersUnavailable")
                                    }
                                >
                                    <ChipMulti
                                        selected={eventsCfg.eventsListeners || []}
                                        options={eventListeners}
                                        onChange={(v: string[]) => setEvt("eventsListeners", v)}
                                        placeholder={t("sxRealmSettingsAddListener")}
                                    />
                                </FieldItem>
                            </Card>
                        </Section>
                        <SaveBar onClick={saveEvents} saving={savingEvents} />
                    </>
                ))}

            {tab === "user-profile" &&
                (profileFailed ? (
                    loadError(t("sxRealmSettingsUserProfileLoadError"), retryProfile)
                ) : profile === null ? (
                    <ListSkeleton />
                ) : (
                    <>
                        <Section label={t("sxRealmSettingsAttributes")}>
                            {(profile.attributes || []).length === 0 ? (
                                <Notice
                                    title={t("sxRealmSettingsNoAttributesTitle")}
                                    description={t("sxRealmSettingsNoAttributesDescription")}
                                />
                            ) : (
                                <Group>
                                    {(profile.attributes || []).map((a: any) => (
                                        <Row
                                            key={a.name}
                                            title={a.displayName || a.name}
                                            subtitle={[
                                                a.name,
                                                a.permissions?.view?.length
                                                    ? t("sxRealmSettingsAttributeViewers", {
                                                          roles: a.permissions.view.join(", ")
                                                      })
                                                    : null
                                            ]
                                                .filter(Boolean)
                                                .join(" · ")}
                                            trailing={
                                                a.required ? (
                                                    <Chip tone="info">{t("sxRealmSettingsRequired")}</Chip>
                                                ) : undefined
                                            }
                                        />
                                    ))}
                                </Group>
                            )}
                            <Footnote>{t("sxRealmSettingsUserProfileFootnote")}</Footnote>
                        </Section>
                        <Section label={t("sxRealmSettingsRawConfig")}>
                            <JsonCard
                                rows={16}
                                value={profileJson}
                                onChange={setProfileJson}
                                label={t("sxRealmSettingsRawConfig")}
                            />
                            {profileErr && <ErrorNote>{profileErr}</ErrorNote>}
                        </Section>
                        <SaveBar onClick={saveProfile} saving={savingProfile} />
                    </>
                ))}

            {tab === "client-policies" &&
                (cpFailed ? (
                    loadError(t("sxRealmSettingsClientPoliciesLoadError"), retryPolicies)
                ) : profilesDoc === null ? (
                    <ListSkeleton />
                ) : (
                    <>
                        <Section label={t("sxRealmSettingsProfiles")}>
                            {(profilesDoc.profiles || []).concat(profilesDoc.globalProfiles || [])
                                .length === 0 ? (
                                <Notice
                                    title={t("sxRealmSettingsNoProfilesTitle")}
                                    description={t("sxRealmSettingsNoProfilesDescription")}
                                />
                            ) : (
                                <Group>
                                    {(profilesDoc.profiles || []).map((p: any) => (
                                        <Row key={`p-${p.name}`} title={p.name} subtitle={p.description} />
                                    ))}
                                    {(profilesDoc.globalProfiles || []).map((p: any) => (
                                        <Row
                                            key={`g-${p.name}`}
                                            title={p.name}
                                            subtitle={p.description}
                                            trailing={<Chip>{t("sxRealmSettingsGlobal")}</Chip>}
                                        />
                                    ))}
                                </Group>
                            )}
                        </Section>
                        <Section label={t("sxRealmSettingsProfilesJson")}>
                            <JsonCard
                                rows={12}
                                value={profilesJson}
                                onChange={setProfilesJson}
                                label={t("sxRealmSettingsProfilesJson")}
                            />
                            <SaveBar
                                className="mt-4"
                                onClick={saveProfiles}
                                saving={savingProfiles}
                                label={t("sxRealmSettingsSaveProfiles")}
                            />
                        </Section>
                        <Section label={t("sxRealmSettingsPolicies")}>
                            {(policiesDoc?.policies || []).length === 0 ? (
                                <Notice
                                    title={t("sxRealmSettingsNoPoliciesTitle")}
                                    description={t("sxRealmSettingsNoPoliciesDescription")}
                                />
                            ) : (
                                <Group>
                                    {(policiesDoc?.policies || []).map((p: any) => (
                                        <Row
                                            key={`pol-${p.name}`}
                                            title={p.name}
                                            subtitle={p.description}
                                            trailing={
                                                p.enabled === false ? (
                                                    <Chip>{t("sxRealmSettingsPolicyOff")}</Chip>
                                                ) : (
                                                    <Chip tone="success">{t("sxRealmSettingsPolicyOn")}</Chip>
                                                )
                                            }
                                        />
                                    ))}
                                </Group>
                            )}
                        </Section>
                        <Section label={t("sxRealmSettingsPoliciesJson")}>
                            <JsonCard
                                rows={12}
                                value={policiesJson}
                                onChange={setPoliciesJson}
                                label={t("sxRealmSettingsPoliciesJson")}
                            />
                            {cpErr && <ErrorNote>{cpErr}</ErrorNote>}
                            <SaveBar
                                className="mt-4"
                                onClick={savePolicies}
                                saving={savingPolicies}
                                label={t("sxRealmSettingsSavePolicies")}
                            />
                        </Section>
                    </>
                ))}

            {isGlobalTab && <SaveBar onClick={save} saving={saving} disabled={loading} />}
        </>
    );
}

function keyUse(k: any): "SIG" | "ENC" {
    if (k.use) return String(k.use).toUpperCase() === "ENC" ? "ENC" : "SIG";
    const alg = String(k.algorithm || "");
    if (/^(RSA-OAEP|RSA1_5|RSA-OAEP-256|ECDH|AES|A128|A192|A256)/i.test(alg)) return "ENC";
    return "SIG";
}

function StatusChip({ status }: any) {
    const t = useT();
    const s = String(status || "").toUpperCase();
    if (s === "ACTIVE") return <Chip tone="success">{t("sxRealmSettingsKeyActive")}</Chip>;
    if (s === "PASSIVE") return <Chip tone="warning">{t("sxRealmSettingsKeyPassive")}</Chip>;
    if (s === "DISABLED") return <Chip tone="danger">{t("sxRealmSettingsKeyDisabled")}</Chip>;
    return <Chip>{status || "—"}</Chip>;
}

function SaveBar({ onClick, saving, disabled, label, className }: any) {
    const t = useT();
    return (
        <div className={`flex justify-end ${className ?? ""}`}>
            <Button type="button" size="form" onClick={onClick} disabled={saving || disabled}>
                {saving ? t("sxRealmSettingsSaving") : (label ?? t("sxRealmSettingsSave"))}
            </Button>
        </div>
    );
}

function Footnote({ children }: any) {
    return <p className="mt-2 px-0.5 text-[13px] text-muted-foreground">{children}</p>;
}

function ErrorNote({ children }: any) {
    return (
        <p className="mt-2 px-0.5 text-[13px] text-[#d70015] [overflow-wrap:anywhere] dark:text-[#ff453a]">
            {children}
        </p>
    );
}

function flatten(children: any): any[] {
    return Children.toArray(children).flatMap((c: any) =>
        isValidElement(c) && c.type === Fragment ? flatten(c.props.children) : [c]
    );
}

function Card({ children }: any) {
    const segments: { field: boolean; items: any[] }[] = [];
    flatten(children).forEach(item => {
        const field = isValidElement(item) && !!(item.type as any)?.isField;
        const last = segments[segments.length - 1];
        if (field && last?.field) last.items.push(item);
        else segments.push({ field, items: [item] });
    });
    return (
        <div className={GROUP}>
            {segments.map((segment, index) => (
                <Fragment key={index}>
                    {index > 0 && <div aria-hidden className={SEPARATOR} />}
                    {segment.field ? (
                        <div className="grid gap-4 p-4 sm:grid-cols-2">{segment.items}</div>
                    ) : (
                        segment.items
                    )}
                </Fragment>
            ))}
        </div>
    );
}

function ToggleRow({ label, hint, checked, onChange, disabled }: any) {
    const id = useId();
    return (
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
            <label htmlFor={id} className="min-w-0 cursor-pointer">
                <span className="block text-base">{label}</span>
                {hint && (
                    <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                        {hint}
                    </span>
                )}
            </label>
            <Switch
                id={id}
                checked={!!checked}
                onCheckedChange={(v: boolean) => onChange(v)}
                disabled={disabled}
            />
        </div>
    );
}

function InfoRow({ label, children }: any) {
    return (
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
            <span className="shrink-0 text-base">{label}</span>
            <span className="min-w-0 text-end">{children}</span>
        </div>
    );
}

function FieldItem({ label, hint, wide, htmlFor, children }: any) {
    return (
        <Field size="lg" className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
            {label && <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>}
            {children}
            {hint && <FieldDescription className="ps-0.5 text-[13px]">{hint}</FieldDescription>}
        </Field>
    );
}
FieldItem.isField = true;

function TextField({ label, hint, value, onChange, placeholder, type, mono, wide }: any) {
    const id = useId();
    return (
        <FieldItem label={label} hint={hint} wide={wide} htmlFor={id}>
            <Input
                id={id}
                size="lg"
                type={type}
                className={mono ? "font-mono data-[size=lg]:text-[15px]" : undefined}
                value={value ?? ""}
                onChange={(ev: any) => onChange(ev.target.value)}
                placeholder={placeholder}
            />
        </FieldItem>
    );
}
TextField.isField = true;

function NumField({ label, v, on, unit }: any) {
    const t = useT();
    const id = useId();
    const hint = unit === undefined ? t("sxRealmSettingsSeconds") : unit;
    return (
        <FieldItem label={label} hint={hint || undefined} htmlFor={id}>
            <Input
                id={id}
                size="lg"
                type="number"
                className="tabular-nums"
                value={v ?? ""}
                onChange={(ev: any) => on(ev.target.value)}
                placeholder="0"
            />
        </FieldItem>
    );
}
NumField.isField = true;

function ChoiceField({ label, value, onChange, options }: any) {
    const t = useT();
    const id = useId();
    const normalized = options.map((o: any) => (typeof o === "string" ? { value: o, label: o } : o));
    const known = normalized.some((o: any) => o.value === value);
    return (
        <FieldItem label={label} htmlFor={id}>
            <NativeSelect
                id={id}
                size="lg"
                className="w-full"
                value={value ?? ""}
                onChange={(ev: any) => onChange(ev.target.value)}
            >
                {(value === undefined || value === "") && (
                    <NativeSelectOption value="" disabled>
                        {t("sxRealmSettingsSelect")}
                    </NativeSelectOption>
                )}
                {!known && value !== undefined && value !== "" && (
                    <NativeSelectOption value={value}>{value}</NativeSelectOption>
                )}
                {normalized.map((o: any) => (
                    <NativeSelectOption key={o.value} value={o.value}>
                        {o.label}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        </FieldItem>
    );
}
ChoiceField.isField = true;

function ThemeField({ label, value, options, onChange }: any) {
    const t = useT();
    const id = useId();
    const list = options || [];
    return (
        <FieldItem label={label} htmlFor={id}>
            <NativeSelect
                id={id}
                size="lg"
                className="w-full"
                value={value || ""}
                onChange={(ev: any) => onChange(ev.target.value)}
            >
                <NativeSelectOption value="">{t("sxRealmSettingsDefaultTheme")}</NativeSelectOption>
                {value && !list.includes(value) && (
                    <NativeSelectOption value={value}>{value}</NativeSelectOption>
                )}
                {list.map((o: string) => (
                    <NativeSelectOption key={o} value={o}>
                        {o}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        </FieldItem>
    );
}
ThemeField.isField = true;

function JsonCard({ rows, value, onChange, label }: any) {
    return (
        <div className={`${GROUP} p-4`}>
            <Textarea
                aria-label={label}
                className="font-mono text-xs"
                rows={rows}
                value={value}
                onChange={(ev: any) => onChange(ev.target.value)}
                spellCheck={false}
            />
        </div>
    );
}

function ChipMulti({ selected, options, onChange, placeholder }: any) {
    const t = useT();
    const available = (options || []).filter((o: string) => !selected.includes(o));
    const remove = (v: string) => onChange(selected.filter((x: string) => x !== v));
    const add = (v: string) => {
        if (v && !selected.includes(v)) onChange([...selected, v]);
    };
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
                {selected.length === 0 && (
                    <span className="ps-0.5 text-[15px] text-muted-foreground">
                        {t("sxRealmSettingsNoneSelected")}
                    </span>
                )}
                {selected.map((v: string) => (
                    <span
                        key={v}
                        className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-[#d2d2d7] bg-background ps-2.5 pe-1 text-[13px] dark:border-[#48484a] dark:bg-transparent"
                    >
                        <span className="truncate font-mono">{v}</span>
                        <button
                            type="button"
                            onClick={() => remove(v)}
                            aria-label={t("sxRealmSettingsRemoveValue", { value: v })}
                            className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-black/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/10"
                        >
                            <XIcon className="size-3" />
                        </button>
                    </span>
                ))}
            </div>
            {available.length > 0 && (
                <NativeSelect
                    size="lg"
                    className="w-full"
                    aria-label={placeholder}
                    value=""
                    onChange={(ev: any) => add(ev.target.value)}
                >
                    <NativeSelectOption value="" disabled>
                        {placeholder}
                    </NativeSelectOption>
                    {available.map((o: string) => (
                        <NativeSelectOption key={o} value={o}>
                            {o}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            )}
        </div>
    );
}
