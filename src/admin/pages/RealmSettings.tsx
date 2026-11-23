// @ts-nocheck

import { DotsThreeIcon, DownloadSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { useEffect, useRef, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useT } from "../ui/i18n";
import { AdminPage, Chip, Group, ListSkeleton, Notice, Section, SegmentTabs } from "../ui/kit";
import { useRealm } from "../ui/realm";
import { adminFetch } from "../ui/util";
import ClientPoliciesEditor from "./realm-settings/ClientPoliciesEditor";
import { SmtpTestConnection } from "./realm-settings/EmailTest";
import {
    ActionRow,
    Card,
    ChipMulti,
    ChoiceField,
    ConfirmDialog,
    FieldItem,
    Footnote,
    InfoRow,
    NumField,
    SaveBar,
    TextField,
    ThemeField,
    ToggleRow
} from "./realm-settings/fields";
import { AcrLoaMapping, DeleteRealmSection } from "./realm-settings/GeneralExtras";
import { PartialExportModal, PartialImportModal } from "./realm-settings/ImportExport";
import { KeyProviders } from "./realm-settings/KeyProviders";
import { EffectiveMessageBundles, RealmOverrides } from "./realm-settings/Localization";
import UserProfileEditor from "./realm-settings/UserProfileEditor";
import { UserRegistration } from "./realm-settings/UserRegistration";

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
    { key: "user-registration", label: "sxRealmSettingsUserRegistration" },
    { key: "client-policies", label: "sxRealmSettingsTabClientPolicies" }
];

const PER_TAB_SAVE = ["keys", "events-config", "user-profile", "user-registration", "client-policies"];

const LOCALIZATION_TABS = [
    { key: "locales", label: "sxRealmSettingsLocales" },
    { key: "overrides", label: "sxRealmSettingsRealmOverrides" },
    { key: "bundles", label: "sxRealmSettingsEffectiveBundles" }
];

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

const DANGER_OUTLINE =
    "border-[#d70015]/40 text-[#d70015] hover:bg-[#d70015]/5 dark:border-[#ff453a]/40 dark:text-[#ff453a] dark:hover:bg-[#ff453a]/10";

export default function RealmSettings() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [e, setE] = useState<any>(null);
    const [loadCount, setLoadCount] = useState(0);
    const [tab, setTab] = useState("general");
    const [locTab, setLocTab] = useState("locales");
    const [themes, setThemes] = useState<any>({
        login: [],
        account: [],
        admin: [],
        email: []
    });
    const [themeInfo, setThemeInfo] = useState<any>({});
    const [keyTypes, setKeyTypes] = useState<any[]>([]);
    const [importOpen, setImportOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [confirmOpts, setConfirmOpts] = useState<any>(null);

    const realmRef = useRef(realm);
    realmRef.current = realm;
    const loadedRef = useRef<any>(null);
    const inFlight = useRef(new Set<string>());

    const [keys, setKeys] = useState<any>(null);
    const [keysFailed, setKeysFailed] = useState(false);

    const [eventsCfg, setEventsCfg] = useState<any>(null);
    const [eventsFailed, setEventsFailed] = useState(false);
    const [eventTypes, setEventTypes] = useState<string[]>([]);
    const [eventListeners, setEventListeners] = useState<string[]>([]);
    const [savingEvents, setSavingEvents] = useState(false);
    const [adminExp, setAdminExp] = useState<any>(undefined);
    const [clearing, setClearing] = useState<string | null>(null);

    const load = async (initial = false) => {
        const target = realm;
        setLoading(true);
        try {
            const [rep, info] = await Promise.all([
                adminClient.realms.findOne({ realm: target }),
                adminClient.serverInfo.find().catch(() => null)
            ]);
            if (realmRef.current !== target) return;
            loadedRef.current = rep || null;
            setE(rep || null);
            setLoadCount(n => n + 1);
            if (info?.themes) {
                const pick = (k: string) =>
                    (info.themes[k] || []).map((x: any) => x.name).filter(Boolean);
                setThemes({
                    login: pick("login"),
                    account: pick("account"),
                    admin: pick("admin"),
                    email: pick("email")
                });
                setThemeInfo(info.themes);
            }
            setKeyTypes(info?.componentTypes?.["org.keycloak.keys.KeyProvider"] || []);
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
        setEventsCfg(null);
        setEventsFailed(false);
        setLocTab("locales");
    }, [realm]);

    const needKeys = keys === null && !keysFailed;
    const needEvents = eventsCfg === null && !eventsFailed;

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
                        setAdminExp(loadedRef.current?.attributes?.adminEventsExpiration);
                        setEventTypes((info?.enums?.eventType as string[]) || []);
                        const ids = Array.isArray(listeners)
                            ? listeners.map((x: any) => x.id || x).filter(Boolean)
                            : [];
                        setEventListeners(ids);
                    })
                    .catch(() => current() && setEventsFailed(true))
            );
        }
    }, [tab, loading, realm, needKeys, needEvents]);

    const retryKeys = () => {
        setKeys(null);
        setKeysFailed(false);
    };
    const retryEvents = () => {
        setEventsCfg(null);
        setEventsFailed(false);
    };

    const setEvt = (k: string, v: any) =>
        setEventsCfg((p: any) => ({ ...(p || {}), [k]: v }));

    const saveEvents = async () => {
        setSavingEvents(true);
        try {
            const base = loadedRef.current;
            const prevExp = base?.attributes?.adminEventsExpiration;
            const nextExp = adminExp === "" || adminExp == null ? undefined : String(adminExp);
            if (base && (prevExp ?? undefined) !== nextExp) {
                const attributes = { ...(base.attributes || {}) };
                if (nextExp === undefined) attributes.adminEventsExpiration = "";
                else attributes.adminEventsExpiration = nextExp;
                await adminClient.realms.update({ realm }, { ...base, attributes });
                loadedRef.current = { ...base, attributes };
                setE((p: any) => ({
                    ...p,
                    attributes: { ...(p?.attributes || {}), adminEventsExpiration: attributes.adminEventsExpiration }
                }));
            }
            await adminClient.realms.updateConfigEvents({ realm }, eventsCfg);
            addAlert(t("sxRealmSettingsEventsSaved"), AlertVariant.success);
        } catch (err) {
            addError(t("sxRealmSettingsSaveError"), err);
        } finally {
            setSavingEvents(false);
        }
    };

    const clearEvents = (kind: "user" | "admin") =>
        setConfirmOpts({
            title: kind === "user" ? t("sxRealmSettingsClearUserEventsTitle") : t("sxRealmSettingsClearAdminEventsTitle"),
            message:
                kind === "user" ? t("sxRealmSettingsClearUserEventsMessage") : t("sxRealmSettingsClearAdminEventsMessage"),
            confirmLabel: t("sxRealmSettingsClear"),
            danger: true,
            onConfirm: async () => {
                setClearing(kind);
                try {
                    if (kind === "user") await adminClient.realms.clearEvents({ realm });
                    else await adminClient.realms.clearAdminEvents({ realm });
                    addAlert(
                        kind === "user" ? t("sxRealmSettingsUserEventsCleared") : t("sxRealmSettingsAdminEventsCleared"),
                        AlertVariant.success
                    );
                } catch (err) {
                    addError(t("sxRealmSettingsClearEventsError"), err);
                } finally {
                    setClearing(null);
                }
            }
        });

    const isGlobalTab =
        !PER_TAB_SAVE.includes(tab) && !(tab === "localization" && locTab !== "locales");

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
    const smtpAuth = smtp.auth === "true" || smtp.auth === true;
    const authType = smtp.authType || "basic";

    const loadError = (title: string, onRetry: () => void) => (
        <Notice title={title} description={t("sxLoadErrorDescription")} onRetry={onRetry} />
    );

    const headerActions = (
        <>
            {isGlobalTab && (
                <Button type="button" onClick={save} disabled={saving || loading}>
                    {saving ? t("sxRealmSettingsSaving") : t("sxRealmSettingsSave")}
                </Button>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="secondary"
                        size="icon"
                        aria-label={t("sxCommonActions")}
                        title={t("sxCommonActions")}
                    >
                        <DotsThreeIcon weight="bold" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuItem onClick={() => setImportOpen(true)}>
                        <UploadSimpleIcon />
                        {t("sxRealmSettingsPartialImport")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setExportOpen(true)}>
                        <DownloadSimpleIcon />
                        {t("sxRealmSettingsPartialExport")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );

    return page(
        headerActions,
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
                    <AcrLoaMapping
                        key={`${realm}:${loadCount}`}
                        value={e.attributes?.["acr.loa.map"]}
                        onChange={(v: string) => setAttr("acr.loa.map", v)}
                    />
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
                    <Section label={t("sxRealmSettingsSender")}>
                        <Card>
                            <TextField
                                label={t("sxRealmSettingsFrom")}
                                type="email"
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
                                type="email"
                                value={smtp.replyTo}
                                onChange={(v: string) => setNested("smtpServer", "replyTo", v)}
                            />
                            <TextField
                                label={t("sxRealmSettingsReplyToDisplayName")}
                                value={smtp.replyToDisplayName}
                                onChange={(v: string) =>
                                    setNested("smtpServer", "replyToDisplayName", v)
                                }
                            />
                            <TextField
                                wide
                                label={t("sxRealmSettingsEnvelopeFrom")}
                                hint={t("sxRealmSettingsEnvelopeFromHint")}
                                type="email"
                                value={smtp.envelopeFrom}
                                onChange={(v: string) => setNested("smtpServer", "envelopeFrom", v)}
                            />
                        </Card>
                    </Section>
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
                            <ToggleRow
                                label={t("sxRealmSettingsAllowUtf8")}
                                hint={t("sxRealmSettingsAllowUtf8Hint")}
                                checked={smtp.allowutf8 === "true" || smtp.allowutf8 === true}
                                onChange={(v: boolean) =>
                                    setNested("smtpServer", "allowutf8", String(v))
                                }
                            />
                            <NumField
                                label={t("sxRealmSettingsSmtpConnectionTimeout")}
                                v={smtp.connectionTimeout}
                                on={(x: any) => setNested("smtpServer", "connectionTimeout", x)}
                                unit="ms"
                            />
                            <NumField
                                label={t("sxRealmSettingsSmtpReadTimeout")}
                                v={smtp.timeout}
                                on={(x: any) => setNested("smtpServer", "timeout", x)}
                                unit="ms"
                            />
                            <NumField
                                label={t("sxRealmSettingsSmtpWriteTimeout")}
                                v={smtp.writeTimeout}
                                on={(x: any) => setNested("smtpServer", "writeTimeout", x)}
                                unit="ms"
                            />
                            <ToggleRow
                                label={t("sxRealmSettingsSmtpDebug")}
                                hint={t("sxRealmSettingsSmtpDebugHint")}
                                checked={smtp.debug === "true" || smtp.debug === true}
                                onChange={(v: boolean) => setNested("smtpServer", "debug", String(v))}
                            />
                        </Card>
                        <Footnote>{t("sxRealmSettingsSmtpTimeoutsHint")}</Footnote>
                    </Section>
                    <Section label={t("sxRealmSettingsSmtpAuthentication")}>
                        <Card>
                            <ToggleRow
                                label={t("sxRealmSettingsSmtpAuthRequired")}
                                checked={smtpAuth}
                                onChange={(v: boolean) => setNested("smtpServer", "auth", String(v))}
                            />
                            {smtpAuth && (
                                <TextField
                                    label={t("sxRealmSettingsSmtpUsername")}
                                    value={smtp.user}
                                    onChange={(v: string) => setNested("smtpServer", "user", v)}
                                />
                            )}
                            {smtpAuth && (
                                <ChoiceField
                                    label={t("sxRealmSettingsSmtpAuthType")}
                                    value={authType}
                                    onChange={(v: string) => setNested("smtpServer", "authType", v)}
                                    options={[
                                        { value: "basic", label: t("sxRealmSettingsSmtpAuthBasic") },
                                        { value: "token", label: t("sxRealmSettingsSmtpAuthToken") }
                                    ]}
                                />
                            )}
                            {smtpAuth && authType === "basic" && (
                                <TextField
                                    label={t("sxRealmSettingsSmtpPassword")}
                                    type="password"
                                    value={smtp.password}
                                    onChange={(v: string) => setNested("smtpServer", "password", v)}
                                />
                            )}
                            {smtpAuth && authType === "token" && (
                                <TextField
                                    label={t("sxRealmSettingsSmtpTokenUrl")}
                                    hint={t("sxRealmSettingsSmtpTokenUrlHint")}
                                    value={smtp.authTokenUrl}
                                    onChange={(v: string) => setNested("smtpServer", "authTokenUrl", v)}
                                    placeholder="https://login.example.com/oauth2/token"
                                />
                            )}
                            {smtpAuth && authType === "token" && (
                                <TextField
                                    label={t("sxRealmSettingsSmtpTokenScope")}
                                    hint={t("sxRealmSettingsSmtpTokenScopeHint")}
                                    value={smtp.authTokenScope}
                                    onChange={(v: string) => setNested("smtpServer", "authTokenScope", v)}
                                />
                            )}
                            {smtpAuth && authType === "token" && (
                                <TextField
                                    label={t("sxRealmSettingsSmtpTokenClientId")}
                                    value={smtp.authTokenClientId}
                                    onChange={(v: string) => setNested("smtpServer", "authTokenClientId", v)}
                                />
                            )}
                            {smtpAuth && authType === "token" && (
                                <TextField
                                    label={t("sxRealmSettingsSmtpTokenClientSecret")}
                                    type="password"
                                    value={smtp.authTokenClientSecret}
                                    onChange={(v: string) =>
                                        setNested("smtpServer", "authTokenClientSecret", v)
                                    }
                                />
                            )}
                        </Card>
                    </Section>
                    <SmtpTestConnection realm={realm} smtp={smtp} />
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
                <>
                    <SegmentTabs
                        value={locTab}
                        onChange={setLocTab}
                        items={LOCALIZATION_TABS.map(x => ({ value: x.key, label: t(x.label) }))}
                        ariaLabel={t("sxRealmSettingsTabLocalization")}
                    />
                    {locTab === "locales" && (
                        <Section label={t("sxRealmSettingsLocales")}>
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
                    {locTab === "overrides" && (
                        <RealmOverrides
                            key={realm}
                            realm={realm}
                            locales={loadedRef.current?.supportedLocales || []}
                            defaultLocale={loadedRef.current?.defaultLocale}
                        />
                    )}
                    {locTab === "bundles" && (
                        <EffectiveMessageBundles
                            key={realm}
                            realm={realm}
                            locales={loadedRef.current?.supportedLocales || []}
                            defaultLocale={loadedRef.current?.defaultLocale}
                            themeInfo={themeInfo}
                        />
                    )}
                </>
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
                    <KeyProviders realm={realm} componentTypes={keyTypes} onChanged={retryKeys} />
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
                                <ActionRow
                                    label={t("sxRealmSettingsClearUserEvents")}
                                    hint={t("sxRealmSettingsClearUserEventsHint")}
                                >
                                    <Button
                                        variant="outline"
                                        className={DANGER_OUTLINE}
                                        onClick={() => clearEvents("user")}
                                        disabled={clearing === "user"}
                                    >
                                        {clearing === "user"
                                            ? t("sxRealmSettingsClearing")
                                            : t("sxRealmSettingsClearUserEvents")}
                                    </Button>
                                </ActionRow>
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
                                {eventsCfg.adminEventsEnabled && (
                                    <NumField
                                        label={t("sxRealmSettingsEventsExpiration")}
                                        v={adminExp}
                                        on={(x: any) => setAdminExp(x)}
                                        hint={t("sxRealmSettingsAdminEventsExpirationHint")}
                                    />
                                )}
                                <ActionRow
                                    label={t("sxRealmSettingsClearAdminEvents")}
                                    hint={t("sxRealmSettingsClearAdminEventsHint")}
                                >
                                    <Button
                                        variant="outline"
                                        className={DANGER_OUTLINE}
                                        onClick={() => clearEvents("admin")}
                                        disabled={clearing === "admin"}
                                    >
                                        {clearing === "admin"
                                            ? t("sxRealmSettingsClearing")
                                            : t("sxRealmSettingsClearAdminEvents")}
                                    </Button>
                                </ActionRow>
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

            {tab === "user-profile" && <UserProfileEditor key={realm} realm={realm} />}

            {tab === "user-registration" && (
                <UserRegistration key={realm} realm={realm} defaultRole={e.defaultRole} />
            )}

            {tab === "client-policies" && <ClientPoliciesEditor key={realm} realm={realm} />}

            {isGlobalTab && <SaveBar onClick={save} saving={saving} disabled={loading} />}

            {tab === "general" && <DeleteRealmSection realm={realm} />}

            {importOpen && (
                <PartialImportModal
                    realm={realm}
                    onClose={() => setImportOpen(false)}
                    onImported={retryKeys}
                />
            )}
            {exportOpen && <PartialExportModal realm={realm} onClose={() => setExportOpen(false)} />}
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
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
