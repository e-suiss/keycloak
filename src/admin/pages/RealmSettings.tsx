// @ts-nocheck

import { XIcon } from "@phosphor-icons/react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import { Spinner } from "@ui/components/spinner";
import { Switch } from "@ui/components/switch";
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs";
import { Textarea } from "@ui/components/textarea";
import { Children, Fragment, isValidElement, useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";
import { adminFetch } from "../ui/util";

const TABS = [
    { key: "general", label: "Genel" },
    { key: "login", label: "Giriş" },
    { key: "email", label: "E-posta" },
    { key: "themes", label: "Temalar" },
    { key: "localization", label: "Yerelleştirme" },
    { key: "sessions", label: "Oturumlar" },
    { key: "tokens", label: "Token" },
    { key: "security", label: "Güvenlik" },
    { key: "keys", label: "Anahtarlar" },
    { key: "events-config", label: "Olay Yapılandırması" },
    { key: "user-profile", label: "Kullanıcı Profili" },
    { key: "client-policies", label: "İstemci Politikaları" }
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

    // --- keys tab ---
    const [keys, setKeys] = useState<any>(null);
    const [keyProviders, setKeyProviders] = useState<any[] | null>(null);

    // --- events-config tab ---
    const [eventsCfg, setEventsCfg] = useState<any>(null);
    const [eventTypes, setEventTypes] = useState<string[]>([]);
    const [eventListeners, setEventListeners] = useState<string[]>([]);
    const [savingEvents, setSavingEvents] = useState(false);

    // --- user-profile tab ---
    const [profile, setProfile] = useState<any>(null);
    const [profileJson, setProfileJson] = useState("");
    const [profileErr, setProfileErr] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);

    // --- client-policies tab ---
    const [profilesDoc, setProfilesDoc] = useState<any>(null);
    const [policiesDoc, setPoliciesDoc] = useState<any>(null);
    const [profilesJson, setProfilesJson] = useState("");
    const [policiesJson, setPoliciesJson] = useState("");
    const [cpErr, setCpErr] = useState("");
    const [savingProfiles, setSavingProfiles] = useState(false);
    const [savingPolicies, setSavingPolicies] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [rep, info] = await Promise.all([
                adminClient.realms.findOne({ realm }),
                adminClient.serverInfo.find().catch(() => null)
            ]);
            setE(rep);
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
            addError("Realm yüklenemedi.", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);

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
            addAlert("Realm ayarları kaydedildi.", AlertVariant.success);
            await load();
        } catch (err) {
            addError("Kaydedilemedi.", err);
        } finally {
            setSaving(false);
        }
    };

    const saveBtn = (
        <Button type="button" onClick={save} disabled={saving || loading}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
        </Button>
    );

    // Lazily load per-tab data the first time the tab is opened.
    useEffect(() => {
        if (loading) return;
        if (tab === "keys" && keys === null) {
            Promise.all([
                adminClient.realms.getKeys({ realm }).catch(() => ({ keys: [] })),
                adminClient.components
                    .find({ realm, type: "org.keycloak.keys.KeyProvider" })
                    .catch(() => [])
            ]).then(([k, comps]) => {
                setKeys(k || { keys: [] });
                setKeyProviders(comps || []);
            });
        }
        if (tab === "events-config" && eventsCfg === null) {
            Promise.all([
                adminClient.realms.getConfigEvents({ realm }).catch(() => ({})),
                adminClient.serverInfo.find().catch(() => null),
                adminFetch(adminClient, realm, "ui-ext/available-event-listeners").catch(
                    () => []
                )
            ]).then(([cfg, info, listeners]) => {
                setEventsCfg(cfg || {});
                setEventTypes((info?.enums?.eventType as string[]) || []);
                const ids = Array.isArray(listeners)
                    ? listeners.map((x: any) => x.id || x).filter(Boolean)
                    : [];
                setEventListeners(ids);
            });
        }
        if (tab === "user-profile" && profile === null) {
            adminClient.users
                .getProfile({ realm })
                .then((p: any) => {
                    setProfile(p || {});
                    setProfileJson(JSON.stringify(p || {}, null, 2));
                })
                .catch((err: any) => addError("Kullanıcı profili yüklenemedi.", err));
        }
        if (tab === "client-policies" && profilesDoc === null) {
            Promise.all([
                adminClient.clientPolicies
                    .listProfiles({ realm, includeGlobalProfiles: true })
                    .catch(() => ({})),
                adminClient.clientPolicies.listPolicies({ realm }).catch(() => ({}))
            ]).then(([prof, pol]) => {
                setProfilesDoc(prof || {});
                setPoliciesDoc(pol || {});
                setProfilesJson(JSON.stringify(prof || {}, null, 2));
                setPoliciesJson(JSON.stringify(pol || {}, null, 2));
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        tab,
        loading,
        profile,
        realm,
        profilesDoc,
        keys,
        eventsCfg,
        adminClient.users.getProfile,
        adminClient.components.find,
        adminClient.serverInfo.find,
        adminClient.clientPolicies.listProfiles,
        addError,
        adminClient.realms.getConfigEvents,
        adminClient.realms.getKeys,
        adminClient.clientPolicies.listPolicies,
        adminClient
    ]);

    const setEvt = (k: string, v: any) =>
        setEventsCfg((p: any) => ({ ...(p || {}), [k]: v }));

    const saveEvents = async () => {
        setSavingEvents(true);
        try {
            await adminClient.realms.updateConfigEvents({ realm }, eventsCfg);
            addAlert("Olay yapılandırması kaydedildi.", AlertVariant.success);
        } catch (err) {
            addError("Kaydedilemedi.", err);
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
            setProfileErr(`Geçersiz JSON: ${err.message}`);
            return;
        }
        setSavingProfile(true);
        try {
            const updated = await adminClient.users.updateProfile({ ...parsed, realm });
            setProfile(updated || parsed);
            setProfileJson(JSON.stringify(updated || parsed, null, 2));
            addAlert("Kullanıcı profili kaydedildi.", AlertVariant.success);
        } catch (err) {
            addError("Kaydedilemedi.", err);
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
            setCpErr(`Profiller — geçersiz JSON: ${err.message}`);
            return;
        }
        setSavingProfiles(true);
        try {
            await adminClient.clientPolicies.createProfiles({ ...parsed, realm });
            addAlert("İstemci profilleri kaydedildi.", AlertVariant.success);
        } catch (err) {
            addError("Kaydedilemedi.", err);
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
            setCpErr(`Politikalar — geçersiz JSON: ${err.message}`);
            return;
        }
        setSavingPolicies(true);
        try {
            await adminClient.clientPolicies.updatePolicy({ ...parsed, realm });
            addAlert("İstemci politikaları kaydedildi.", AlertVariant.success);
        } catch (err) {
            addError("Kaydedilemedi.", err);
        } finally {
            setSavingPolicies(false);
        }
    };

    if (loading || !e)
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            </div>
        );

    const smtp = e.smtpServer || {};
    const hdr = e.browserSecurityHeaders || {};
    const locales = e.supportedLocales || [];

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
                {saveBtn}
            </div>
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList variant="line">
                    {TABS.map(t => (
                        <TabsTrigger key={t.key} value={t.key}>
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            <div className="mx-auto mt-5 max-w-2xl space-y-6">
                {tab === "general" && (
                    <>
                        <div>
                            <GroupLabel>Genel</GroupLabel>
                            <Group>
                                <Row label="Realm ID">
                                    <span className="font-mono text-sm text-muted-foreground">
                                        {e.realm}
                                    </span>
                                </Row>
                                <StackRow label="Görünen ad">
                                    <Input
                                        value={e.displayName ?? ""}
                                        onChange={(ev: any) =>
                                            set("displayName", ev.target.value)
                                        }
                                    />
                                </StackRow>
                                <StackRow
                                    label="HTML görünen ad"
                                    hint="Giriş ekranı başlığında HTML olarak gösterilir."
                                >
                                    <Input
                                        value={e.displayNameHtml ?? ""}
                                        onChange={(ev: any) =>
                                            set("displayNameHtml", ev.target.value)
                                        }
                                    />
                                </StackRow>
                                <StackRow
                                    label="Frontend URL"
                                    hint="Sabit bir temel URL zorlamak için."
                                >
                                    <Input
                                        value={e.attributes?.frontendUrl ?? ""}
                                        onChange={(ev: any) =>
                                            setAttr("frontendUrl", ev.target.value)
                                        }
                                        placeholder="https://login.example.com"
                                    />
                                </StackRow>
                                <Row label="SSL zorunluluğu">
                                    <SelectField
                                        value={e.sslRequired ?? "external"}
                                        onChange={(v: any) => set("sslRequired", v)}
                                        options={["none", "external", "all"]}
                                    />
                                </Row>
                            </Group>
                        </div>
                        <div>
                            <GroupLabel>Özellikler</GroupLabel>
                            <Group>
                                <SwitchRow
                                    label="Realm etkin"
                                    checked={!!e.enabled}
                                    onChange={(v: boolean) => set("enabled", v)}
                                />
                                <SwitchRow
                                    label="Kullanıcı tarafından yönetilen erişim (UMA)"
                                    checked={!!e.userManagedAccessAllowed}
                                    onChange={(v: boolean) =>
                                        set("userManagedAccessAllowed", v)
                                    }
                                />
                                <SwitchRow
                                    label="Organizasyonlar"
                                    checked={!!e.organizationsEnabled}
                                    onChange={(v: boolean) =>
                                        set("organizationsEnabled", v)
                                    }
                                />
                                <SwitchRow
                                    label="Admin Permissions (V2)"
                                    checked={!!e.adminPermissionsEnabled}
                                    onChange={(v: boolean) =>
                                        set("adminPermissionsEnabled", v)
                                    }
                                />
                            </Group>
                            <GroupFooter>
                                Admin Permissions, sunucuda{" "}
                                <span className="font-mono">
                                    admin-fine-grained-authz:v2
                                </span>{" "}
                                feature'ı açıkken kullanılabilir.
                            </GroupFooter>
                        </div>
                    </>
                )}

                {tab === "login" && (
                    <div>
                        <GroupLabel>Giriş ayarları</GroupLabel>
                        <Group>
                            <SwitchRow
                                label="Kullanıcı kaydı"
                                checked={!!e.registrationAllowed}
                                onChange={(v: boolean) => set("registrationAllowed", v)}
                            />
                            <SwitchRow
                                label="E-posta = kullanıcı adı"
                                checked={!!e.registrationEmailAsUsername}
                                onChange={(v: boolean) =>
                                    set("registrationEmailAsUsername", v)
                                }
                            />
                            <SwitchRow
                                label="E-posta ile giriş"
                                checked={!!e.loginWithEmailAllowed}
                                onChange={(v: boolean) => set("loginWithEmailAllowed", v)}
                            />
                            <SwitchRow
                                label="Yinelenen e-postalara izin ver"
                                checked={!!e.duplicateEmailsAllowed}
                                onChange={(v: boolean) =>
                                    set("duplicateEmailsAllowed", v)
                                }
                            />
                            <SwitchRow
                                label="Şifre sıfırlama"
                                checked={!!e.resetPasswordAllowed}
                                onChange={(v: boolean) => set("resetPasswordAllowed", v)}
                            />
                            <SwitchRow
                                label="Beni hatırla"
                                checked={!!e.rememberMe}
                                onChange={(v: boolean) => set("rememberMe", v)}
                            />
                            <SwitchRow
                                label="E-posta doğrulama"
                                checked={!!e.verifyEmail}
                                onChange={(v: boolean) => set("verifyEmail", v)}
                            />
                            <SwitchRow
                                label="Kullanıcı adı düzenlenebilir"
                                checked={!!e.editUsernameAllowed}
                                onChange={(v: boolean) => set("editUsernameAllowed", v)}
                            />
                        </Group>
                    </div>
                )}

                {tab === "email" && (
                    <>
                        <div>
                            <GroupLabel>SMTP sunucusu</GroupLabel>
                            <Group>
                                <StackRow label="Sunucu (host)">
                                    <Input
                                        value={smtp.host ?? ""}
                                        onChange={(ev: any) =>
                                            setNested(
                                                "smtpServer",
                                                "host",
                                                ev.target.value
                                            )
                                        }
                                        placeholder="smtp.example.com"
                                    />
                                </StackRow>
                                <Row label="Port">
                                    <Input
                                        value={smtp.port ?? ""}
                                        onChange={(ev: any) =>
                                            setNested(
                                                "smtpServer",
                                                "port",
                                                ev.target.value
                                            )
                                        }
                                        placeholder="587"
                                    />
                                </Row>
                                <SwitchRow
                                    label="SSL"
                                    checked={smtp.ssl === "true" || smtp.ssl === true}
                                    onChange={(v: boolean) =>
                                        setNested("smtpServer", "ssl", String(v))
                                    }
                                />
                                <SwitchRow
                                    label="StartTLS"
                                    checked={
                                        smtp.starttls === "true" || smtp.starttls === true
                                    }
                                    onChange={(v: boolean) =>
                                        setNested("smtpServer", "starttls", String(v))
                                    }
                                />
                            </Group>
                        </div>
                        <div>
                            <GroupLabel>Gönderen</GroupLabel>
                            <Group>
                                <StackRow label="From">
                                    <Input
                                        value={smtp.from ?? ""}
                                        onChange={(ev: any) =>
                                            setNested(
                                                "smtpServer",
                                                "from",
                                                ev.target.value
                                            )
                                        }
                                        placeholder="noreply@example.com"
                                    />
                                </StackRow>
                                <StackRow label="From görünen ad">
                                    <Input
                                        value={smtp.fromDisplayName ?? ""}
                                        onChange={(ev: any) =>
                                            setNested(
                                                "smtpServer",
                                                "fromDisplayName",
                                                ev.target.value
                                            )
                                        }
                                    />
                                </StackRow>
                                <StackRow label="Reply-To">
                                    <Input
                                        value={smtp.replyTo ?? ""}
                                        onChange={(ev: any) =>
                                            setNested(
                                                "smtpServer",
                                                "replyTo",
                                                ev.target.value
                                            )
                                        }
                                    />
                                </StackRow>
                            </Group>
                        </div>
                        <div>
                            <GroupLabel>Kimlik doğrulama</GroupLabel>
                            <Group>
                                <SwitchRow
                                    label="Kimlik doğrulama gerekli"
                                    checked={smtp.auth === "true" || smtp.auth === true}
                                    onChange={(v: boolean) =>
                                        setNested("smtpServer", "auth", String(v))
                                    }
                                />
                                <StackRow label="Kullanıcı adı">
                                    <Input
                                        value={smtp.user ?? ""}
                                        onChange={(ev: any) =>
                                            setNested(
                                                "smtpServer",
                                                "user",
                                                ev.target.value
                                            )
                                        }
                                    />
                                </StackRow>
                                <StackRow label="Şifre">
                                    <Input
                                        type="password"
                                        value={smtp.password ?? ""}
                                        onChange={(ev: any) =>
                                            setNested(
                                                "smtpServer",
                                                "password",
                                                ev.target.value
                                            )
                                        }
                                    />
                                </StackRow>
                            </Group>
                        </div>
                    </>
                )}

                {tab === "themes" && (
                    <div>
                        <GroupLabel>Tema</GroupLabel>
                        <Group>
                            <ThemeRow
                                label="Giriş teması"
                                value={e.loginTheme}
                                options={themes.login}
                                onChange={(v: any) => set("loginTheme", v)}
                            />
                            <ThemeRow
                                label="Hesap teması"
                                value={e.accountTheme}
                                options={themes.account}
                                onChange={(v: any) => set("accountTheme", v)}
                            />
                            <ThemeRow
                                label="Admin teması"
                                value={e.adminTheme}
                                options={themes.admin}
                                onChange={(v: any) => set("adminTheme", v)}
                            />
                            <ThemeRow
                                label="E-posta teması"
                                value={e.emailTheme}
                                options={themes.email}
                                onChange={(v: any) => set("emailTheme", v)}
                            />
                        </Group>
                        <GroupFooter>
                            Tema değişiklikleri kullanıcı oturumlarını yeniden başlatınca
                            etkili olur.
                        </GroupFooter>
                    </div>
                )}

                {tab === "localization" && (
                    <div>
                        <GroupLabel>Yerelleştirme</GroupLabel>
                        <Group>
                            <SwitchRow
                                label="Uluslararasılaştırma"
                                checked={!!e.internationalizationEnabled}
                                onChange={(v: boolean) =>
                                    set("internationalizationEnabled", v)
                                }
                            />
                            {e.internationalizationEnabled && (
                                <>
                                    <StackRow
                                        label="Desteklenen diller"
                                        hint="Virgülle ayır (örn. tr, en, de)"
                                    >
                                        <Input
                                            value={locales.join(", ")}
                                            onChange={(ev: any) =>
                                                set(
                                                    "supportedLocales",
                                                    ev.target.value
                                                        .split(",")
                                                        .map((s: string) => s.trim())
                                                        .filter(Boolean)
                                                )
                                            }
                                        />
                                    </StackRow>
                                    <Row label="Varsayılan dil">
                                        <SelectField
                                            value={e.defaultLocale || (locales[0] ?? "")}
                                            onChange={(v: any) => set("defaultLocale", v)}
                                            options={
                                                locales.length ? locales : ["tr", "en"]
                                            }
                                        />
                                    </Row>
                                </>
                            )}
                        </Group>
                    </div>
                )}

                {tab === "sessions" && (
                    <>
                        <div>
                            <GroupLabel>SSO oturumu</GroupLabel>
                            <Group>
                                <NumRow
                                    label="Boşta zaman aşımı"
                                    v={e.ssoSessionIdleTimeout}
                                    on={(x: any) => setNum("ssoSessionIdleTimeout", x)}
                                />
                                <NumRow
                                    label="Maksimum ömür"
                                    v={e.ssoSessionMaxLifespan}
                                    on={(x: any) => setNum("ssoSessionMaxLifespan", x)}
                                />
                                <NumRow
                                    label="Boşta (beni hatırla)"
                                    v={e.ssoSessionIdleTimeoutRememberMe}
                                    on={(x: any) =>
                                        setNum("ssoSessionIdleTimeoutRememberMe", x)
                                    }
                                />
                                <NumRow
                                    label="Maks. ömür (beni hatırla)"
                                    v={e.ssoSessionMaxLifespanRememberMe}
                                    on={(x: any) =>
                                        setNum("ssoSessionMaxLifespanRememberMe", x)
                                    }
                                />
                            </Group>
                        </div>
                        <div>
                            <GroupLabel>Çevrimdışı oturum</GroupLabel>
                            <Group>
                                <NumRow
                                    label="Boşta zaman aşımı"
                                    v={e.offlineSessionIdleTimeout}
                                    on={(x: any) =>
                                        setNum("offlineSessionIdleTimeout", x)
                                    }
                                />
                                <SwitchRow
                                    label="Maks. ömür sınırı"
                                    checked={!!e.offlineSessionMaxLifespanEnabled}
                                    onChange={(v: boolean) =>
                                        set("offlineSessionMaxLifespanEnabled", v)
                                    }
                                />
                                {e.offlineSessionMaxLifespanEnabled && (
                                    <NumRow
                                        label="Maksimum ömür"
                                        v={e.offlineSessionMaxLifespan}
                                        on={(x: any) =>
                                            setNum("offlineSessionMaxLifespan", x)
                                        }
                                    />
                                )}
                            </Group>
                        </div>
                        <div>
                            <GroupLabel>İstemci oturumu</GroupLabel>
                            <Group>
                                <NumRow
                                    label="Boşta zaman aşımı"
                                    v={e.clientSessionIdleTimeout}
                                    on={(x: any) => setNum("clientSessionIdleTimeout", x)}
                                />
                                <NumRow
                                    label="Maksimum ömür"
                                    v={e.clientSessionMaxLifespan}
                                    on={(x: any) => setNum("clientSessionMaxLifespan", x)}
                                />
                            </Group>
                            <GroupFooter>Tüm süreler saniye cinsindendir.</GroupFooter>
                        </div>
                    </>
                )}

                {tab === "tokens" && (
                    <>
                        <div>
                            <GroupLabel>İmza</GroupLabel>
                            <Group>
                                <Row label="Varsayılan imza algoritması">
                                    <SelectField
                                        value={e.defaultSignatureAlgorithm || "RS256"}
                                        onChange={(v: any) =>
                                            set("defaultSignatureAlgorithm", v)
                                        }
                                        options={SIG_ALGS}
                                    />
                                </Row>
                                <SwitchRow
                                    label="Refresh token döndürmeyi iptal et"
                                    checked={!!e.revokeRefreshToken}
                                    onChange={(v: boolean) =>
                                        set("revokeRefreshToken", v)
                                    }
                                />
                                {e.revokeRefreshToken && (
                                    <NumRow
                                        label="Maks. yeniden kullanım"
                                        v={e.refreshTokenMaxReuse}
                                        on={(x: any) => setNum("refreshTokenMaxReuse", x)}
                                        unit=""
                                    />
                                )}
                            </Group>
                        </div>
                        <div>
                            <GroupLabel>Token ömürleri</GroupLabel>
                            <Group>
                                <NumRow
                                    label="Access token ömrü"
                                    v={e.accessTokenLifespan}
                                    on={(x: any) => setNum("accessTokenLifespan", x)}
                                />
                                <NumRow
                                    label="Access token (implicit)"
                                    v={e.accessTokenLifespanForImplicitFlow}
                                    on={(x: any) =>
                                        setNum("accessTokenLifespanForImplicitFlow", x)
                                    }
                                />
                                <NumRow
                                    label="Client login timeout"
                                    v={e.accessCodeLifespan}
                                    on={(x: any) => setNum("accessCodeLifespan", x)}
                                />
                                <NumRow
                                    label="Login action timeout"
                                    v={e.accessCodeLifespanUserAction}
                                    on={(x: any) =>
                                        setNum("accessCodeLifespanUserAction", x)
                                    }
                                />
                            </Group>
                        </div>
                        <div>
                            <GroupLabel>Aksiyon token'ları</GroupLabel>
                            <Group>
                                <NumRow
                                    label="Kullanıcı aksiyon token'ı"
                                    v={e.actionTokenGeneratedByUserLifespan}
                                    on={(x: any) =>
                                        setNum("actionTokenGeneratedByUserLifespan", x)
                                    }
                                />
                                <NumRow
                                    label="Admin aksiyon token'ı"
                                    v={e.actionTokenGeneratedByAdminLifespan}
                                    on={(x: any) =>
                                        setNum("actionTokenGeneratedByAdminLifespan", x)
                                    }
                                />
                            </Group>
                            <GroupFooter>Tüm süreler saniye cinsindendir.</GroupFooter>
                        </div>
                    </>
                )}

                {tab === "security" && (
                    <>
                        <div>
                            <GroupLabel>Brute-force tespiti</GroupLabel>
                            <Group>
                                <SwitchRow
                                    label="Brute-force koruması"
                                    checked={!!e.bruteForceProtected}
                                    onChange={(v: boolean) =>
                                        set("bruteForceProtected", v)
                                    }
                                />
                                {e.bruteForceProtected && (
                                    <>
                                        <SwitchRow
                                            label="Kalıcı kilitleme"
                                            checked={!!e.permanentLockout}
                                            onChange={(v: boolean) =>
                                                set("permanentLockout", v)
                                            }
                                        />
                                        <NumRow
                                            label="Maks. giriş hatası"
                                            v={e.failureFactor}
                                            on={(x: any) => setNum("failureFactor", x)}
                                            unit=""
                                        />
                                        <NumRow
                                            label="Bekleme artışı"
                                            v={e.waitIncrementSeconds}
                                            on={(x: any) =>
                                                setNum("waitIncrementSeconds", x)
                                            }
                                        />
                                        <NumRow
                                            label="Maks. bekleme"
                                            v={e.maxFailureWaitSeconds}
                                            on={(x: any) =>
                                                setNum("maxFailureWaitSeconds", x)
                                            }
                                        />
                                        <NumRow
                                            label="Hızlı giriş kontrolü (ms)"
                                            v={e.quickLoginCheckMilliSeconds}
                                            on={(x: any) =>
                                                setNum("quickLoginCheckMilliSeconds", x)
                                            }
                                            unit="ms"
                                        />
                                    </>
                                )}
                            </Group>
                        </div>
                        <div>
                            <GroupLabel>Güvenlik başlıkları (HTTP)</GroupLabel>
                            <Group>
                                <HdrRow
                                    label="Content-Security-Policy"
                                    v={hdr.contentSecurityPolicy}
                                    on={(x: any) =>
                                        setNested(
                                            "browserSecurityHeaders",
                                            "contentSecurityPolicy",
                                            x
                                        )
                                    }
                                />
                                <HdrRow
                                    label="X-Frame-Options"
                                    v={hdr.xFrameOptions}
                                    on={(x: any) =>
                                        setNested(
                                            "browserSecurityHeaders",
                                            "xFrameOptions",
                                            x
                                        )
                                    }
                                />
                                <HdrRow
                                    label="X-Content-Type-Options"
                                    v={hdr.xContentTypeOptions}
                                    on={(x: any) =>
                                        setNested(
                                            "browserSecurityHeaders",
                                            "xContentTypeOptions",
                                            x
                                        )
                                    }
                                />
                                <HdrRow
                                    label="Strict-Transport-Security"
                                    v={hdr.strictTransportSecurity}
                                    on={(x: any) =>
                                        setNested(
                                            "browserSecurityHeaders",
                                            "strictTransportSecurity",
                                            x
                                        )
                                    }
                                />
                                <HdrRow
                                    label="Referrer-Policy"
                                    v={hdr.referrerPolicy}
                                    on={(x: any) =>
                                        setNested(
                                            "browserSecurityHeaders",
                                            "referrerPolicy",
                                            x
                                        )
                                    }
                                />
                            </Group>
                        </div>
                    </>
                )}

                {tab === "keys" &&
                    (keys === null ? (
                        <div className="grid place-items-center py-16">
                            <Spinner />
                        </div>
                    ) : (
                        <>
                            {["SIG", "ENC"].map(use => {
                                const list = (keys.keys || []).filter(
                                    (k: any) => keyUse(k) === use
                                );
                                return (
                                    <div key={use}>
                                        <GroupLabel>
                                            {use === "SIG"
                                                ? "İmzalama anahtarları (SIG)"
                                                : "Şifreleme anahtarları (ENC)"}
                                        </GroupLabel>
                                        <Group>
                                            {list.length === 0 ? (
                                                <EmptyRow>
                                                    Bu kullanım için anahtar yok.
                                                </EmptyRow>
                                            ) : (
                                                list.map((k: any, i: number) => (
                                                    <StackRow
                                                        key={k.kid || i}
                                                        label={k.algorithm || "—"}
                                                        hint={`${k.type || ""}${k.providerId ? ` · ${k.providerId}` : ""}`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                                                                {k.kid || "—"}
                                                            </code>
                                                            <StatusPill
                                                                status={k.status}
                                                            />
                                                        </div>
                                                        {k.certificate && (
                                                            <code className="mt-1.5 block max-h-16 overflow-auto break-all font-mono text-xs text-muted-foreground">
                                                                {k.certificate}
                                                            </code>
                                                        )}
                                                    </StackRow>
                                                ))
                                            )}
                                        </Group>
                                    </div>
                                );
                            })}
                            <div>
                                <GroupLabel>Anahtar sağlayıcıları</GroupLabel>
                                <Group>
                                    {(keyProviders || []).length === 0 ? (
                                        <EmptyRow>Sağlayıcı bulunamadı.</EmptyRow>
                                    ) : (
                                        [...(keyProviders || [])]
                                            .sort(
                                                (a, b) =>
                                                    Number(b.config?.priority?.[0] || 0) -
                                                    Number(a.config?.priority?.[0] || 0)
                                            )
                                            .map((c: any) => (
                                                <Row
                                                    key={c.id}
                                                    label={c.name}
                                                    hint={c.providerId}
                                                >
                                                    <span className="text-sm text-muted-foreground">
                                                        öncelik{" "}
                                                        {c.config?.priority?.[0] ?? "0"}
                                                    </span>
                                                </Row>
                                            ))
                                    )}
                                </Group>
                                <GroupFooter>
                                    Anahtarlar salt-okunur listelenir. Düzenleme için
                                    Keycloak yönetim konsolunu kullanın.
                                </GroupFooter>
                            </div>
                        </>
                    ))}

                {tab === "events-config" &&
                    (eventsCfg === null ? (
                        <div className="grid place-items-center py-16">
                            <Spinner />
                        </div>
                    ) : (
                        <>
                            <div>
                                <GroupLabel>Kullanıcı olayları</GroupLabel>
                                <Group>
                                    <SwitchRow
                                        label="Kullanıcı olaylarını kaydet"
                                        checked={!!eventsCfg.eventsEnabled}
                                        onChange={(v: boolean) =>
                                            setEvt("eventsEnabled", v)
                                        }
                                    />
                                    {eventsCfg.eventsEnabled && (
                                        <>
                                            <NumRow
                                                label="Süre (expiration)"
                                                v={eventsCfg.eventsExpiration}
                                                on={(x: any) =>
                                                    setEvt(
                                                        "eventsExpiration",
                                                        x === "" ? undefined : Number(x)
                                                    )
                                                }
                                            />
                                            <StackRow
                                                label="Kaydedilen olay türleri"
                                                hint={
                                                    eventTypes.length
                                                        ? "Boş bırakılırsa tüm türler kaydedilir."
                                                        : "Sunucudan tür listesi alınamadı."
                                                }
                                            >
                                                <ChipMulti
                                                    selected={
                                                        eventsCfg.enabledEventTypes || []
                                                    }
                                                    options={eventTypes}
                                                    onChange={(v: string[]) =>
                                                        setEvt("enabledEventTypes", v)
                                                    }
                                                    placeholder="Olay türü ekle"
                                                />
                                            </StackRow>
                                        </>
                                    )}
                                </Group>
                            </div>
                            <div>
                                <GroupLabel>Yönetici olayları</GroupLabel>
                                <Group>
                                    <SwitchRow
                                        label="Yönetici olaylarını kaydet"
                                        checked={!!eventsCfg.adminEventsEnabled}
                                        onChange={(v: boolean) =>
                                            setEvt("adminEventsEnabled", v)
                                        }
                                    />
                                    {eventsCfg.adminEventsEnabled && (
                                        <SwitchRow
                                            label="Temsili (representation) dahil et"
                                            checked={
                                                !!eventsCfg.adminEventsDetailsEnabled
                                            }
                                            onChange={(v: boolean) =>
                                                setEvt("adminEventsDetailsEnabled", v)
                                            }
                                        />
                                    )}
                                </Group>
                            </div>
                            <div>
                                <GroupLabel>Olay dinleyicileri</GroupLabel>
                                <Group>
                                    <StackRow
                                        label="Etkin dinleyiciler"
                                        hint={
                                            eventListeners.length
                                                ? undefined
                                                : "Mevcut dinleyici listesi alınamadı."
                                        }
                                    >
                                        <ChipMulti
                                            selected={eventsCfg.eventsListeners || []}
                                            options={eventListeners}
                                            onChange={(v: string[]) =>
                                                setEvt("eventsListeners", v)
                                            }
                                            placeholder="Dinleyici ekle"
                                        />
                                    </StackRow>
                                </Group>
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    onClick={saveEvents}
                                    disabled={savingEvents}
                                >
                                    {savingEvents ? "Kaydediliyor…" : "Kaydet"}
                                </Button>
                            </div>
                        </>
                    ))}

                {tab === "user-profile" &&
                    (profile === null ? (
                        <div className="grid place-items-center py-16">
                            <Spinner />
                        </div>
                    ) : (
                        <>
                            <div>
                                <GroupLabel>Öznitelikler</GroupLabel>
                                <Group>
                                    {(profile.attributes || []).length === 0 ? (
                                        <EmptyRow>Öznitelik tanımlanmamış.</EmptyRow>
                                    ) : (
                                        (profile.attributes || []).map((a: any) => (
                                            <Row
                                                key={a.name}
                                                label={a.displayName || a.name}
                                                hint={a.name}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    {a.required && (
                                                        <Badge variant="default">zorunlu</Badge>
                                                    )}
                                                    {a.permissions?.view?.length ? (
                                                        <Badge variant="secondary">
                                                            görüntüle:{" "}
                                                            {a.permissions.view.join(
                                                                ", "
                                                            )}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </Row>
                                        ))
                                    )}
                                </Group>
                                <GroupFooter>
                                    Ham yapılandırmayı aşağıdaki düzenleyiciden
                                    değiştirebilirsiniz.
                                </GroupFooter>
                            </div>
                            <div>
                                <GroupLabel>Ham yapılandırma (JSON)</GroupLabel>
                                <Group>
                                    <StackRow>
                                        <Textarea
                                            className="font-mono text-xs"
                                            rows={16}
                                            value={profileJson}
                                            onChange={(ev: any) =>
                                                setProfileJson(ev.target.value)
                                            }
                                            spellCheck={false}
                                        />
                                    </StackRow>
                                </Group>
                                {profileErr && (
                                    <GroupFooter>
                                        <span className="text-destructive">{profileErr}</span>
                                    </GroupFooter>
                                )}
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    onClick={saveProfile}
                                    disabled={savingProfile}
                                >
                                    {savingProfile ? "Kaydediliyor…" : "Kaydet"}
                                </Button>
                            </div>
                        </>
                    ))}

                {tab === "client-policies" &&
                    (profilesDoc === null ? (
                        <div className="grid place-items-center py-16">
                            <Spinner />
                        </div>
                    ) : (
                        <>
                            <div>
                                <GroupLabel>Profiller</GroupLabel>
                                <Group>
                                    {(profilesDoc.profiles || []).concat(
                                        profilesDoc.globalProfiles || []
                                    ).length === 0 ? (
                                        <EmptyRow>Profil tanımlanmamış.</EmptyRow>
                                    ) : (
                                        <>
                                            {(profilesDoc.profiles || []).map(
                                                (p: any) => (
                                                    <Row
                                                        key={`p-${p.name}`}
                                                        label={p.name}
                                                        hint={p.description}
                                                    />
                                                )
                                            )}
                                            {(profilesDoc.globalProfiles || []).map(
                                                (p: any) => (
                                                    <Row
                                                        key={`g-${p.name}`}
                                                        label={p.name}
                                                        hint={p.description}
                                                    >
                                                        <Badge variant="secondary">global</Badge>
                                                    </Row>
                                                )
                                            )}
                                        </>
                                    )}
                                </Group>
                            </div>
                            <div>
                                <GroupLabel>Profiller (JSON)</GroupLabel>
                                <Group>
                                    <StackRow>
                                        <Textarea
                                            className="font-mono text-xs"
                                            rows={12}
                                            value={profilesJson}
                                            onChange={(ev: any) =>
                                                setProfilesJson(ev.target.value)
                                            }
                                            spellCheck={false}
                                        />
                                    </StackRow>
                                    <ActionRow
                                        onClick={saveProfiles}
                                        disabled={savingProfiles}
                                    >
                                        {savingProfiles
                                            ? "Kaydediliyor…"
                                            : "Profilleri kaydet"}
                                    </ActionRow>
                                </Group>
                            </div>
                            <div>
                                <GroupLabel>Politikalar</GroupLabel>
                                <Group>
                                    {(policiesDoc.policies || []).length === 0 ? (
                                        <EmptyRow>Politika tanımlanmamış.</EmptyRow>
                                    ) : (
                                        (policiesDoc.policies || []).map((p: any) => (
                                            <Row
                                                key={`pol-${p.name}`}
                                                label={p.name}
                                                hint={p.description}
                                            >
                                                {p.enabled === false ? (
                                                    <Badge variant="secondary">kapalı</Badge>
                                                ) : (
                                                    <Badge variant="outline">açık</Badge>
                                                )}
                                            </Row>
                                        ))
                                    )}
                                </Group>
                            </div>
                            <div>
                                <GroupLabel>Politikalar (JSON)</GroupLabel>
                                <Group>
                                    <StackRow>
                                        <Textarea
                                            className="font-mono text-xs"
                                            rows={12}
                                            value={policiesJson}
                                            onChange={(ev: any) =>
                                                setPoliciesJson(ev.target.value)
                                            }
                                            spellCheck={false}
                                        />
                                    </StackRow>
                                    <ActionRow
                                        onClick={savePolicies}
                                        disabled={savingPolicies}
                                    >
                                        {savingPolicies
                                            ? "Kaydediliyor…"
                                            : "Politikaları kaydet"}
                                    </ActionRow>
                                </Group>
                                {cpErr && (
                                    <GroupFooter>
                                        <span className="text-destructive">{cpErr}</span>
                                    </GroupFooter>
                                )}
                            </div>
                        </>
                    ))}

                {!["keys", "events-config", "user-profile", "client-policies"].includes(
                    tab
                ) && <div className="flex justify-end">{saveBtn}</div>}
            </div>
        </div>
    );
}

const _SIG_ALG_PREFIXES = ["RS", "ES", "PS", "HS", "EdDSA", "Ed"];

function keyUse(k: any): "SIG" | "ENC" {
    if (k.use) return String(k.use).toUpperCase() === "ENC" ? "ENC" : "SIG";
    const alg = String(k.algorithm || "");
    // Encryption algorithms reported by Keycloak (RSA-OAEP, RSA1_5, ECDH-ES…).
    if (/^(RSA-OAEP|RSA1_5|RSA-OAEP-256|ECDH|AES|A128|A192|A256)/i.test(alg))
        return "ENC";
    return "SIG";
}

function StatusPill({ status }: any) {
    const s = String(status || "").toUpperCase();
    if (s === "ACTIVE") return <Badge variant="outline">aktif</Badge>;
    if (s === "PASSIVE") return <Badge variant="secondary">pasif</Badge>;
    if (s === "DISABLED") return <Badge variant="destructive">devre dışı</Badge>;
    return <Badge variant="secondary">{status || "—"}</Badge>;
}

function ChipMulti({ selected, options, onChange, placeholder }: any) {
    const available = (options || []).filter((o: string) => !selected.includes(o));
    const remove = (v: string) => onChange(selected.filter((x: string) => x !== v));
    const add = (v: string) => {
        if (v && !selected.includes(v)) onChange([...selected, v]);
    };
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {selected.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                        Hiçbiri seçili değil
                    </span>
                )}
                {selected.map((v: string) => (
                    <Badge key={v} variant="outline">
                        <span className="font-mono">{v}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => remove(v)}
                            aria-label="Kaldır"
                        >
                            <XIcon />
                        </Button>
                    </Badge>
                ))}
            </div>
            {available.length > 0 && (
                <Select value="" onValueChange={add}>
                    <SelectTrigger size="sm" aria-label={placeholder}>
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-72">
                        {available.map((o: string) => (
                            <SelectItem key={o} value={o}>
                                {o}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}

function SelectField({ value, onChange, options }: any) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger size="sm" aria-label="seçim">
                <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
                {options.map((o: string) => (
                    <SelectItem key={o} value={o}>
                        {o}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function ThemeRow({ label, value, options, onChange }: any) {
    const DEFAULT = "__default__";
    return (
        <Row label={label}>
            <Select
                value={value || DEFAULT}
                onValueChange={(v: string) => onChange(v === DEFAULT ? "" : v)}
            >
                <SelectTrigger size="sm" aria-label={label}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value={DEFAULT}>Varsayılan</SelectItem>
                    {(options || []).map((o: string) => (
                        <SelectItem key={o} value={o}>
                            {o}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Row>
    );
}

function NumRow({ label, v, on, unit = "saniye" }: any) {
    return (
        <Row label={label} hint={unit || undefined}>
            <Input
                type="number"
                className="w-32 text-end"
                value={v ?? ""}
                onChange={(e: any) => on(e.target.value)}
                placeholder="0"
            />
        </Row>
    );
}

function HdrRow({ label, v, on }: any) {
    return (
        <StackRow label={label}>
            <Input
                className="font-mono"
                value={v ?? ""}
                onChange={(e: any) => on(e.target.value)}
            />
        </StackRow>
    );
}

/* ── Grouped settings rows (esuiss Item list) ───────────────────────────── */

function flatten(children: any): any[] {
    return Children.toArray(children).flatMap((c: any) =>
        isValidElement(c) && c.type === Fragment ? flatten(c.props.children) : [c]
    );
}

function GroupLabel({ children }: any) {
    return <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">{children}</h3>;
}

function GroupFooter({ children }: any) {
    return <p className="mt-2 ms-1 text-sm text-muted-foreground">{children}</p>;
}

function Group({ children }: any) {
    return (
        <ItemGroup variant="inset">
            {flatten(children).map((c, i) => (
                <Fragment key={i}>
                    {i > 0 && <ItemSeparator />}
                    {c}
                </Fragment>
            ))}
        </ItemGroup>
    );
}

function Row({ label, hint, children }: any) {
    return (
        <Item size="sm">
            <ItemContent className="min-w-0">
                <ItemTitle>{label}</ItemTitle>
                {hint && <ItemDescription>{hint}</ItemDescription>}
            </ItemContent>
            {children !== undefined && children !== null && (
                <ItemActions className="min-w-0 justify-end">{children}</ItemActions>
            )}
        </Item>
    );
}

function StackRow({ label, hint, children }: any) {
    return (
        <Item size="sm">
            <ItemContent className="min-w-0">
                {label && <ItemTitle>{label}</ItemTitle>}
                {hint && <ItemDescription>{hint}</ItemDescription>}
                <div className={label || hint ? "mt-1.5" : undefined}>{children}</div>
            </ItemContent>
        </Item>
    );
}

function SwitchRow({ label, hint, checked, onChange, disabled }: any) {
    return (
        <Item size="sm">
            <ItemContent className="min-w-0">
                <ItemTitle>{label}</ItemTitle>
                {hint && <ItemDescription>{hint}</ItemDescription>}
            </ItemContent>
            <ItemActions>
                <Switch
                    checked={!!checked}
                    onCheckedChange={(v: boolean) => onChange(v)}
                    disabled={disabled}
                    aria-label={typeof label === "string" ? label : undefined}
                />
            </ItemActions>
        </Item>
    );
}

function ActionRow({ onClick, disabled, children }: any) {
    return (
        <Item size="sm" asChild>
            <button type="button" onClick={onClick} disabled={disabled}>
                <ItemContent>
                    <ItemTitle className="text-primary">{children}</ItemTitle>
                </ItemContent>
            </button>
        </Item>
    );
}

function EmptyRow({ children }: any) {
    return (
        <Item size="sm">
            <ItemContent className="items-center">
                <ItemDescription className="text-center">{children}</ItemDescription>
            </ItemContent>
        </Item>
    );
}
