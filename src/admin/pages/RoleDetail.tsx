// @ts-nocheck

import { PlusIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Field, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { Spinner } from "@ui/components/spinner";
import { Textarea } from "@ui/components/textarea";
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
import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import {
    AdminPage,
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
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";

const TABS = [
    { value: "details", label: "sxRoleDetailTabDetails" },
    { value: "attributes", label: "sxRoleDetailTabAttributes" },
    { value: "composite", label: "sxRoleDetailTabComposite" },
    { value: "users", label: "sxRoleDetailTabUsers" }
];

function isNotFound(e: any) {
    return e?.response?.status === 404;
}

const DANGER_BTN = "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";

function ConfirmDialog({ opts, onClose }: any) {
    const t = useT();
    return (
        <Confirm open={!!opts} onOpenChange={o => !o && onClose()}>
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{opts?.title}</ConfirmTitle>
                    {opts?.message && <ConfirmDescription>{opts.message}</ConfirmDescription>}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>{t("sxRoleDetailCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = opts?.onConfirm;
                            onClose();
                            fn?.();
                        }}
                    >
                        {opts?.confirmLabel ?? t("sxRoleDetailConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
}

export default function RoleDetail() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { id } = useParams();
    const navigate = useNavigate();
    const { addError } = useAlerts();

    const isNew = id === "new";
    const [status, setStatus] = useState<"loading" | "error" | "ready">(isNew ? "ready" : "loading");
    const [attempt, setAttempt] = useState(0);
    const [role, setRole] = useState<any>(null);
    const [tab, setTab] = useState("details");

    const fetchRole = () =>
        adminClient.roles.findOneByName({ name: id }).catch(e => {
            if (isNotFound(e)) return null;
            throw e;
        });

    const reload = async () => {
        try {
            setRole(await fetchRole());
        } catch (e) {
            addError(t("sxRoleDetailReloadError"), e);
        }
    };

    useEffect(() => {
        if (isNew) {
            setStatus("ready");
            return;
        }
        let alive = true;
        setStatus("loading");
        fetchRole()
            .then(found => {
                if (!alive) return;
                setRole(found ?? null);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, id, isNew, attempt]);

    const back = { label: t("sxNavRealmRoles"), to: `/${realm}/roles` };

    if (isNew) return <NewRole />;
    if (status === "loading")
        return (
            <AdminPage title={t("sxRoleDetailTitle")} back={back} width="narrow">
                <ListSkeleton rows={3} />
            </AdminPage>
        );
    if (status === "error")
        return (
            <AdminPage title={t("sxRoleDetailTitle")} back={back} width="narrow">
                <Notice
                    title={t("sxRoleDetailLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            </AdminPage>
        );
    if (!role?.id)
        return (
            <AdminPage title={t("sxRoleDetailNotFoundTitle")} back={back} width="narrow">
                <Notice
                    title={t("sxRoleDetailNotFoundTitle")}
                    description={t("sxRoleDetailNotFoundDescription")}
                    action={
                        <Button asChild>
                            <Link to={back.to}>{t("sxRoleDetailBackToRoles")}</Link>
                        </Button>
                    }
                />
            </AdminPage>
        );

    return (
        <AdminPage
            title={role.name}
            description={role.composite ? t("sxRoleDetailCompositeRealmRole") : t("sxRoleDetailRealmRole")}
            back={back}
            width="narrow"
        >
            <SegmentTabs
                ariaLabel={t("sxRoleDetailSections")}
                value={tab}
                onChange={setTab}
                items={TABS.map(item => ({ value: item.value, label: t(item.label) }))}
            />

            {tab === "details" && (
                <DetailsTab
                    role={role}
                    reload={reload}
                    onDeleted={() => navigate(`/${realm}/roles`)}
                    onRenamed={n => navigate(`/${realm}/roles/${encodeURIComponent(n)}`)}
                />
            )}
            {tab === "attributes" && <AttributesTab role={role} reload={reload} />}
            {tab === "composite" && <CompositeTab role={role} reload={reload} />}
            {tab === "users" && <UsersTab role={role} />}
        </AdminPage>
    );
}

function NewRole() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    const create = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await adminClient.roles.create({
                name: name.trim(),
                description: description.trim() || undefined
            });
            addAlert(t("sxRoleDetailCreated"), AlertVariant.success);
            navigate(`/${realm}/roles/${encodeURIComponent(name.trim())}`);
        } catch (e) {
            addError(t("sxRoleDetailCreateError"), e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminPage
            title={t("sxRoleDetailNewTitle")}
            description={t("sxRoleDetailNewDescription")}
            back={{ label: t("sxNavRealmRoles"), to: `/${realm}/roles` }}
            width="narrow"
        >
            <form
                onSubmit={e => {
                    e.preventDefault();
                    create();
                }}
            >
                <div className="flex flex-col gap-4">
                    <Field size="lg">
                        <FieldLabel htmlFor="role-name">{t("sxRoleDetailName")}</FieldLabel>
                        <Input
                            id="role-name"
                            size="lg"
                            autoFocus
                            value={name}
                            onChange={(e: any) => setName(e.target.value)}
                            placeholder={t("sxRoleDetailNamePlaceholder")}
                        />
                    </Field>
                    <Field size="lg">
                        <FieldLabel htmlFor="role-description">{t("sxRoleDetailDescription")}</FieldLabel>
                        <Textarea
                            id="role-description"
                            rows={2}
                            value={description}
                            onChange={(e: any) => setDescription(e.target.value)}
                            placeholder={t("sxRoleDetailOptional")}
                        />
                    </Field>
                </div>
                <div className="mt-7 flex flex-col gap-1.5">
                    <Button type="submit" size="form" block disabled={saving || !name.trim()}>
                        {saving ? t("sxRoleDetailCreating") : t("sxRoleDetailCreate")}
                    </Button>
                    <Button type="button" variant="plain" size="form" block onClick={() => navigate(`/${realm}/roles`)}>
                        {t("sxRoleDetailCancel")}
                    </Button>
                </div>
            </form>
        </AdminPage>
    );
}

function DetailsTab({ role, reload, onDeleted, onRenamed }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [name, setName] = useState(role.name || "");
    const [description, setDescription] = useState(role.description || "");
    const [saving, setSaving] = useState(false);
    const dirty = name !== (role.name || "") || description !== (role.description || "");

    const save = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await adminClient.roles.updateById(
                { id: role.id },
                {
                    ...role,
                    name: name.trim(),
                    description: description.trim() || undefined
                }
            );
            addAlert(t("sxRoleDetailSaved"), AlertVariant.success);
            if (name.trim() !== role.name) onRenamed(name.trim());
            else reload();
        } catch (e) {
            addError(t("sxRoleDetailSaveError"), e);
        } finally {
            setSaving(false);
        }
    };

    const remove = () =>
        confirm({
            title: t("sxRoleDetailDeleteRole"),
            message: t("sxRoleDetailDeleteMessage", { name: role.name }),
            confirmLabel: t("sxRoleDetailDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.roles.delById({ id: role.id });
                    addAlert(t("sxRoleDetailDeleted"), AlertVariant.success);
                    onDeleted();
                } catch (e) {
                    addError(t("sxRoleDetailDeleteError"), e);
                }
            }
        });

    return (
        <div>
            <form
                onSubmit={e => {
                    e.preventDefault();
                    save();
                }}
            >
                <div className="flex flex-col gap-4">
                    <Field size="lg">
                        <FieldLabel htmlFor="role-name">{t("sxRoleDetailName")}</FieldLabel>
                        <Input id="role-name" size="lg" value={name} onChange={(e: any) => setName(e.target.value)} />
                    </Field>
                    <Field size="lg">
                        <FieldLabel htmlFor="role-description">{t("sxRoleDetailDescription")}</FieldLabel>
                        <Textarea
                            id="role-description"
                            rows={2}
                            value={description}
                            onChange={(e: any) => setDescription(e.target.value)}
                            placeholder={t("sxRoleDetailOptional")}
                        />
                    </Field>
                    <Field size="lg">
                        <FieldLabel>{t("sxRoleDetailId")}</FieldLabel>
                        <p className="ps-0.5 font-mono text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                            {role.id}
                        </p>
                    </Field>
                </div>
                <div className="mt-7 flex flex-col gap-1.5">
                    <Button type="submit" size="form" block disabled={saving || !name.trim() || !dirty}>
                        {saving ? t("sxRoleDetailSaving") : t("sxRoleDetailSave")}
                    </Button>
                    <Button
                        type="button"
                        variant="plain"
                        size="form"
                        block
                        disabled={saving || !dirty}
                        onClick={() => {
                            setName(role.name || "");
                            setDescription(role.description || "");
                        }}
                    >
                        {t("sxRoleDetailCancel")}
                    </Button>
                </div>
            </form>
            <section className="mt-7 border-t border-border pt-6">
                <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">
                    {t("sxRoleDetailDeleteHint")}
                </p>
                <Button type="button" size="form" block className={DANGER_BTN} onClick={remove}>
                    {t("sxRoleDetailDeleteRole")}
                </Button>
            </section>
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </div>
    );
}

function AttributesTab({ role, reload }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const toRows = (attrs: any) =>
        Object.entries(attrs || {}).map(([k, v]: any) => ({
            k,
            v: Array.isArray(v) ? v.join(", ") : String(v)
        }));
    const [rows, setRows] = useState<any[]>(toRows(role.attributes));
    const [saving, setSaving] = useState(false);

    const setRow = (i: number, field: string, val: string) =>
        setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));

    const addRow = () => setRows(prev => [...prev, { k: "", v: "" }]);

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
            await adminClient.roles.updateById({ id: role.id }, { ...role, attributes });
            addAlert(t("sxRoleDetailAttributesSaved"), AlertVariant.success);
            reload();
        } catch (e) {
            addError(t("sxRoleDetailAttributesSaveError"), e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <Section
                label={t("sxRoleDetailTabAttributes")}
                action={
                    <TextAction onClick={addRow}>
                        <span className="inline-flex items-center gap-1">
                            <PlusIcon className="size-3.5" weight="bold" /> {t("sxRoleDetailAddAttribute")}
                        </span>
                    </TextAction>
                }
            >
                {rows.length === 0 ? (
                    <Notice
                        title={t("sxRoleDetailNoAttributesTitle")}
                        description={t("sxRoleDetailNoAttributesDescription")}
                        action={<Button onClick={addRow}>{t("sxRoleDetailAddAttribute")}</Button>}
                    />
                ) : (
                    <ul className={GROUP}>
                        {rows.map((r, i) => (
                            <Fragment key={i}>
                                {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                <li className="flex items-center gap-2 px-4 py-3">
                                    <Input
                                        size="md"
                                        value={r.k}
                                        onChange={(e: any) => setRow(i, "k", e.target.value)}
                                        placeholder={t("sxRoleDetailKeyPlaceholder")}
                                        aria-label={t("sxRoleDetailKey")}
                                        className="w-2/5 min-w-0 font-medium"
                                    />
                                    <Input
                                        size="md"
                                        value={r.v}
                                        onChange={(e: any) => setRow(i, "v", e.target.value)}
                                        placeholder={t("sxRoleDetailValuePlaceholder")}
                                        aria-label={t("sxRoleDetailValue")}
                                        className="min-w-0 flex-1"
                                    />
                                    <TextAction
                                        tone="danger"
                                        aria-label={t("sxRoleDetailDelete")}
                                        onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))}
                                    >
                                        {t("sxRoleDetailDelete")}
                                    </TextAction>
                                </li>
                            </Fragment>
                        ))}
                    </ul>
                )}
            </Section>
            <div className="mt-7 flex flex-col gap-1.5">
                <Button type="button" size="form" block disabled={saving} onClick={save}>
                    {saving ? t("sxRoleDetailSaving") : t("sxRoleDetailSave")}
                </Button>
                <Button
                    type="button"
                    variant="plain"
                    size="form"
                    block
                    disabled={saving}
                    onClick={() => setRows(toRows(role.attributes))}
                >
                    {t("sxRoleDetailCancel")}
                </Button>
            </div>
        </div>
    );
}

function CompositeTab({ role, reload }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [composites, setComposites] = useState<any[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [picking, setPicking] = useState(false);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.roles
            .getCompositeRoles({ id: role.id })
            .then(c => {
                if (!alive) return;
                setComposites(Array.isArray(c) ? c : []);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, role.id, attempt]);

    const removeComposite = (r: any) =>
        confirm({
            title: t("sxRoleDetailRemoveCompositeTitle"),
            message: t("sxRoleDetailRemoveCompositeMessage", { name: r.name }),
            confirmLabel: t("sxRoleDetailRemove"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.roles.delCompositeRoles({ id: role.id }, [r]);
                    addAlert(t("sxRoleDetailCompositeRemoved"), AlertVariant.success);
                    setComposites(prev => prev.filter(x => x.id !== r.id));
                    reload();
                } catch (e) {
                    addError(t("sxRoleDetailCompositeRemoveError"), e);
                }
            }
        });

    return (
        <Section
            label={t("sxRoleDetailIncludedRoles")}
            action={
                status === "ready" && (
                    <TextAction onClick={() => setPicking(true)}>
                        <span className="inline-flex items-center gap-1">
                            <PlusIcon className="size-3.5" weight="bold" /> {t("sxRoleDetailAddRole")}
                        </span>
                    </TextAction>
                )
            }
        >
            {status === "loading" && <ListSkeleton />}
            {status === "error" && (
                <Notice
                    title={t("sxRoleDetailCompositesLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            )}
            {status === "ready" &&
                (composites.length === 0 ? (
                    <Notice
                        title={t("sxRoleDetailNoCompositesTitle")}
                        description={t("sxRoleDetailNoCompositesDescription")}
                        action={<Button onClick={() => setPicking(true)}>{t("sxRoleDetailAddRole")}</Button>}
                    />
                ) : (
                    <Group>
                        {composites.map(r => (
                            <Row
                                key={r.id}
                                leading={
                                    <span className="grid size-8 place-items-center rounded-lg bg-[#e5e5ea] dark:bg-[#2c2c2e]">
                                        <ShieldCheckIcon className="size-4.5" />
                                    </span>
                                }
                                title={r.name}
                                subtitle={r.clientRole ? t("sxRoleDetailClientRole") : undefined}
                                trailing={
                                    <TextAction tone="danger" onClick={() => removeComposite(r)}>
                                        {t("sxRoleDetailRemove")}
                                    </TextAction>
                                }
                            />
                        ))}
                    </Group>
                ))}
            {status === "ready" && (
                <p className="mt-2 px-0.5 text-[13px] text-muted-foreground">
                    {t("sxRoleDetailCompositeHint")}
                </p>
            )}
            {picking && (
                <PickCompositeModal
                    role={role}
                    existing={new Set(composites.map(r => r.id))}
                    onClose={() => setPicking(false)}
                    onAdded={() => {
                        setPicking(false);
                        setAttempt(n => n + 1);
                        reload();
                    }}
                />
            )}
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </Section>
    );
}

function PickCompositeModal({ role, existing, onClose, onAdded }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [roles, setRoles] = useState<any[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const existingRef = useRef(existing);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        (async () => {
            try {
                const all = await adminClient.roles.find({ max: 1000 });
                if (!alive) return;
                setRoles((all || []).filter((r: any) => r.id !== role.id && !existingRef.current.has(r.id)));
                setStatus("ready");
            } catch {
                if (alive) setStatus("error");
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, role.id, attempt]);

    const toggle = (id: string) =>
        setSel(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });

    const save = async () => {
        const chosen = roles.filter(r => sel.has(r.id));
        if (chosen.length === 0) return;
        setSaving(true);
        try {
            await adminClient.roles.createComposite({ roleId: role.id }, chosen);
            addAlert(t("sxRoleDetailRolesAdded", { total: chosen.length }), AlertVariant.success);
            onAdded();
        } catch (e) {
            addError(t("sxRoleDetailRolesAddError"), e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxRoleDetailAddCompositeTitle")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {status === "loading" ? (
                        <ListSkeleton />
                    ) : status === "error" ? (
                        <Notice
                            title={t("sxRoleDetailRolesLoadError")}
                            description={t("sxLoadErrorDescription")}
                            onRetry={() => setAttempt(n => n + 1)}
                        />
                    ) : roles.length === 0 ? (
                        <Notice
                            title={t("sxRoleDetailNoAvailableRolesTitle")}
                            description={t("sxRoleDetailNoAvailableRolesDescription")}
                        />
                    ) : (
                        <ul className={GROUP}>
                            {roles.map((r, i) => (
                                <Fragment key={r.id}>
                                    {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                    <li>
                                        <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-black/3 dark:hover:bg-white/4">
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
                                </Fragment>
                            ))}
                        </ul>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving || sel.size === 0} onClick={save}>
                        {saving ? t("sxRoleDetailAdding") : t("sxRoleDetailAddCount", { total: sel.size })}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function UsersTab({ role }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addError } = useAlerts();
    const [users, setUsers] = useState<any[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [more, setMore] = useState(false);
    const usersRef = useRef(users);
    usersRef.current = users;

    const fetchPage = (first: number) => adminClient.roles.findUsersWithRole({ name: role.name, first, max: 50 });

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        fetchPage(0)
            .then(u => {
                if (!alive) return;
                const list = Array.isArray(u) ? u : [];
                setUsers(list);
                setMore(list.length === 50);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, role.name, attempt]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const u = await fetchPage(usersRef.current.length);
            const list = Array.isArray(u) ? u : [];
            setUsers(prev => [...prev, ...list]);
            setMore(list.length === 50);
        } catch (e) {
            addError(t("sxRoleDetailUsersLoadMoreError"), e);
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <Section
            label={
                status === "ready"
                    ? t("sxRoleDetailUsersCount", { total: `${users.length}${more ? "+" : ""}` })
                    : t("sxRoleDetailTabUsers")
            }
        >
            {status === "loading" && <ListSkeleton />}
            {status === "error" && (
                <Notice
                    title={t("sxRoleDetailUsersLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            )}
            {status === "ready" &&
                (users.length === 0 ? (
                    <Notice title={t("sxRoleDetailNoUsersTitle")} description={t("sxRoleDetailNoUsersDescription")} />
                ) : (
                    <>
                        <Group>
                            {users.map(u => (
                                <Row
                                    key={u.id}
                                    leading={
                                        <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-[11px] font-semibold text-white dark:bg-[#48484a]">
                                            {initials(u.username)}
                                        </span>
                                    }
                                    title={u.username}
                                    subtitle={u.email || "—"}
                                />
                            ))}
                        </Group>
                        {more && (
                            <div className="mt-3 flex justify-center">
                                <Button type="button" variant="plain" onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore && <Spinner data-icon="inline-start" />}
                                    {t("sxRoleDetailLoadMore")}
                                </Button>
                            </div>
                        )}
                    </>
                ))}
        </Section>
    );
}
