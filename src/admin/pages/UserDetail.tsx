// @ts-nocheck

import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
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
import { useCapabilities } from "../ui/capabilities";
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
import { CredentialsTab } from "./user/CredentialsTab";
import { EventsTab } from "./user/EventsTab";
import { IdpTab } from "./user/IdpTab";
import { ExecuteActionsModal, GroupPickerModal } from "./user/modals";
import { OrganizationsTab } from "./user/OrganizationsTab";
import {
    GroupedChips,
    ProfileFields,
    profileErrors,
    toFormValues,
    toRepresentation,
    visibleAttributes
} from "./user/profile";
import {
    DANGER_BUTTON,
    Footnote,
    ListState,
    RequiredActionsPicker,
    SaveBar,
    SwitchRow,
    asList,
    formatDate,
    formatRelative,
    useConfirm,
    useResource
} from "./user/shared";

const TABS = [
    { value: "general", label: "sxUserDetailTabGeneral" },
    { value: "attributes", label: "sxUserDetailTabAttributes" },
    { value: "credentials", label: "sxUserDetailTabCredentials" },
    { value: "roles", label: "sxUserDetailTabRoles" },
    { value: "groups", label: "sxUserDetailTabGroups" },
    { value: "organizations", label: "sxUserDetailXTabOrganizations" },
    { value: "sessions", label: "sxUserDetailTabSessions" },
    { value: "consents", label: "sxUserDetailTabConsents" },
    { value: "idp", label: "sxUserDetailTabIdp" },
    { value: "events", label: "sxUserDetailXTabEvents" }
];

function fallbackMetadata(t: any, editUsername: boolean) {
    return {
        attributes: [
            { name: "username", displayName: t("sxUserDetailUsername"), required: true, readOnly: !editUsername },
            { name: "email", displayName: t("sxUserDetailEmail") },
            { name: "firstName", displayName: t("sxCommonName") },
            { name: "lastName", displayName: t("sxUserDetailLastName") }
        ],
        groups: []
    };
}

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
    const { ready, realmRep: capRealm, isFeatureEnabled } = useCapabilities();
    const [hasOrganizations, setHasOrganizations] = useState(false);
    const res = useResource(async () => {
        const [userData, attack, unmanaged, upConfig, realmRep] = await Promise.all([
            adminClient.users.findOne({ id, userProfileMetadata: true }),
            adminClient.attackDetection.findOne({ id }).catch(() => null),
            adminClient.users.getUnmanagedAttributes({ id }).catch(() => null),
            adminClient.users.getProfile().catch(() => null),
            adminClient.realms.findOne({ realm }).catch(() => null)
        ]);
        if (!userData) return null;
        const { userProfileMetadata, ...user } = userData;
        return { user, metadata: userProfileMetadata, attack, unmanaged, upConfig, realmRep };
    }, [adminClient, id, realm]);
    const { status, data, reload } = res;
    const user = data?.user;

    const showOrganizations = ready && isFeatureEnabled("ORGANIZATION") && !!capRealm?.organizationsEnabled;

    useEffect(() => {
        if (!showOrganizations) return;
        let alive = true;
        adminClient.organizations
            .find({ first: 0, max: 1 })
            .then((list: any) => alive && setHasOrganizations(Array.isArray(list) && list.length > 0))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [adminClient, realm, showOrganizations]);

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
            const r = await adminClient.users.impersonation({ id }, { user: id, realm });
            if (r?.redirect) window.open(r.redirect, "_blank");
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
    const locked = !!data.realmRep?.bruteForceProtected && !!data.attack?.disabled;
    const tabs = TABS.filter(item => item.value !== "organizations" || (showOrganizations && hasOrganizations));
    const activeTab = tabs.some(item => item.value === tab) ? tab : "general";

    return (
        <AdminPage
            back={back}
            title={
                <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="[overflow-wrap:anywhere]">{user.username}</span>
                    {!user.enabled && <Chip tone="danger">{t("sxCommonDisabled")}</Chip>}
                    {locked && <Chip tone="warning">{t("sxUsersXTemporarilyLocked")}</Chip>}
                </span>
            }
            description={[fullName, user.email].filter(Boolean).join(" · ") || undefined}
            actions={
                <>
                    <Button variant="secondary" onClick={impersonate} disabled={user.access?.impersonate === false}>
                        {t("sxUserDetailImpersonate")}
                    </Button>
                    <Button variant="secondary" onClick={logout}>
                        {t("sxUserDetailSignOutSessions")}
                    </Button>
                </>
            }
        >
            <SegmentTabs
                value={activeTab}
                onChange={setTab}
                items={tabs.map(item => ({ value: item.value, label: t(item.label) }))}
                ariaLabel={t("sxUserDetailSections")}
            />
            {activeTab === "general" && <GeneralTab key={JSON.stringify(user)} data={data} reload={reload} onDelete={remove} />}
            {activeTab === "attributes" && <AttributesTab key={JSON.stringify(user.attributes)} data={data} reload={reload} />}
            {activeTab === "credentials" && <CredentialsTab user={user} />}
            {activeTab === "roles" && <RolesTab user={user} />}
            {activeTab === "groups" && <GroupsTab user={user} />}
            {activeTab === "organizations" && <OrganizationsTab user={user} />}
            {activeTab === "sessions" && <SessionsTab user={user} />}
            {activeTab === "consents" && <ConsentsTab user={user} />}
            {activeTab === "idp" && <IdpTab user={user} />}
            {activeTab === "events" && <EventsTab user={user} />}
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
    const meta = useResource(
        () =>
            Promise.all([
                adminClient.users.getProfileMetadata({ realm }).catch(() => null),
                adminClient.realms.findOne({ realm }).catch(() => null)
            ]).then(([metadata, realmRep]) => ({ metadata, realmRep })),
        [adminClient, realm]
    );
    const metadata = meta.data?.metadata?.attributes ? meta.data.metadata : fallbackMetadata(t, true);
    const [values, setValues] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [enabled, setEnabled] = useState(true);
    const [emailVerified, setEmailVerified] = useState(false);
    const [requiredActions, setRequiredActions] = useState<string[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [picking, setPicking] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (meta.status === "ready") setValues(toFormValues({}, metadata));
    }, [meta.status]);

    const setValue = (name: string, value: any) => {
        setValues(v => ({ ...v, [name]: value }));
        setErrors(e => {
            if (!e[name]) return e;
            const n = { ...e };
            delete n[name];
            return n;
        });
    };

    const needsUsername = visibleAttributes(metadata, true).some((a: any) => a.name === "username");
    const canCreate = !needsUsername || String(values.username ?? "").trim() !== "";

    const create = async () => {
        if (!canCreate) return;
        setSaving(true);
        setErrors({});
        try {
            const rep = toRepresentation(values, metadata, {});
            const c = await adminClient.users.create({
                ...rep,
                enabled: !!enabled,
                emailVerified: !!emailVerified,
                requiredActions,
                groups: groups.map(g => g.path).filter(Boolean)
            });
            addAlert(t("sxUserDetailCreated"), AlertVariant.success);
            if (c?.id) navigate(`/${realm}/users/${c.id}`);
        } catch (e) {
            const fieldErrors = profileErrors(e, t);
            if (fieldErrors) {
                setErrors(fieldErrors);
                addAlert(t("sxUserDetailXFixErrors"), AlertVariant.danger);
            } else addError(t("sxUserDetailCreateError"), e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminPage title={t("sxUsersNew")} back={{ label: t("sxUsersTitle"), to: `/${realm}/users` }}>
            {meta.status === "loading" ? (
                <ListSkeleton rows={4} />
            ) : (
                <>
                    <ProfileFields
                        idPrefix="new"
                        metadata={metadata}
                        values={values}
                        onChange={setValue}
                        errors={errors}
                        hideReadOnly
                        supportedLocales={meta.data?.realmRep?.internationalizationEnabled ? meta.data?.realmRep?.supportedLocales : []}
                    />
                    <Section label={t("sxUserDetailStatus")}>
                        <Group>
                            <SwitchRow key="enabled" label={t("sxCommonEnabled")} checked={enabled} onChange={setEnabled} />
                            <SwitchRow
                                key="emailVerified"
                                label={t("sxUserDetailEmailVerified")}
                                checked={emailVerified}
                                onChange={setEmailVerified}
                            />
                        </Group>
                    </Section>
                    <Section label={t("sxUserDetailXRequiredActions")}>
                        <RequiredActionsPicker value={requiredActions} onChange={setRequiredActions} />
                        <Footnote>{t("sxUserDetailXRequiredActionsHint")}</Footnote>
                    </Section>
                    <Section
                        label={t("sxUserDetailTabGroups")}
                        action={groups.length > 0 && <TextAction onClick={() => setPicking(true)}>{t("sxUserDetailXJoinGroups")}</TextAction>}
                    >
                        {groups.length === 0 ? (
                            <Notice
                                title={t("sxUserDetailXNoGroupsSelected")}
                                description={t("sxUserDetailXNoGroupsSelectedDescription")}
                                action={
                                    <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setPicking(true)}>
                                        {t("sxUserDetailXJoinGroups")}
                                    </Button>
                                }
                            />
                        ) : (
                            <GroupedChips items={groups} onRemove={g => setGroups(list => list.filter(x => x.id !== g.id))} />
                        )}
                    </Section>
                    <SaveBar>
                        <Button size="form" variant="plain" onClick={() => navigate(`/${realm}/users`)}>
                            {t("sxCommonCancel")}
                        </Button>
                        <Button size="form" disabled={saving || !canCreate} onClick={create}>
                            {saving ? t("sxCommonCreating") : t("sxCommonCreate")}
                        </Button>
                    </SaveBar>
                </>
            )}
            {picking && (
                <GroupPickerModal
                    exclude={groups}
                    onClose={() => setPicking(false)}
                    onPick={picked => {
                        setGroups(list => [...list, ...picked.filter(p => !list.some(x => x.id === p.id))]);
                        setPicking(false);
                    }}
                />
            )}
        </AdminPage>
    );
}

function GeneralTab({ data, reload, onDelete }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const { user, attack, realmRep } = data;
    const metadata = data.metadata?.attributes
        ? data.metadata
        : fallbackMetadata(t, realmRep?.editUsernameAllowed !== false);
    const initial = () => ({
        values: toFormValues(user, metadata),
        enabled: !!user.enabled,
        emailVerified: !!user.emailVerified,
        requiredActions: user.requiredActions || []
    });
    const [f, setF] = useState(initial);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [actionsOpen, setActionsOpen] = useState(false);
    const [sendingVerify, setSendingVerify] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const canManage = user.access?.manage !== false;
    const allReadOnly = (metadata.attributes || []).every((a: any) => a.readOnly);
    const pendingRaw = user.attributes?.["kc.email.pending"];
    const pendingEmail = (Array.isArray(pendingRaw) ? pendingRaw[0] : pendingRaw) || "";
    const bruteForce = !!realmRep?.bruteForceProtected;
    const locked = bruteForce && !!attack?.disabled;

    const setValue = (name: string, value: any) => {
        setF(p => ({ ...p, values: { ...p.values, [name]: value } }));
        setErrors(e => {
            if (!e[name]) return e;
            const n = { ...e };
            delete n[name];
            return n;
        });
    };

    const persist = async (overrides: any, successMessage: string) => {
        const base = toRepresentation(f.values, metadata, user);
        const rep = {
            ...base,
            enabled: f.enabled,
            emailVerified: f.emailVerified,
            requiredActions: f.requiredActions,
            ...overrides,
            attributes: { ...base.attributes, ...(overrides.attributes || {}) }
        };
        await adminClient.users.update({ id: user.id }, rep);
        addAlert(successMessage, AlertVariant.success);
        reload();
    };

    const save = async () => {
        setSaving(true);
        setErrors({});
        try {
            await persist({}, t("sxCommonSaved"));
        } catch (e) {
            const fieldErrors = profileErrors(e, t);
            if (fieldErrors) {
                setErrors(fieldErrors);
                addAlert(t("sxUserDetailXFixErrors"), AlertVariant.danger);
            } else addError(t("sxCommonSaveError"), e);
        } finally {
            setSaving(false);
        }
    };

    const cancelPendingEmail = () =>
        confirm({
            title: t("sxUserDetailXCancelEmailChange"),
            message: t("sxUserDetailXCancelEmailChangeConfirm", { email: pendingEmail }),
            confirmLabel: t("sxCommonConfirm"),
            onConfirm: async () => {
                try {
                    await persist(
                        {
                            requiredActions: (user.requiredActions || []).filter((a: string) => a !== "UPDATE_EMAIL"),
                            attributes: { "kc.email.pending": [] }
                        },
                        t("sxUserDetailXEmailChangeCancelled")
                    );
                } catch (e) {
                    addError(t("sxCommonSaveError"), e);
                }
            }
        });

    const sendVerify = async () => {
        setSendingVerify(true);
        try {
            await adminClient.users.sendVerifyEmail({ id: user.id });
            addAlert(t("sxUserDetailXVerifyEmailSent"), AlertVariant.success);
        } catch (e) {
            addError(t("sxUserDetailXVerifyEmailError"), e);
        } finally {
            setSendingVerify(false);
        }
    };

    const unlock = async () => {
        setUnlocking(true);
        try {
            await adminClient.attackDetection.del({ id: user.id });
            addAlert(t("sxUserDetailXUnlocked"), AlertVariant.success);
            reload();
        } catch (e) {
            addError(t("sxUsersXUnlockError"), e);
        } finally {
            setUnlocking(false);
        }
    };

    return (
        <>
            <ProfileFields
                idPrefix="user"
                metadata={metadata}
                values={f.values}
                onChange={setValue}
                errors={errors}
                disabled={!canManage}
                supportedLocales={realmRep?.internationalizationEnabled ? realmRep?.supportedLocales : []}
            />
            {pendingEmail && (
                <Notice
                    title={t("sxUserDetailXPendingEmailTitle")}
                    description={t("sxUserDetailXPendingEmailDescription", { email: pendingEmail })}
                    action={
                        canManage && (
                            <Button size="sm" variant="plain" onClick={cancelPendingEmail}>
                                {t("sxUserDetailXCancelEmailChange")}
                            </Button>
                        )
                    }
                />
            )}
            <Section label={t("sxUserDetailStatus")}>
                <Group>
                    <SwitchRow
                        key="enabled"
                        label={t("sxCommonEnabled")}
                        checked={f.enabled}
                        disabled={!canManage}
                        onChange={(v: boolean) => setF(p => ({ ...p, enabled: v }))}
                    />
                    <SwitchRow
                        key="emailVerified"
                        label={t("sxUserDetailEmailVerified")}
                        checked={f.emailVerified}
                        disabled={!canManage}
                        onChange={(v: boolean) => setF(p => ({ ...p, emailVerified: v }))}
                    />
                </Group>
                <Footnote>{t("sxUserDetailCreatedAt", { date: formatDate(user.createdTimestamp) })}</Footnote>
            </Section>
            {bruteForce && (
                <Section label={t("sxUserDetailXSignInProtection")}>
                    <Group>
                        <Row
                            key="lock"
                            title={locked ? t("sxUsersXTemporarilyLocked") : t("sxUserDetailXNotLocked")}
                            subtitle={
                                attack?.numFailures
                                    ? t("sxUserDetailXFailedAttempts", {
                                          total: attack.numFailures,
                                          time: formatRelative(attack.lastFailure),
                                          ip: attack.lastIPFailure || "—"
                                      })
                                    : t("sxUserDetailXNoFailedAttempts")
                            }
                            trailing={
                                locked ? (
                                    <TextAction disabled={unlocking || !canManage} onClick={unlock}>
                                        {t("sxUsersXUnlock")}
                                    </TextAction>
                                ) : undefined
                            }
                        />
                    </Group>
                </Section>
            )}
            <Section label={t("sxUserDetailXRequiredActions")}>
                <RequiredActionsPicker
                    disabled={!canManage}
                    value={f.requiredActions}
                    onChange={v => setF(p => ({ ...p, requiredActions: v }))}
                />
                <Footnote>{t("sxUserDetailXRequiredActionsHint")}</Footnote>
            </Section>
            <SaveBar>
                <Button
                    size="form"
                    variant="plain"
                    disabled={saving}
                    onClick={() => {
                        setF(initial());
                        setErrors({});
                    }}
                >
                    {t("sxUserDetailXRevert")}
                </Button>
                <Button size="form" disabled={saving || !canManage || (allReadOnly && !!data.metadata?.attributes)} onClick={save}>
                    {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                </Button>
            </SaveBar>
            <Section label={t("sxUserDetailXEmails")}>
                <Group>
                    <Row
                        key="verify"
                        title={t("sxUserDetailXSendVerifyEmail")}
                        subtitle={user.email ? t("sxUserDetailXSendVerifyEmailHint") : t("sxUserDetailXNoEmailHint")}
                        trailing={
                            <TextAction disabled={!user.email || sendingVerify} onClick={sendVerify}>
                                {sendingVerify ? t("sxUserDetailXSending") : t("sxUserDetailXSend")}
                            </TextAction>
                        }
                    />
                    <Row
                        key="actions"
                        title={t("sxUserDetailXActionsEmailTitle")}
                        subtitle={user.email ? t("sxUserDetailXActionsEmailHint") : t("sxUserDetailXNoEmailHint")}
                        trailing={
                            <TextAction disabled={!user.email} onClick={() => setActionsOpen(true)}>
                                {t("sxUserDetailXSend")}
                            </TextAction>
                        }
                    />
                </Group>
            </Section>
            <section className="border-t border-[#e5e5ea] pt-6 dark:border-[#38383a]">
                <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">
                    {t("sxUserDetailDeleteConfirm", { username: user.username })}
                </p>
                <Button size="form" className={DANGER_BUTTON} onClick={onDelete} disabled={!canManage}>
                    {t("sxUserDetailDelete")}
                </Button>
            </section>
            {actionsOpen && <ExecuteActionsModal userId={user.id} onClose={() => setActionsOpen(false)} />}
            {confirmNode}
        </>
    );
}

function AttributeEditor({ rows, setRows, readOnly }: { rows: any[]; setRows: (rows: any[]) => void; readOnly?: boolean }) {
    const t = useT();
    const setRow = (i: number, field: string, val: string) =>
        setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
    if (rows.length === 0)
        return (
            <Notice
                title={t("sxUserDetailNoAttributes")}
                description={t("sxUserDetailNoAttributesDescription")}
                action={
                    !readOnly && (
                        <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setRows([{ k: "", v: "" }])}>
                            {t("sxOrgDetailAddAttribute")}
                        </Button>
                    )
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
                            readOnly={readOnly}
                            onChange={(e: any) => setRow(i, "k", e.target.value)}
                            placeholder={t("sxCommonKeyPlaceholder")}
                        />
                        <Input
                            className="sm:flex-1"
                            aria-label={t("sxCommonValue")}
                            value={r.v}
                            readOnly={readOnly}
                            onChange={(e: any) => setRow(i, "v", e.target.value)}
                            placeholder={t("sxOrgDetailValuePlaceholder")}
                        />
                        {!readOnly && (
                            <TextAction
                                tone="danger"
                                className="self-end sm:self-auto"
                                onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                            >
                                {t("sxCommonDelete")}
                            </TextAction>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function AttributesTab({ data, reload }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const { user, unmanaged, upConfig } = data;
    const profileKnown = !!upConfig;
    const policy = upConfig?.unmanagedAttributePolicy;
    const managedOnly = profileKnown && !policy;
    const readOnly = policy === "ADMIN_VIEW";
    const source = profileKnown ? unmanaged || {} : user.attributes || {};
    const toRows = (attrs: any) =>
        Object.entries(attrs || {}).map(([k, v]: any) => ({
            k,
            v: Array.isArray(v) ? v.join(", ") : String(v)
        }));
    const [rows, setRows] = useState<any[]>(toRows(source));
    const [saving, setSaving] = useState(false);

    if (managedOnly)
        return (
            <Notice
                title={t("sxUserDetailXUnmanagedOffTitle")}
                description={t("sxUserDetailXUnmanagedOffDescription")}
            />
        );

    const save = async () => {
        setSaving(true);
        try {
            const edited: any = {};
            rows.forEach(r => {
                const key = r.k.trim();
                if (key)
                    edited[key] = String(r.v)
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean);
            });
            const managed = Object.fromEntries(
                Object.entries(user.attributes || {}).filter(([k]) => !Object.hasOwn(source, k))
            );
            const attributes = profileKnown ? { ...managed, ...edited } : edited;
            await adminClient.users.update({ id: user.id }, { ...user, attributes });
            addAlert(t("sxOrgDetailAttributesSaved"), AlertVariant.success);
            reload();
        } catch (e) {
            const fieldErrors = profileErrors(e, t);
            if (fieldErrors) addAlert(Object.values(fieldErrors).join(" "), AlertVariant.danger);
            else addError(t("sxCommonSaveError"), e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Section
                label={profileKnown ? t("sxUserDetailXUnmanagedAttributes") : t("sxUserDetailTabAttributes")}
                action={
                    !readOnly && (
                        <TextAction onClick={() => setRows([...rows, { k: "", v: "" }])}>
                            {t("sxOrgDetailAddAttribute")}
                        </TextAction>
                    )
                }
            >
                <AttributeEditor rows={rows} setRows={setRows} readOnly={readOnly} />
                {profileKnown && <Footnote>{t("sxUserDetailXUnmanagedAttributesHint")}</Footnote>}
            </Section>
            {!readOnly && (
                <SaveBar>
                    <Button size="form" disabled={saving} onClick={save}>
                        {saving ? t("sxCommonSaving") : t("sxCommonSave")}
                    </Button>
                </SaveBar>
            )}
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
