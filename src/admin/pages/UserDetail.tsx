// @ts-nocheck

import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Field, FieldLabel } from "@ui/components/field";
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
import { type ReactNode, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { i18n } from "../i18n/i18n";
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
    SegmentTabs,
    TextAction
} from "../ui/kit";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";

const EMPTY = {
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    enabled: true,
    emailVerified: false
};

const DANGER_BUTTON =
    "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";

function useResource(fetcher: () => Promise<any>, deps: any[]) {
    const [state, setState] = useState<{ status: "loading" | "error" | "ready"; data: any }>({
        status: "loading",
        data: null
    });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let alive = true;
        setState(s => (s.status === "ready" ? s : { status: "loading", data: null }));
        fetcher()
            .then(data => alive && setState({ status: "ready", data }))
            .catch(() => alive && setState({ status: "error", data: null }));
        return () => {
            alive = false;
        };
    }, [...deps, attempt]);
    const setData = (updater: any) =>
        setState(s => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater }));
    const reload = () => setAttempt(n => n + 1);
    return { status: state.status, data: state.data, setData, reload };
}

const asList = (value: any) => (Array.isArray(value) ? value : []);

const toDate = (v: any) => new Date(typeof v === "number" ? v : Number(v) || v);
const locale = () => i18n.language || undefined;
const formatDate = (v: any) => (v ? toDate(v).toLocaleString(locale()) : "—");

function formatRelative(v: any) {
    if (!v) return "—";
    const time = toDate(v).getTime();
    const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: "auto" });
    const sec = Math.round((Date.now() - time) / 1000);
    if (sec < 60) return rtf.format(0, "second");
    const min = Math.round(sec / 60);
    if (min < 60) return rtf.format(-min, "minute");
    const hr = Math.round(min / 60);
    if (hr < 24) return rtf.format(-hr, "hour");
    const day = Math.round(hr / 24);
    if (day < 30) return rtf.format(-day, "day");
    return new Date(time).toLocaleDateString(locale());
}

function Monogram({ name }: { name: string }) {
    return (
        <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-[11px] font-semibold text-white dark:bg-[#48484a]">
            {initials(name)}
        </span>
    );
}

function TextField({ id, label, ...props }: any) {
    return (
        <Field size="lg">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Input size="lg" id={id} {...props} />
        </Field>
    );
}

function SwitchRow({ label, checked, onChange, disabled }: any) {
    return (
        <Row
            className="min-h-13"
            title={label}
            trailing={
                <Switch
                    aria-label={typeof label === "string" ? label : undefined}
                    checked={!!checked}
                    disabled={disabled}
                    onCheckedChange={(v: boolean) => onChange(v)}
                />
            }
        />
    );
}

function SaveBar({ children }: { children: ReactNode }) {
    return <div className="flex justify-end">{children}</div>;
}

function Footnote({ children }: { children: ReactNode }) {
    return <p className="mt-2 px-0.5 text-[13px] leading-[1.4] text-muted-foreground">{children}</p>;
}

function useConfirm() {
    const t = useT();
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
                    {opts?.message && <ConfirmDescription>{opts.message}</ConfirmDescription>}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxCommonCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => opts?.onConfirm?.()}
                    >
                        {opts?.confirmLabel ?? t("sxCommonConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}

function ListState({
    status,
    count,
    onRetry,
    errorTitle,
    emptyTitle,
    emptyDescription,
    emptyAction,
    children
}: {
    status: string;
    count: number;
    onRetry: () => void;
    errorTitle: string;
    emptyTitle: string;
    emptyDescription?: string;
    emptyAction?: ReactNode;
    children: ReactNode;
}) {
    const t = useT();
    if (status === "loading") return <ListSkeleton />;
    if (status === "error")
        return (
            <Notice title={errorTitle} description={t("sxLoadErrorDescription")} onRetry={onRetry} />
        );
    if (count === 0) return <Notice title={emptyTitle} description={emptyDescription} action={emptyAction} />;
    return <>{children}</>;
}

const TABS = [
    { value: "general", label: "sxUserDetailTabGeneral" },
    { value: "attributes", label: "sxUserDetailTabAttributes" },
    { value: "credentials", label: "sxUserDetailTabCredentials" },
    { value: "roles", label: "sxUserDetailTabRoles" },
    { value: "groups", label: "sxUserDetailTabGroups" },
    { value: "sessions", label: "sxUserDetailTabSessions" },
    { value: "consents", label: "sxUserDetailTabConsents" },
    { value: "idp", label: "sxUserDetailTabIdp" }
];

export default function UserDetail() {
    const { id } = useParams();
    if (id === "new") return <NewUser />;
    return <ExistingUser key={id} id={id} />;
}

function ExistingUser({ id }: { id: string }) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const [tab, setTab] = useState("general");
    const { status, data: user, reload } = useResource(() => adminClient.users.findOne({ id }), [adminClient, id]);

    const back = { label: t("sxUsersTitle"), to: `/${realm}/users` };

    if (status === "loading")
        return (
            <AdminPage title={t("sxUserDetailTitle")} back={back}>
                <ListSkeleton rows={4} />
            </AdminPage>
        );
    if (status === "error" || !user)
        return (
            <AdminPage title={t("sxUserDetailTitle")} back={back}>
                {status === "error" ? (
                    <Notice title={t("sxUserDetailLoadError")} description={t("sxLoadErrorDescription")} onRetry={reload} />
                ) : (
                    <Notice
                        title={t("sxUserDetailNotFound")}
                        description={t("sxUserDetailNotFoundDescription")}
                        action={
                            <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => navigate(back.to)}>
                                {t("sxUserDetailBackToList")}
                            </Button>
                        }
                    />
                )}
            </AdminPage>
        );

    const impersonate = async () => {
        try {
            const res = await adminClient.users.impersonation({ id }, { user: id, realm });
            if (res?.redirect) window.open(res.redirect, "_blank");
            else addAlert(t("sxUserDetailImpersonationStarted"), AlertVariant.success);
        } catch (e) {
            addError(t("sxUserDetailImpersonationError"), e);
        }
    };
    const logout = async () => {
        try {
            await adminClient.users.logout({ id });
            addAlert(t("sxUserDetailSessionsSignedOut"), AlertVariant.success);
        } catch (e) {
            addError(t("sxUserDetailSessionsSignOutError"), e);
        }
    };
    const remove = () =>
        confirm({
            title: t("sxUserDetailDelete"),
            message: t("sxUserDetailDeleteConfirm", { username: user.username }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.del({ id });
                    addAlert(t("sxUserDetailDeleted"), AlertVariant.success);
                    navigate(`/${realm}/users`);
                } catch (e) {
                    addError(t("sxCommonDeleteError"), e);
                }
            }
        });

    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

    return (
        <AdminPage
            back={back}
            title={
                <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="[overflow-wrap:anywhere]">{user.username}</span>
                    {!user.enabled && <Chip tone="danger">{t("sxCommonDisabled")}</Chip>}
                </span>
            }
            description={[fullName, user.email].filter(Boolean).join(" · ") || undefined}
            actions={
                <>
                    <Button variant="secondary" onClick={impersonate}>
                        {t("sxUserDetailImpersonate")}
                    </Button>
                    <Button variant="secondary" onClick={logout}>
                        {t("sxUserDetailSignOutSessions")}
                    </Button>
                </>
            }
        >
            <SegmentTabs
                value={tab}
                onChange={setTab}
                items={TABS.map(item => ({ value: item.value, label: t(item.label) }))}
                ariaLabel={t("sxUserDetailSections")}
            />
            {tab === "general" && <GeneralTab user={user} reload={reload} onDelete={remove} />}
            {tab === "attributes" && <AttributesTab user={user} reload={reload} />}
            {tab === "credentials" && <CredentialsTab user={user} />}
            {tab === "roles" && <RolesTab user={user} />}
            {tab === "groups" && <GroupsTab user={user} />}
            {tab === "sessions" && <SessionsTab user={user} />}
            {tab === "consents" && <ConsentsTab user={user} />}
            {tab === "idp" && <IdpTab user={user} />}
            {confirmNode}
        </AdminPage>
    );
}

function NewUser() {
    const t = useT();
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
            addAlert(t("sxUserDetailCreated"), AlertVariant.success);
            if (c?.id) navigate(`/${realm}/users/${c.id}`);
        } catch (e) {
            addError(t("sxUserDetailCreateError"), e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminPage title={t("sxUsersNew")} back={{ label: t("sxUsersTitle"), to: `/${realm}/users` }}>
            <Section label={t("sxUserDetailTitle")}>
                <div className="flex flex-col gap-4">
                    <TextField
                        id="new-username"
                        label={t("sxUserDetailUsername")}
                        autoFocus
                        value={f.username}
                        onChange={(e: any) => set("username", e.target.value)}
                        placeholder={t("sxUserDetailUsernamePlaceholder")}
                    />
                    <TextField
                        id="new-email"
                        label={t("sxUserDetailEmail")}
                        type="email"
                        value={f.email}
                        onChange={(e: any) => set("email", e.target.value)}
                        placeholder={t("sxUserDetailEmailPlaceholder")}
                    />
                    <TextField
                        id="new-firstName"
                        label={t("sxCommonName")}
                        value={f.firstName}
                        onChange={(e: any) => set("firstName", e.target.value)}
                    />
                    <TextField
                        id="new-lastName"
                        label={t("sxUserDetailLastName")}
                        value={f.lastName}
                        onChange={(e: any) => set("lastName", e.target.value)}
                    />
                </div>
            </Section>
            <Section label={t("sxUserDetailStatus")}>
                <Group>
                    <SwitchRow
                        key="enabled"
                        label={t("sxCommonEnabled")}
                        checked={f.enabled}
                        onChange={(v: boolean) => set("enabled", v)}
                    />
                    <SwitchRow
                        key="emailVerified"
                        label={t("sxUserDetailEmailVerified")}
                        checked={f.emailVerified}
                        onChange={(v: boolean) => set("emailVerified", v)}
                    />
                </Group>
            </Section>
            <SaveBar>
                <Button size="form" disabled={saving || !f.username.trim()} onClick={create}>
                    {saving ? t("sxCommonCreating") : t("sxCommonCreate")}
                </Button>
            </SaveBar>
        </AdminPage>
    );
}

function GeneralTab({ user, reload, onDelete }: any) {
    const t = useT();
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
            addAlert(t("sxCommonSaved"), AlertVariant.success);
            reload();
        } catch (e) {
            addError(t("sxCommonSaveError"), e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Section label={t("sxUserDetailProfile")}>
                <div className="flex flex-col gap-4">
                    <TextField
                        id="user-username"
                        label={t("sxUserDetailUsername")}
                        readOnly
                        value={user.username}
                        className="text-muted-foreground"
                    />
                    <TextField
                        id="user-email"
                        label={t("sxUserDetailEmail")}
                        type="email"
                        value={f.email}
                        onChange={(e: any) => set("email", e.target.value)}
                    />
                    <TextField
                        id="user-firstName"
                        label={t("sxCommonName")}
                        value={f.firstName}
                        onChange={(e: any) => set("firstName", e.target.value)}
                    />
                    <TextField
                        id="user-lastName"
                        label={t("sxUserDetailLastName")}
                        value={f.lastName}
                        onChange={(e: any) => set("lastName", e.target.value)}
                    />
                </div>
            </Section>
            <Section label={t("sxUserDetailStatus")}>
                <Group>
                    <SwitchRow
                        key="enabled"
                        label={t("sxCommonEnabled")}
                        checked={f.enabled}
                        onChange={(v: boolean) => set("enabled", v)}
                    />
                    <SwitchRow
                        key="emailVerified"
                        label={t("sxUserDetailEmailVerified")}
                        checked={f.emailVerified}
                        onChange={(v: boolean) => set("emailVerified", v)}
                    />
                </Group>
                <Footnote>{t("sxUserDetailCreatedAt", { date: formatDate(user.createdTimestamp) })}</Footnote>
            </Section>
            <SaveBar>
                <Button size="form" disabled={saving} onClick={save}>
                    {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                </Button>
            </SaveBar>
            <section className="border-t border-[#e5e5ea] pt-6 dark:border-[#38383a]">
                <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">
                    {t("sxUserDetailDeleteConfirm", { username: user.username })}
                </p>
                <Button size="form" className={DANGER_BUTTON} onClick={onDelete}>
                    {t("sxUserDetailDelete")}
                </Button>
            </section>
        </>
    );
}

function AttributeEditor({ rows, setRows }: { rows: any[]; setRows: (rows: any[]) => void }) {
    const t = useT();
    const setRow = (i: number, field: string, val: string) =>
        setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
    if (rows.length === 0)
        return (
            <Notice
                title={t("sxUserDetailNoAttributes")}
                description={t("sxUserDetailNoAttributesDescription")}
                action={
                    <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setRows([{ k: "", v: "" }])}>
                        {t("sxOrgDetailAddAttribute")}
                    </Button>
                }
            />
        );
    return (
        <ul className={GROUP}>
            {rows.map((r, i) => (
                <li key={i}>
                    {i > 0 && <div className={SEPARATOR} />}
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
                        <Input
                            className="sm:w-2/5"
                            aria-label={t("sxCommonKey")}
                            value={r.k}
                            onChange={(e: any) => setRow(i, "k", e.target.value)}
                            placeholder={t("sxCommonKeyPlaceholder")}
                        />
                        <Input
                            className="sm:flex-1"
                            aria-label={t("sxCommonValue")}
                            value={r.v}
                            onChange={(e: any) => setRow(i, "v", e.target.value)}
                            placeholder={t("sxOrgDetailValuePlaceholder")}
                        />
                        <TextAction
                            tone="danger"
                            className="self-end sm:self-auto"
                            onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                        >
                            {t("sxCommonDelete")}
                        </TextAction>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function AttributesTab({ user, reload }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const toRows = (attrs: any) =>
        Object.entries(attrs || {}).map(([k, v]: any) => ({
            k,
            v: Array.isArray(v) ? v.join(", ") : String(v)
        }));
    const [rows, setRows] = useState<any[]>(toRows(user.attributes));
    const [saving, setSaving] = useState(false);

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
            addAlert(t("sxOrgDetailAttributesSaved"), AlertVariant.success);
            reload();
        } catch (e) {
            addError(t("sxCommonSaveError"), e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Section
                label={t("sxUserDetailTabAttributes")}
                action={
                    <TextAction onClick={() => setRows([...rows, { k: "", v: "" }])}>
                        {t("sxOrgDetailAddAttribute")}
                    </TextAction>
                }
            >
                <AttributeEditor rows={rows} setRows={setRows} />
            </Section>
            <SaveBar>
                <Button size="form" disabled={saving} onClick={save}>
                    {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                </Button>
            </SaveBar>
        </>
    );
}

function CredentialsTab({ user }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const creds = useResource(
        () => adminClient.users.getCredentials({ id: user.id }).then(asList),
        [adminClient, user.id]
    );
    const [pw, setPw] = useState("");
    const [temp, setTemp] = useState(true);
    const [resetting, setResetting] = useState(false);

    const reset = async () => {
        if (!pw) return;
        setResetting(true);
        try {
            await adminClient.users.resetPassword({
                id: user.id,
                credential: { type: "password", value: pw, temporary: temp }
            });
            addAlert(t("sxUserDetailPasswordSet"), AlertVariant.success);
            setPw("");
            creds.reload();
        } catch (e) {
            addError(t("sxUserDetailPasswordSetError"), e);
        } finally {
            setResetting(false);
        }
    };

    const del = (c: any) =>
        confirm({
            title: t("sxUserDetailDeleteCredential"),
            message: t("sxUserDetailDeleteCredentialConfirm", { name: c.userLabel || c.type }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.deleteCredential({
                        id: user.id,
                        credentialId: c.id
                    });
                    addAlert(t("sxCommonDeleted"), AlertVariant.success);
                    creds.setData((list: any[]) => (list || []).filter(x => x.id !== c.id));
                } catch (e) {
                    addError(t("sxCommonDeleteError"), e);
                }
            }
        });

    const list = creds.data || [];

    return (
        <>
            <Section label={t("sxUserDetailSetPassword")}>
                <div className="flex flex-col gap-4">
                    <TextField
                        id="user-new-password"
                        label={t("sxUserDetailNewPassword")}
                        type="password"
                        value={pw}
                        onChange={(e: any) => setPw(e.target.value)}
                        placeholder="••••••••"
                    />
                    <Group>
                        <SwitchRow label={t("sxUserDetailTemporaryPassword")} checked={temp} onChange={setTemp} />
                    </Group>
                    <SaveBar>
                        <Button size="form" disabled={!pw || resetting} onClick={reset}>
                            {resetting ? t("sxUserDetailSettingPassword") : t("sxUserDetailSetPasswordButton")}
                        </Button>
                    </SaveBar>
                </div>
            </Section>
            <Section label={t("sxUserDetailStoredCredentials")}>
                <ListState
                    status={creds.status}
                    count={list.length}
                    onRetry={creds.reload}
                    errorTitle={t("sxUserDetailCredentialsLoadError")}
                    emptyTitle={t("sxUserDetailNoCredentials")}
                    emptyDescription={t("sxUserDetailNoCredentialsDescription")}
                >
                    <Group>
                        {list.map(c => (
                            <Row
                                key={c.id}
                                title={c.userLabel || c.type}
                                subtitle={
                                    <>
                                        {c.type}
                                        {c.createdDate ? ` · ${formatDate(c.createdDate)}` : ""}
                                    </>
                                }
                                trailing={
                                    <TextAction tone="danger" onClick={() => del(c)}>
                                        {t("sxCommonDelete")}
                                    </TextAction>
                                }
                            />
                        ))}
                    </Group>
                </ListState>
            </Section>
            {confirmNode}
        </>
    );
}

function RolesTab({ user }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const roles = useResource(
        () => adminClient.users.listRealmRoleMappings({ id: user.id }).then(asList),
        [adminClient, user.id]
    );
    const [picking, setPicking] = useState(false);
    const realmRoles = roles.data || [];

    const removeRole = (r: any) =>
        confirm({
            title: t("sxUserDetailRemoveRole"),
            message: t("sxUserDetailRemoveRoleConfirm", { name: r.name }),
            confirmLabel: t("sxCommonRemove"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.delRealmRoleMappings({
                        id: user.id,
                        roles: [{ id: r.id, name: r.name }]
                    });
                    addAlert(t("sxCommonRemoved"), AlertVariant.success);
                    roles.setData((list: any[]) => (list || []).filter(x => x.id !== r.id));
                } catch (e) {
                    addError(t("sxCommonRemoveError"), e);
                }
            }
        });

    return (
        <Section
            label={t("sxUserDetailAssignedRoles")}
            action={
                roles.status === "ready" && (
                    <TextAction onClick={() => setPicking(true)}>{t("sxUserDetailAssignRole")}</TextAction>
                )
            }
        >
            <ListState
                status={roles.status}
                count={realmRoles.length}
                onRetry={roles.reload}
                errorTitle={t("sxUserDetailRolesLoadError")}
                emptyTitle={t("sxUserDetailNoRoles")}
                emptyDescription={t("sxUserDetailNoRolesDescription")}
                emptyAction={
                    <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setPicking(true)}>
                        {t("sxUserDetailAssignRole")}
                    </Button>
                }
            >
                <Group>
                    {realmRoles.map(r => (
                        <Row
                            key={r.id}
                            title={r.name}
                            subtitle={r.description}
                            trailing={
                                <TextAction tone="danger" onClick={() => removeRole(r)}>
                                    {t("sxCommonRemove")}
                                </TextAction>
                            }
                        />
                    ))}
                </Group>
            </ListState>
            {picking && (
                <PickUserRoleModal
                    user={user}
                    onClose={() => setPicking(false)}
                    onAdded={() => {
                        setPicking(false);
                        roles.reload();
                    }}
                />
            )}
            {confirmNode}
        </Section>
    );
}

function PickUserRoleModal({ user, onClose, onAdded }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const available = useResource(
        () =>
            adminClient.users
                .listAvailableRealmRoleMappings({ id: user.id })
                .then((a: any) => (a || []).filter((r: any) => r.name !== "uma_authorization")),
        [adminClient, user.id]
    );
    const roles = available.data || [];
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    const toggle = (id: string) =>
        setSel(p => {
            const n = new Set(p);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });

    const save = async () => {
        const chosen = roles.filter(r => sel.has(r.id)).map(r => ({ id: r.id, name: r.name }));
        if (!chosen.length) return;
        setSaving(true);
        try {
            await adminClient.users.addRealmRoleMappings({ id: user.id, roles: chosen });
            addAlert(t("sxUserDetailRolesAssigned", { total: chosen.length }), AlertVariant.success);
            onAdded();
        } catch (e) {
            addError(t("sxUserDetailRolesAssignError"), e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxUserDetailAssignRole")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="max-h-[50svh] overflow-y-auto">
                        <ListState
                            status={available.status}
                            count={roles.length}
                            onRetry={available.reload}
                            errorTitle={t("sxUserDetailRolesLoadError")}
                            emptyTitle={t("sxUserDetailNoAssignableRoles")}
                            emptyDescription={t("sxUserDetailNoAssignableRolesDescription")}
                        >
                            <ul className={GROUP}>
                                {roles.map((r, i) => (
                                    <li key={r.id}>
                                        {i > 0 && <div className={SEPARATOR} />}
                                        <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-black/3 dark:hover:bg-white/4">
                                            <Checkbox checked={sel.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                                            <span className="min-w-0">
                                                <span className="block truncate text-base font-medium">{r.name}</span>
                                                {r.description && (
                                                    <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                                                        {r.description}
                                                    </span>
                                                )}
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </ListState>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button size="form" block disabled={saving || sel.size === 0} onClick={save}>
                        {saving ? t("sxUserDetailAssigning") : t("sxUserDetailAssignCount", { total: sel.size })}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function GroupsTab({ user }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const res = useResource(
        () =>
            Promise.all([
                adminClient.users.listGroups({ id: user.id }),
                adminClient.groups.find({ briefRepresentation: true })
            ]).then(([mine, every]) => ({ groups: asList(mine), all: asList(every) })),
        [adminClient, user.id]
    );
    const [add, setAdd] = useState("");
    const groups = res.data?.groups || [];
    const all = res.data?.all || [];
    const joinable = all.filter(g => !groups.some(m => m.id === g.id));

    const join = async () => {
        if (!add) return;
        try {
            await adminClient.users.addToGroup({ id: user.id, groupId: add });
            addAlert(t("sxUserDetailAddedToGroup"), AlertVariant.success);
            setAdd("");
            res.reload();
        } catch (e) {
            addError(t("sxUserDetailAddToGroupError"), e);
        }
    };
    const leave = (g: any) =>
        confirm({
            title: t("sxUserDetailLeaveGroup"),
            message: t("sxUserDetailLeaveGroupConfirm", { name: g.name }),
            confirmLabel: t("sxCommonRemoveFrom"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.delFromGroup({ id: user.id, groupId: g.id });
                    addAlert(t("sxUserDetailRemovedFromGroup"), AlertVariant.success);
                    res.setData((d: any) => ({ ...d, groups: (d?.groups || []).filter(x => x.id !== g.id) }));
                } catch (e) {
                    addError(t("sxUserDetailRemoveFromGroupError"), e);
                }
            }
        });

    if (res.status !== "ready")
        return (
            <Section label={t("sxUserDetailMemberships")}>
                {res.status === "loading" ? (
                    <ListSkeleton />
                ) : (
                    <Notice
                        title={t("sxUserDetailGroupsLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={res.reload}
                    />
                )}
            </Section>
        );

    return (
        <>
            <Section label={t("sxUserDetailMemberships")}>
                {groups.length === 0 ? (
                    <Notice title={t("sxUserDetailNoGroups")} description={t("sxUserDetailNoGroupsDescription")} />
                ) : (
                    <Group>
                        {groups.map(g => (
                            <Row
                                key={g.id}
                                title={<span className="font-mono text-[15px]">{g.path || g.name}</span>}
                                trailing={
                                    <TextAction tone="danger" onClick={() => leave(g)}>
                                        {t("sxCommonRemoveFrom")}
                                    </TextAction>
                                }
                            />
                        ))}
                    </Group>
                )}
            </Section>
            <Section label={t("sxUserDetailAddToGroup")}>
                {joinable.length === 0 ? (
                    <Notice
                        title={t("sxUserDetailNoJoinableGroups")}
                        description={
                            all.length === 0
                                ? t("sxUserDetailNoRealmGroupsDescription")
                                : t("sxUserDetailNoJoinableGroupsDescription")
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <NativeSelect
                            size="lg"
                            className="w-full sm:flex-1"
                            aria-label={t("sxUserDetailSelectGroup")}
                            value={add}
                            onChange={(e: any) => setAdd(e.target.value)}
                        >
                            <NativeSelectOption value="">{t("sxUserDetailSelectGroup")}</NativeSelectOption>
                            {joinable.map(g => (
                                <NativeSelectOption key={g.id} value={g.id}>
                                    {g.path || g.name}
                                </NativeSelectOption>
                            ))}
                        </NativeSelect>
                        <Button size="form" disabled={!add} onClick={join}>
                            {t("sxCommonAdd")}
                        </Button>
                    </div>
                )}
            </Section>
            {confirmNode}
        </>
    );
}

function SessionsTab({ user }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const res = useResource(
        () => adminClient.users.listSessions({ id: user.id }).then(asList),
        [adminClient, user.id]
    );
    const sessions = res.data || [];

    const signOut = async (s: any) => {
        try {
            await adminClient.realms.deleteSession({
                realm,
                session: s.id,
                isOffline: false
            });
            addAlert(t("sxUserDetailSessionSignedOut"), AlertVariant.success);
            res.setData((list: any[]) => (list || []).filter(x => x.id !== s.id));
        } catch (e) {
            addError(t("sxUserDetailSessionSignOutError"), e);
        }
    };

    return (
        <Section
            label={
                res.status === "ready"
                    ? t("sxUserDetailActiveSessionsCount", { total: sessions.length })
                    : t("sxUserDetailTabSessions")
            }
        >
            <ListState
                status={res.status}
                count={sessions.length}
                onRetry={res.reload}
                errorTitle={t("sxUserDetailSessionsLoadError")}
                emptyTitle={t("sxUserDetailNoSessions")}
                emptyDescription={t("sxUserDetailNoSessionsDescription")}
            >
                <Group>
                    {sessions.map(s => {
                        const clients = Object.values(s.clients || {});
                        return (
                            <Row
                                key={s.id}
                                title={<span className="tabular-nums">{s.ipAddress || "—"}</span>}
                                subtitle={
                                    <>
                                        {clients.join(", ") || "—"} · {formatRelative(s.lastAccess)}
                                    </>
                                }
                                trailing={
                                    <TextAction tone="danger" onClick={() => signOut(s)}>
                                        {t("sxUserDetailSignOutSession")}
                                    </TextAction>
                                }
                            />
                        );
                    })}
                </Group>
            </ListState>
        </Section>
    );
}

function ConsentsTab({ user }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const res = useResource(
        () => adminClient.users.listConsents({ id: user.id }).then(asList),
        [adminClient, user.id]
    );
    const consents = res.data || [];

    const revoke = (c: any) =>
        confirm({
            title: t("sxUserDetailRevokeConsent"),
            message: t("sxUserDetailRevokeConsentConfirm", { clientId: c.clientId }),
            confirmLabel: t("sxUserDetailRevoke"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.revokeConsent({
                        id: user.id,
                        clientId: c.clientId
                    });
                    addAlert(t("sxUserDetailConsentRevoked"), AlertVariant.success);
                    res.setData((list: any[]) => (list || []).filter(x => x.clientId !== c.clientId));
                } catch (e) {
                    addError(t("sxUserDetailConsentRevokeError"), e);
                }
            }
        });

    return (
        <Section label={t("sxUserDetailGrantedConsents")}>
            <ListState
                status={res.status}
                count={consents.length}
                onRetry={res.reload}
                errorTitle={t("sxUserDetailConsentsLoadError")}
                emptyTitle={t("sxUserDetailNoConsents")}
                emptyDescription={t("sxUserDetailNoConsentsDescription")}
            >
                <Group>
                    {consents.map(c => (
                        <Row
                            key={c.clientId}
                            title={c.clientId}
                            subtitle={(c.grantedClientScopes || []).join(", ") || "—"}
                            trailing={
                                <TextAction tone="danger" onClick={() => revoke(c)}>
                                    {t("sxUserDetailRevoke")}
                                </TextAction>
                            }
                        />
                    ))}
                </Group>
            </ListState>
            {confirmNode}
        </Section>
    );
}

function IdpTab({ user }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const res = useResource(
        () => adminClient.users.listFederatedIdentities({ id: user.id }).then(asList),
        [adminClient, user.id]
    );
    const links = res.data || [];

    const unlink = (l: any) =>
        confirm({
            title: t("sxUserDetailUnlinkIdp"),
            message: t("sxUserDetailUnlinkIdpConfirm", { name: l.identityProvider }),
            confirmLabel: t("sxCommonRemove"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.delFromFederatedIdentity({
                        id: user.id,
                        federatedIdentityId: l.identityProvider
                    });
                    addAlert(t("sxUserDetailIdpUnlinked"), AlertVariant.success);
                    res.setData((list: any[]) =>
                        (list || []).filter(x => x.identityProvider !== l.identityProvider)
                    );
                } catch (e) {
                    addError(t("sxCommonRemoveError"), e);
                }
            }
        });

    return (
        <Section label={t("sxUserDetailIdpLinks")}>
            <ListState
                status={res.status}
                count={links.length}
                onRetry={res.reload}
                errorTitle={t("sxUserDetailIdpLinksLoadError")}
                emptyTitle={t("sxUserDetailNoIdpLinks")}
                emptyDescription={t("sxUserDetailNoIdpLinksDescription")}
            >
                <Group>
                    {links.map(l => (
                        <Row
                            key={l.identityProvider}
                            leading={<Monogram name={l.identityProvider} />}
                            title={l.identityProvider}
                            subtitle={l.userName || l.userId}
                            trailing={
                                <TextAction tone="danger" onClick={() => unlink(l)}>
                                    {t("sxCommonRemove")}
                                </TextAction>
                            }
                        />
                    ))}
                </Group>
            </ListState>
            {confirmNode}
        </Section>
    );
}
