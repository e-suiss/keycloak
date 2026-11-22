// @ts-nocheck

import {
    CaretLeftIcon,
    CheckCircleIcon,
    DeviceMobileIcon,
    DotsThreeIcon,
    KeyIcon,
    LinkIcon,
    MonitorIcon,
    PlugIcon,
    PlusIcon,
    ShieldCheckIcon,
    SignOutIcon,
    TrashIcon,
    UserSwitchIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Spinner } from "@ui/components/spinner";
import { Switch } from "@ui/components/switch";
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs";
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
    Fragment,
    type ReactNode,
    useCallback,
    useEffect,
    useState
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";
import { fmtDate, fmtRelative } from "../ui/util";

const EMPTY = {
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    enabled: true,
    emailVerified: false
};

const PAGE = "mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8";

/* ── Local layout helpers (composed only from esuiss components) ─────── */

/** Inset list; separators are inserted between the (non-null) children. */
function List({ children }: { children: ReactNode }) {
    const items = Children.toArray(children);
    return (
        <ItemGroup variant="inset">
            {items.map((c: any, i) => (
                <Fragment key={c?.key ?? i}>
                    {i > 0 && <ItemSeparator />}
                    {c}
                </Fragment>
            ))}
        </ItemGroup>
    );
}

function Caption({ children }: { children: ReactNode }) {
    return <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">{children}</h3>;
}

function Loading() {
    return (
        <div className="flex justify-center py-16">
            <Spinner className="size-6" />
        </div>
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

function EmptyLine({ children }: { children: ReactNode }) {
    return (
        <Item size="sm">
            <ItemContent>
                <ItemDescription className="text-center">{children}</ItemDescription>
            </ItemContent>
        </Item>
    );
}

/** Label on top, full-width input below. */
function InputItem({ label, ...props }: any) {
    return (
        <Item size="sm">
            <ItemContent>
                <ItemTitle className="font-normal">{label}</ItemTitle>
                <Input size="md" {...props} />
            </ItemContent>
        </Item>
    );
}

function SwitchItem({ label, checked, onChange }: any) {
    return (
        <Item size="sm">
            <ItemContent>
                <ItemTitle className="font-normal">{label}</ItemTitle>
            </ItemContent>
            <ItemActions>
                <Switch checked={!!checked} onCheckedChange={(v: boolean) => onChange(v)} />
            </ItemActions>
        </Item>
    );
}

function DeleteButton({ onClick, title = "Sil" }: any) {
    return (
        <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClick}
            title={title}
            aria-label={title}
        >
            <TrashIcon />
        </Button>
    );
}

/** Icon + title/subtitle row with a trailing action. */
function EntityItem({ icon, title, subtitle, action, mono }: any) {
    return (
        <Item size="sm">
            <ItemMedia variant="icon">{icon}</ItemMedia>
            <ItemContent className="min-w-0">
                <ItemTitle className={mono ? "font-mono text-sm font-normal" : "text-sm"}>
                    {title}
                </ItemTitle>
                {subtitle && <ItemDescription className="truncate">{subtitle}</ItemDescription>}
            </ItemContent>
            <ItemActions>{action}</ItemActions>
        </Item>
    );
}

/** Confirm dialog — returns a [confirm(opts), node] pair (built on @ui/patterns/confirm). */
function useConfirm() {
    const [opts, setOpts] = useState<any>(null);
    const [open, setOpen] = useState(false);
    const confirm = (o: {
        title: ReactNode;
        message?: ReactNode;
        confirmLabel?: ReactNode;
        danger?: boolean;
        onConfirm: () => void;
    }) => {
        setOpts(o);
        setOpen(true);
    };
    const node = (
        <Confirm open={open} onOpenChange={setOpen}>
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
                        onClick={() => opts?.onConfirm?.()}
                    >
                        {opts?.confirmLabel ?? "Onayla"}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}

export default function UserDetail() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { id } = useParams();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();

    const isNew = id === "new";
    const [loading, setLoading] = useState(!isNew);
    const [user, setUser] = useState<any>(null);
    const [tab, setTab] = useState("general");

    const reload = useCallback(async () => {
        try {
            const u = await adminClient.users.findOne({ id });
            setUser(u);
        } catch (e) {
            addError("Kullanıcı yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        if (isNew) {
            setLoading(false);
            return;
        }
        setLoading(true);
        reload();
    }, [reload, isNew]);

    if (isNew) return <NewUser />;
    if (loading)
        return (
            <div className={PAGE}>
                <Loading />
            </div>
        );
    if (!user)
        return (
            <div className={PAGE}>
                <EmptyBlock icon={<UsersThreeIcon />} title="Kullanıcı bulunamadı" />
            </div>
        );

    const impersonate = async () => {
        try {
            const res = await adminClient.users.impersonation(
                { id },
                { user: id, realm }
            );
            if (res?.redirect) window.open(res.redirect, "_blank");
            else addAlert("Impersonation başlatıldı.", AlertVariant.success);
        } catch (e) {
            addError("Impersonation başarısız.", e);
        }
    };
    const logout = async () => {
        try {
            await adminClient.users.logout({ id });
            addAlert("Oturumlar kapatıldı.", AlertVariant.success);
        } catch (e) {
            addError("Oturumlar kapatılamadı.", e);
        }
    };
    const remove = () =>
        confirm({
            title: "Kullanıcıyı sil",
            message: `“${user.username}” kalıcı olarak silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.del({ id });
                    addAlert("Kullanıcı silindi.", AlertVariant.success);
                    navigate(`/${realm}/users`);
                } catch (e) {
                    addError("Silinemedi.", e);
                }
            }
        });

    const tabs = [
        { key: "general", label: "Genel" },
        { key: "attributes", label: "Öznitelikler" },
        { key: "credentials", label: "Kimlik bilgileri" },
        { key: "roles", label: "Roller" },
        { key: "groups", label: "Gruplar" },
        { key: "sessions", label: "Oturumlar" },
        { key: "consents", label: "Onaylar" },
        { key: "idp", label: "IdP bağlantıları" }
    ];

    return (
        <div className={PAGE}>
            <div className="relative mb-6 flex items-center">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => navigate(`/${realm}/users`)}
                    aria-label="Geri"
                >
                    <CaretLeftIcon weight="bold" className="rtl:rotate-180" />
                </Button>
                <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-center">
                    <p className="font-semibold">{user.username}</p>
                    {!user.enabled && <Badge variant="destructive">Devre dışı</Badge>}
                </div>
                <div className="ms-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" aria-label="Eylemler">
                                <DotsThreeIcon className="size-5" weight="bold" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={impersonate}>
                                <UserSwitchIcon /> Impersonate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={logout}>
                                <SignOutIcon /> Oturumları kapat
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={remove}>
                                <TrashIcon /> Sil
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList variant="line">
                    {tabs.map(t => (
                        <TabsTrigger key={t.key} value={t.key}>
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            <div className="mt-5">
                {tab === "general" && <GeneralTab user={user} reload={reload} />}
                {tab === "attributes" && <AttributesTab user={user} reload={reload} />}
                {tab === "credentials" && <CredentialsTab user={user} />}
                {tab === "roles" && <RolesTab user={user} />}
                {tab === "groups" && <GroupsTab user={user} />}
                {tab === "sessions" && <SessionsTab user={user} />}
                {tab === "consents" && <ConsentsTab user={user} />}
                {tab === "idp" && <IdpTab user={user} />}
            </div>
            {confirmNode}
        </div>
    );
}

function NewUser() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [f, setF] = useState({ ...EMPTY });
    const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
    const [saving, setSaving] = useState(false);

    const create = async () => {
        if (!f.username.trim()) return;
        setSaving(true);
        try {
            const c = await adminClient.users.create({
                username: f.username.trim(),
                email: f.email.trim() || undefined,
                firstName: f.firstName.trim() || undefined,
                lastName: f.lastName.trim() || undefined,
                enabled: !!f.enabled,
                emailVerified: !!f.emailVerified
            });
            addAlert("Kullanıcı oluşturuldu.", AlertVariant.success);
            if (c?.id) navigate(`/${realm}/users/${c.id}`);
        } catch (e) {
            addError("Oluşturulamadı.", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={PAGE}>
            <div className="relative mb-7 flex items-center">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => navigate(`/${realm}/users`)}
                    aria-label="Geri"
                >
                    <CaretLeftIcon weight="bold" className="rtl:rotate-180" />
                </Button>
                <p className="absolute left-1/2 -translate-x-1/2 font-semibold">
                    Yeni kullanıcı
                </p>
            </div>
            <div className="mx-auto max-w-xl space-y-6">
                <div>
                    <Caption>Kullanıcı</Caption>
                    <List>
                        <InputItem
                            key="username"
                            label="Kullanıcı adı"
                            autoFocus
                            value={f.username}
                            onChange={(e: any) => set("username", e.target.value)}
                            placeholder="kullanici"
                        />
                        <InputItem
                            key="email"
                            label="E-posta"
                            type="email"
                            value={f.email}
                            onChange={(e: any) => set("email", e.target.value)}
                            placeholder="ornek@site.com"
                        />
                        <InputItem
                            key="firstName"
                            label="Ad"
                            value={f.firstName}
                            onChange={(e: any) => set("firstName", e.target.value)}
                        />
                        <InputItem
                            key="lastName"
                            label="Soyad"
                            value={f.lastName}
                            onChange={(e: any) => set("lastName", e.target.value)}
                        />
                        <SwitchItem
                            key="enabled"
                            label="Etkin"
                            checked={f.enabled}
                            onChange={(v: boolean) => set("enabled", v)}
                        />
                        <SwitchItem
                            key="emailVerified"
                            label="E-posta doğrulandı"
                            checked={f.emailVerified}
                            onChange={(v: boolean) => set("emailVerified", v)}
                        />
                    </List>
                </div>
                <div className="flex justify-end">
                    <Button disabled={saving || !f.username.trim()} onClick={create}>
                        {saving ? "Oluşturuluyor…" : "Oluştur"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Genel ────────────────────────────────────────────────────────────── */
function GeneralTab({ user, reload }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [f, setF] = useState({
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        enabled: !!user.enabled,
        emailVerified: !!user.emailVerified
    });
    const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await adminClient.users.update(
                { id: user.id },
                {
                    email: f.email.trim() || undefined,
                    firstName: f.firstName.trim() || undefined,
                    lastName: f.lastName.trim() || undefined,
                    enabled: f.enabled,
                    emailVerified: f.emailVerified
                }
            );
            addAlert("Kaydedildi.", AlertVariant.success);
            reload();
        } catch (e) {
            addError("Kaydedilemedi.", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <div>
                <Caption>Profil</Caption>
                <List>
                    <Item key="username" size="sm">
                        <ItemContent>
                            <ItemTitle className="font-normal">Kullanıcı adı</ItemTitle>
                        </ItemContent>
                        <ItemActions>
                            <span className="text-sm text-muted-foreground">
                                {user.username}
                            </span>
                        </ItemActions>
                    </Item>
                    <InputItem
                        key="email"
                        label="E-posta"
                        type="email"
                        value={f.email}
                        onChange={(e: any) => set("email", e.target.value)}
                    />
                    <InputItem
                        key="firstName"
                        label="Ad"
                        value={f.firstName}
                        onChange={(e: any) => set("firstName", e.target.value)}
                    />
                    <InputItem
                        key="lastName"
                        label="Soyad"
                        value={f.lastName}
                        onChange={(e: any) => set("lastName", e.target.value)}
                    />
                    <SwitchItem
                        key="enabled"
                        label="Etkin"
                        checked={f.enabled}
                        onChange={(v: boolean) => set("enabled", v)}
                    />
                    <SwitchItem
                        key="emailVerified"
                        label="E-posta doğrulandı"
                        checked={f.emailVerified}
                        onChange={(v: boolean) => set("emailVerified", v)}
                    />
                </List>
                <p className="mt-2 ms-1 text-sm text-muted-foreground">
                    Oluşturulma: {fmtDate(user.createdTimestamp)}
                </p>
            </div>
            <div className="flex justify-end">
                <Button disabled={saving} onClick={save}>
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>
        </div>
    );
}

/* ── Öznitelikler ─────────────────────────────────────────────────────── */
function AttributesTab({ user, reload }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const toRows = (attrs: any) =>
        Object.entries(attrs || {}).map(([k, v]: any) => ({
            k,
            v: Array.isArray(v) ? v.join(", ") : String(v)
        }));
    const [rows, setRows] = useState<any[]>(toRows(user.attributes));
    const [saving, setSaving] = useState(false);
    const setRow = (i: number, field: string, val: string) =>
        setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));

    const save = async () => {
        setSaving(true);
        try {
            const attributes: any = {};
            rows.forEach(r => {
                const key = r.k.trim();
                if (key)
                    attributes[key] = String(r.v)
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean);
            });
            await adminClient.users.update({ id: user.id }, { ...user, attributes });
            addAlert("Öznitelikler kaydedildi.", AlertVariant.success);
            reload();
        } catch (e) {
            addError("Kaydedilemedi.", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <Caption>Öznitelikler</Caption>
            <List>
                {rows.length === 0 ? (
                    <EmptyLine key="empty">Öznitelik yok.</EmptyLine>
                ) : (
                    rows.map((r, i) => (
                        <Item key={i} size="sm">
                            <ItemContent className="flex-row items-center gap-2">
                                <Input
                                    size="md"
                                    className="w-2/5"
                                    value={r.k}
                                    onChange={(e: any) => setRow(i, "k", e.target.value)}
                                    placeholder="anahtar"
                                />
                                <span className="text-muted-foreground">:</span>
                                <Input
                                    size="md"
                                    className="flex-1"
                                    value={r.v}
                                    onChange={(e: any) => setRow(i, "v", e.target.value)}
                                    placeholder="değer (virgülle ayır)"
                                />
                            </ItemContent>
                            <ItemActions>
                                <DeleteButton
                                    onClick={() =>
                                        setRows(rows.filter((_, idx) => idx !== i))
                                    }
                                />
                            </ItemActions>
                        </Item>
                    ))
                )}
                <Item key="add" size="sm" asChild>
                    <button
                        type="button"
                        onClick={() => setRows([...rows, { k: "", v: "" }])}
                    >
                        <ItemMedia variant="icon" className="text-primary">
                            <PlusIcon />
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle className="text-sm text-primary">
                                Öznitelik ekle
                            </ItemTitle>
                        </ItemContent>
                    </button>
                </Item>
            </List>
            <div className="flex justify-end">
                <Button disabled={saving} onClick={save}>
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>
        </div>
    );
}

/* ── Kimlik bilgileri ─────────────────────────────────────────────────── */
function CredentialsTab({ user }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const [creds, setCreds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pw, setPw] = useState("");
    const [temp, setTemp] = useState(true);
    const [resetting, setResetting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const c = await adminClient.users.getCredentials({ id: user.id });
            setCreds(Array.isArray(c) ? c : []);
        } catch (e) {
            addError("Kimlik bilgileri yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, user.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const reset = async () => {
        if (!pw) return;
        setResetting(true);
        try {
            await adminClient.users.resetPassword({
                id: user.id,
                credential: { type: "password", value: pw, temporary: temp }
            });
            addAlert("Şifre belirlendi.", AlertVariant.success);
            setPw("");
            load();
        } catch (e) {
            addError("Şifre belirlenemedi.", e);
        } finally {
            setResetting(false);
        }
    };

    const del = (c: any) =>
        confirm({
            title: "Kimlik bilgisini sil",
            message: `${c.userLabel || c.type} silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.deleteCredential({
                        id: user.id,
                        credentialId: c.id
                    });
                    addAlert("Silindi.", AlertVariant.success);
                    setCreds(creds.filter(x => x.id !== c.id));
                } catch (e) {
                    addError("Silinemedi.", e);
                }
            }
        });

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <div>
                <Caption>Şifre belirle</Caption>
                <List>
                    <InputItem
                        key="pw"
                        label="Yeni şifre"
                        type="password"
                        value={pw}
                        onChange={(e: any) => setPw(e.target.value)}
                        placeholder="••••••••"
                    />
                    <SwitchItem
                        key="temp"
                        label="Geçici (ilk girişte değiştir)"
                        checked={temp}
                        onChange={setTemp}
                    />
                    <Item key="reset" size="sm">
                        <ItemContent>
                            <Button
                                variant="plain"
                                block
                                disabled={!pw || resetting}
                                onClick={reset}
                            >
                                {resetting ? "Belirleniyor…" : "Şifreyi belirle"}
                            </Button>
                        </ItemContent>
                    </Item>
                </List>
            </div>
            <div>
                <Caption>Kayıtlı kimlik bilgileri</Caption>
                {loading ? (
                    <Loading />
                ) : creds.length === 0 ? (
                    <EmptyBlock
                        icon={<KeyIcon />}
                        title="Kimlik bilgisi yok"
                        desc="Kullanıcının kayıtlı şifresi veya OTP'si bulunmuyor."
                    />
                ) : (
                    <List>
                        {creds.map(c => (
                            <EntityItem
                                key={c.id}
                                icon={<KeyIcon />}
                                title={c.userLabel || c.type}
                                subtitle={
                                    <>
                                        {c.type}
                                        {c.createdDate
                                            ? ` · ${fmtDate(c.createdDate)}`
                                            : ""}
                                    </>
                                }
                                action={<DeleteButton onClick={() => del(c)} />}
                            />
                        ))}
                    </List>
                )}
            </div>
            {confirmNode}
        </div>
    );
}

/* ── Roller (realm + client) ──────────────────────────────────────────── */
function RolesTab({ user }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const [realmRoles, setRealmRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [picking, setPicking] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const m = await adminClient.users.listRealmRoleMappings({ id: user.id });
            setRealmRoles(Array.isArray(m) ? m : []);
        } catch (e) {
            addError("Roller yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, user.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const removeRole = (r: any) =>
        confirm({
            title: "Rolü kaldır",
            message: `“${r.name}” kaldırılacak.`,
            confirmLabel: "Kaldır",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.delRealmRoleMappings({
                        id: user.id,
                        roles: [{ id: r.id, name: r.name }]
                    });
                    addAlert("Kaldırıldı.", AlertVariant.success);
                    setRealmRoles(realmRoles.filter(x => x.id !== r.id));
                } catch (e) {
                    addError("Kaldırılamadı.", e);
                }
            }
        });

    if (loading) return <Loading />;

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="ms-1 text-sm font-medium text-muted-foreground">
                    Atanmış realm rolleri
                </h3>
                <Button variant="plain" size="sm" onClick={() => setPicking(true)}>
                    <PlusIcon /> Rol ata
                </Button>
            </div>
            {realmRoles.length === 0 ? (
                <EmptyBlock
                    icon={<ShieldCheckIcon />}
                    title="Rol atanmamış"
                    desc="Kullanıcıya realm rolü atayarak yetki ver."
                />
            ) : (
                <List>
                    {realmRoles.map(r => (
                        <EntityItem
                            key={r.id}
                            icon={<ShieldCheckIcon />}
                            title={r.name}
                            subtitle={r.description}
                            action={<DeleteButton onClick={() => removeRole(r)} />}
                        />
                    ))}
                </List>
            )}
            {picking && (
                <PickUserRoleModal
                    user={user}
                    assigned={new Set(realmRoles.map(r => r.id))}
                    onClose={() => setPicking(false)}
                    onAdded={() => {
                        setPicking(false);
                        load();
                    }}
                />
            )}
            {confirmNode}
        </div>
    );
}

function PickUserRoleModal({ user, assigned, onClose, onAdded }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const a = await adminClient.users.listAvailableRealmRoleMappings({
                    id: user.id
                });
                setRoles((a || []).filter((r: any) => r.name !== "uma_authorization"));
            } catch (e) {
                addError("Roller yüklenemedi.", e);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.id, adminClient.users.listAvailableRealmRoleMappings, addError]);

    const toggle = (id: string) =>
        setSel(p => {
            const n = new Set(p);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });

    const save = async () => {
        const chosen = roles
            .filter(r => sel.has(r.id))
            .map(r => ({ id: r.id, name: r.name }));
        if (!chosen.length) return;
        setSaving(true);
        try {
            await adminClient.users.addRealmRoleMappings({ id: user.id, roles: chosen });
            addAlert(`${chosen.length} rol atandı.`, AlertVariant.success);
            onAdded();
        } catch (e) {
            addError("Atanamadı.", e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>Rol ata</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {loading ? (
                        <Loading />
                    ) : (
                        <List>
                            {roles.length === 0 ? (
                                <EmptyLine key="empty">Atanabilecek rol yok.</EmptyLine>
                            ) : (
                                roles.map(r => (
                                    <Item key={r.id} size="sm" asChild>
                                        <label>
                                            <ItemMedia>
                                                <Checkbox
                                                    checked={sel.has(r.id)}
                                                    onCheckedChange={() => toggle(r.id)}
                                                />
                                            </ItemMedia>
                                            <ItemContent className="min-w-0">
                                                <ItemTitle className="text-sm">
                                                    {r.name}
                                                </ItemTitle>
                                                {r.description && (
                                                    <ItemDescription className="truncate">
                                                        {r.description}
                                                    </ItemDescription>
                                                )}
                                            </ItemContent>
                                        </label>
                                    </Item>
                                ))
                            )}
                        </List>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving || sel.size === 0} onClick={save}>
                        {saving ? "Atanıyor…" : `Ata (${sel.size})`}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/* ── Gruplar ──────────────────────────────────────────────────────────── */
function GroupsTab({ user }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const [groups, setGroups] = useState<any[]>([]);
    const [all, setAll] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [add, setAdd] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [mine, every] = await Promise.all([
                adminClient.users.listGroups({ id: user.id }),
                adminClient.groups.find({ briefRepresentation: true })
            ]);
            setGroups(Array.isArray(mine) ? mine : []);
            setAll(Array.isArray(every) ? every : []);
        } catch (e) {
            addError("Gruplar yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, user.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const joinable = all.filter(g => !groups.some(m => m.id === g.id));

    const join = async () => {
        if (!add) return;
        try {
            await adminClient.users.addToGroup({ id: user.id, groupId: add });
            addAlert("Gruba eklendi.", AlertVariant.success);
            setAdd("");
            load();
        } catch (e) {
            addError("Eklenemedi.", e);
        }
    };
    const leave = (g: any) =>
        confirm({
            title: "Gruptan çıkar",
            message: `“${g.name}” grubundan çıkarılacak.`,
            confirmLabel: "Çıkar",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.delFromGroup({ id: user.id, groupId: g.id });
                    addAlert("Çıkarıldı.", AlertVariant.success);
                    setGroups(groups.filter(x => x.id !== g.id));
                } catch (e) {
                    addError("Çıkarılamadı.", e);
                }
            }
        });

    if (loading) return <Loading />;

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <Caption>Üyelikler</Caption>
            <List>
                {groups.length === 0 ? (
                    <EmptyLine key="empty">Üye olunan grup yok.</EmptyLine>
                ) : (
                    groups.map(g => (
                        <EntityItem
                            key={g.id}
                            icon={<UsersThreeIcon />}
                            title={g.path || g.name}
                            mono
                            action={
                                <DeleteButton
                                    onClick={() => leave(g)}
                                    title="Gruptan çıkar"
                                />
                            }
                        />
                    ))
                )}
                <Item key="join" size="sm">
                    <ItemContent>
                        <Select
                            value={add || "__none__"}
                            onValueChange={(v: string) =>
                                setAdd(v === "__none__" ? "" : v)
                            }
                        >
                            <SelectTrigger size="sm" className="w-full">
                                <SelectValue placeholder="Grup seç…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">Grup seç…</SelectItem>
                                {joinable.map(g => (
                                    <SelectItem key={g.id} value={g.id}>
                                        {g.path || g.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </ItemContent>
                    <ItemActions>
                        <Button variant="tinted" size="sm" disabled={!add} onClick={join}>
                            Ekle
                        </Button>
                    </ItemActions>
                </Item>
            </List>
            {confirmNode}
        </div>
    );
}

/* ── Oturumlar ────────────────────────────────────────────────────────── */
function SessionsTab({ user }: any) {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const s = await adminClient.users.listSessions({ id: user.id });
            setSessions(Array.isArray(s) ? s : []);
        } catch (e) {
            addError("Oturumlar yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, user.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const signOut = async (s: any) => {
        try {
            await adminClient.realms.deleteSession({
                realm,
                session: s.id,
                isOffline: false
            });
            addAlert("Oturum kapatıldı.", AlertVariant.success);
            setSessions(sessions.filter(x => x.id !== s.id));
        } catch (e) {
            addError("Kapatılamadı.", e);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <Caption>{sessions.length} aktif oturum</Caption>
            {sessions.length === 0 ? (
                <EmptyBlock
                    icon={<MonitorIcon />}
                    title="Aktif oturum yok"
                    desc="Kullanıcının açık oturumu bulunmuyor."
                />
            ) : (
                <List>
                    {sessions.map(s => {
                        const clients = Object.values(s.clients || {});
                        return (
                            <EntityItem
                                key={s.id}
                                icon={<DeviceMobileIcon />}
                                title={s.ipAddress || "—"}
                                subtitle={
                                    <>
                                        {clients.join(", ") || "—"} ·{" "}
                                        {fmtRelative(s.lastAccess)}
                                    </>
                                }
                                action={
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => signOut(s)}
                                        aria-label="Kapat"
                                    >
                                        <SignOutIcon />
                                    </Button>
                                }
                            />
                        );
                    })}
                </List>
            )}
        </div>
    );
}

/* ── Onaylar ──────────────────────────────────────────────────────────── */
function ConsentsTab({ user }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const [consents, setConsents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const c = await adminClient.users.listConsents({ id: user.id });
            setConsents(Array.isArray(c) ? c : []);
        } catch (e) {
            addError("Onaylar yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, user.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const revoke = (c: any) =>
        confirm({
            title: "Onayı geri al",
            message: `“${c.clientId}” istemcisine verilen onay geri alınacak.`,
            confirmLabel: "Geri al",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.revokeConsent({
                        id: user.id,
                        clientId: c.clientId
                    });
                    addAlert("Onay geri alındı.", AlertVariant.success);
                    setConsents(consents.filter(x => x.clientId !== c.clientId));
                } catch (e) {
                    addError("Geri alınamadı.", e);
                }
            }
        });

    if (loading) return <Loading />;

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <Caption>Verilen onaylar</Caption>
            {consents.length === 0 ? (
                <EmptyBlock
                    icon={<CheckCircleIcon />}
                    title="Onay yok"
                    desc="Kullanıcı henüz hiçbir istemciye onay vermemiş."
                />
            ) : (
                <List>
                    {consents.map(c => (
                        <EntityItem
                            key={c.clientId}
                            icon={<CheckCircleIcon />}
                            title={c.clientId}
                            subtitle={(c.grantedClientScopes || []).join(", ") || "—"}
                            action={
                                <DeleteButton
                                    onClick={() => revoke(c)}
                                    title="Onayı geri al"
                                />
                            }
                        />
                    ))}
                </List>
            )}
            {confirmNode}
        </div>
    );
}

/* ── IdP bağlantıları ─────────────────────────────────────────────────── */
function IdpTab({ user }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const [links, setLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const l = await adminClient.users.listFederatedIdentities({ id: user.id });
            setLinks(Array.isArray(l) ? l : []);
        } catch (e) {
            addError("Bağlantılar yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, user.id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const unlink = (l: any) =>
        confirm({
            title: "Bağlantıyı kaldır",
            message: `“${l.identityProvider}” bağlantısı kaldırılacak.`,
            confirmLabel: "Kaldır",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.delFromFederatedIdentity({
                        id: user.id,
                        federatedIdentityId: l.identityProvider
                    });
                    addAlert("Kaldırıldı.", AlertVariant.success);
                    setLinks(
                        links.filter(x => x.identityProvider !== l.identityProvider)
                    );
                } catch (e) {
                    addError("Kaldırılamadı.", e);
                }
            }
        });

    if (loading) return <Loading />;

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <Caption>Kimlik sağlayıcı bağlantıları</Caption>
            {links.length === 0 ? (
                <EmptyBlock
                    icon={<PlugIcon />}
                    title="Bağlantı yok"
                    desc="Bu kullanıcı harici bir kimlik sağlayıcıya bağlı değil."
                />
            ) : (
                <List>
                    {links.map(l => (
                        <EntityItem
                            key={l.identityProvider}
                            icon={<LinkIcon />}
                            title={l.identityProvider}
                            subtitle={l.userName || l.userId}
                            action={
                                <DeleteButton
                                    onClick={() => unlink(l)}
                                    title="Bağlantıyı kaldır"
                                />
                            }
                        />
                    ))}
                </List>
            )}
            {confirmNode}
        </div>
    );
}
