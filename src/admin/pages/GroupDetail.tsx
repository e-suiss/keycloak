// @ts-nocheck

import { PlusIcon, UserPlusIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Field, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
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
    SearchField,
    Section,
    SegmentTabs,
    TextAction
} from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";
import { PermissionsPanel, useFineGrainedV1 } from "./groups/PermissionsPanel";
import { RoleMappingPanel } from "./groups/RoleMappingPanel";

const DANGER_BTN = "bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90";

function Monogram({ name }: { name: string }) {
    return (
        <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-[11px] font-semibold text-white dark:bg-[#48484a]">
            {initials(name)}
        </span>
    );
}

function IconTile({ children }: any) {
    return (
        <span className="grid size-8 place-items-center rounded-lg bg-[#e5e5ea] dark:bg-[#2c2c2e] [&_svg]:size-4.5">
            {children}
        </span>
    );
}

function AddLabel({ icon, children }: any) {
    return (
        <span className="inline-flex items-center gap-1 [&_svg]:size-3.5">
            {icon}
            {children}
        </span>
    );
}

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
                    <ConfirmCancel>{t("sxGroupDetailCancel")}</ConfirmCancel>
                    <ConfirmAction
                        variant={opts?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = opts?.onConfirm;
                            onClose();
                            fn?.();
                        }}
                    >
                        {opts?.confirmLabel ?? t("sxGroupDetailConfirm")}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
}

function useLoader(fetcher: () => Promise<any>, deps: any[]) {
    const [data, setData] = useState<any[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        fetcherRef
            .current()
            .then(result => {
                if (!alive) return;
                setData(Array.isArray(result) ? result : []);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [...deps, attempt]);

    return { data, setData, status, retry: () => setAttempt(n => n + 1) };
}

const TABS = [
    { value: "members", label: "sxGroupDetailTabMembers" },
    { value: "attributes", label: "sxGroupDetailTabAttributes" },
    { value: "roles", label: "sxGroupDetailTabRoles" },
    { value: "children", label: "sxGroupDetailTabChildren" },
    { value: "settings", label: "sxGroupDetailTabSettings" }
];

export default function GroupDetail() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { id } = useParams();
    const navigate = useNavigate();
    const { addError } = useAlerts();

    const [group, setGroup] = useState<any>(null);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [tab, setTab] = useState("members");
    const showPermissions = useFineGrainedV1();
    const tabs = showPermissions ? [...TABS, { value: "permissions", label: "sxGroupDetailTabPermissions" }] : TABS;

    const reload = async () => {
        try {
            const g = await adminClient.groups.findOne({ id });
            setGroup(g);
        } catch (e) {
            addError(t("sxGroupDetailReloadError"), e);
        }
    };

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.groups
            .findOne({ id })
            .then(g => {
                if (!alive) return;
                setGroup(g ?? null);
                setStatus("ready");
            })
            .catch(e => {
                if (!alive) return;
                if (e?.response?.status === 404) {
                    setGroup(null);
                    setStatus("ready");
                } else setStatus("error");
            });
        return () => {
            alive = false;
        };
    }, [adminClient, id, attempt]);

    const back = { label: t("sxNavGroups"), to: `/${realm}/groups` };

    if (status === "loading")
        return (
            <AdminPage title={t("sxGroupDetailTitle")} back={back}>
                <ListSkeleton rows={3} />
            </AdminPage>
        );
    if (status === "error")
        return (
            <AdminPage title={t("sxGroupDetailTitle")} back={back}>
                <Notice
                    title={t("sxGroupDetailLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            </AdminPage>
        );
    if (!group)
        return (
            <AdminPage title={t("sxGroupDetailNotFoundTitle")} back={back}>
                <Notice
                    title={t("sxGroupDetailNotFoundTitle")}
                    description={t("sxGroupDetailNotFoundDescription")}
                    action={
                        <Button asChild>
                            <Link to={back.to}>{t("sxGroupDetailBackToGroups")}</Link>
                        </Button>
                    }
                />
            </AdminPage>
        );

    return (
        <AdminPage
            title={group.name}
            description={<span className="font-mono text-[15px] [overflow-wrap:anywhere]">{group.path}</span>}
            back={back}
        >
            <SegmentTabs
                ariaLabel={t("sxGroupDetailSections")}
                value={tab}
                onChange={setTab}
                items={tabs.map(item => ({ value: item.value, label: t(item.label) }))}
            />

            <div key={group.id}>
                {tab === "members" && <MembersTab group={group} />}
                {tab === "attributes" && <AttributesTab group={group} reload={reload} />}
                {tab === "roles" && <RoleMappingPanel group={group} />}
                {tab === "children" && (
                    <ChildrenTab group={group} onOpen={cid => navigate(`/${realm}/groups/${cid}`)} reload={reload} />
                )}
                {tab === "permissions" && showPermissions && <PermissionsPanel type="groups" id={group.id} />}
                {tab === "settings" && (
                    <SettingsTab group={group} reload={reload} onDeleted={() => navigate(`/${realm}/groups`)} />
                )}
            </div>
        </AdminPage>
    );
}

function MembersTab({ group }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [adding, setAdding] = useState(false);
    const {
        data: members,
        setData: setMembers,
        status,
        retry
    } = useLoader(() => adminClient.groups.listMembers({ id: group.id, max: 200 }), [adminClient, group.id]);

    const removeMember = (u: any) =>
        confirm({
            title: t("sxGroupDetailRemoveMemberTitle"),
            message: t("sxGroupDetailRemoveMemberMessage", { name: u.username }),
            confirmLabel: t("sxGroupDetailRemove"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.delFromGroup({ id: u.id, groupId: group.id });
                    addAlert(t("sxGroupDetailMemberRemoved"), AlertVariant.success);
                    setMembers(prev => prev.filter(m => m.id !== u.id));
                } catch (e) {
                    addError(t("sxGroupDetailMemberRemoveError"), e);
                }
            }
        });

    return (
        <Section
            label={status === "ready" ? t("sxGroupDetailMembersCount", { total: members.length }) : t("sxGroupDetailTabMembers")}
            action={
                status === "ready" && (
                    <TextAction onClick={() => setAdding(true)}>
                        <AddLabel icon={<UserPlusIcon />}>{t("sxGroupDetailAddMember")}</AddLabel>
                    </TextAction>
                )
            }
        >
            {status === "loading" && <ListSkeleton />}
            {status === "error" && (
                <Notice
                    title={t("sxGroupDetailMembersLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={retry}
                />
            )}
            {status === "ready" &&
                (members.length === 0 ? (
                    <Notice
                        title={t("sxGroupDetailNoMembersTitle")}
                        description={t("sxGroupDetailNoMembersDescription")}
                        action={<Button onClick={() => setAdding(true)}>{t("sxGroupDetailAddMember")}</Button>}
                    />
                ) : (
                    <Group>
                        {members.map(u => (
                            <Row
                                key={u.id}
                                leading={<Monogram name={u.username} />}
                                title={u.username}
                                subtitle={u.email || "—"}
                                trailing={
                                    <TextAction tone="danger" onClick={() => removeMember(u)} aria-label={t("sxGroupDetailRemoveFromGroup")}>
                                        {t("sxGroupDetailRemove")}
                                    </TextAction>
                                }
                            />
                        ))}
                    </Group>
                ))}
            {adding && (
                <AddMemberModal
                    group={group}
                    existing={new Set(members.map(m => m.id))}
                    onClose={() => setAdding(false)}
                    onAdded={() => {
                        setAdding(false);
                        retry();
                    }}
                />
            )}
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </Section>
    );
}

function AddMemberModal({ group, existing, onClose, onAdded }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [q, setQ] = useState("");
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setTerm(q.trim()), 300);
        return () => clearTimeout(timer);
    }, [q]);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        adminClient.users
            .find({ search: term || undefined, max: 20 })
            .then(r => {
                if (!alive) return;
                setResults(Array.isArray(r) ? r : []);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, term, attempt]);

    const add = async (u: any) => {
        setBusy(u.id);
        try {
            await adminClient.users.addToGroup({ id: u.id, groupId: group.id });
            addAlert(t("sxGroupDetailMemberAdded", { name: u.username }), AlertVariant.success);
            onAdded();
        } catch (e) {
            addError(t("sxGroupDetailMemberAddError"), e);
            setBusy(null);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxGroupDetailAddMember")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-3">
                        <SearchField
                            value={q}
                            onChange={setQ}
                            onEnter={() => setTerm(q.trim())}
                            placeholder={t("sxGroupDetailSearchUsers")}
                        />
                        {status === "loading" ? (
                            <ListSkeleton />
                        ) : status === "error" ? (
                            <Notice
                                title={t("sxGroupDetailUsersLoadError")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => setAttempt(n => n + 1)}
                            />
                        ) : results.length === 0 ? (
                            <Notice
                                title={t("sxGroupDetailNoUsersTitle")}
                                description={
                                    term ? t("sxGroupDetailNoUsersSearchDescription") : t("sxGroupDetailNoUsersDescription")
                                }
                            />
                        ) : (
                            <Group>
                                {results.map(u => {
                                    const inGroup = existing.has(u.id);
                                    return (
                                        <Row
                                            key={u.id}
                                            leading={<Monogram name={u.username} />}
                                            title={u.username}
                                            subtitle={u.email || "—"}
                                            trailing={
                                                inGroup ? (
                                                    <span className="text-[15px] text-muted-foreground">{t("sxGroupDetailAlreadyMember")}</span>
                                                ) : (
                                                    <TextAction disabled={busy === u.id} onClick={() => add(u)}>
                                                        {t("sxGroupDetailAdd")}
                                                    </TextAction>
                                                )
                                            }
                                        />
                                    );
                                })}
                            </Group>
                        )}
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

function AttributesTab({ group, reload }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const toRows = (attrs: any) =>
        Object.entries(attrs || {}).map(([k, v]: any) => ({
            k,
            v: Array.isArray(v) ? v.join(", ") : String(v)
        }));
    const [rows, setRows] = useState<any[]>(toRows(group.attributes));
    const [saving, setSaving] = useState(false);

    const setRow = (i: number, field: string, val: string) =>
        setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
    const addRow = () => setRows(prev => [...prev, { k: "", v: "" }]);
    const delRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

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
            await adminClient.groups.update({ id: group.id }, { name: group.name, attributes });
            addAlert(t("sxGroupDetailAttributesSaved"), AlertVariant.success);
            reload();
        } catch (e) {
            addError(t("sxGroupDetailAttributesSaveError"), e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-110">
            <Section
                label={t("sxGroupDetailTabAttributes")}
                action={
                    <TextAction onClick={addRow}>
                        <AddLabel icon={<PlusIcon weight="bold" />}>{t("sxGroupDetailAddAttribute")}</AddLabel>
                    </TextAction>
                }
            >
                {rows.length === 0 ? (
                    <Notice
                        title={t("sxGroupDetailNoAttributesTitle")}
                        description={t("sxGroupDetailNoAttributesDescription")}
                        action={<Button onClick={addRow}>{t("sxGroupDetailAddAttribute")}</Button>}
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
                                        placeholder={t("sxGroupDetailKeyPlaceholder")}
                                        aria-label={t("sxGroupDetailKey")}
                                        className="w-2/5 min-w-0 font-medium"
                                    />
                                    <Input
                                        size="md"
                                        value={r.v}
                                        onChange={(e: any) => setRow(i, "v", e.target.value)}
                                        placeholder={t("sxGroupDetailValuePlaceholder")}
                                        aria-label={t("sxGroupDetailValue")}
                                        className="min-w-0 flex-1"
                                    />
                                    <TextAction tone="danger" aria-label={t("sxGroupDetailDelete")} onClick={() => delRow(i)}>
                                        {t("sxGroupDetailDelete")}
                                    </TextAction>
                                </li>
                            </Fragment>
                        ))}
                    </ul>
                )}
            </Section>
            <div className="mt-7 flex flex-col gap-1.5">
                <Button type="button" size="form" block disabled={saving} onClick={save}>
                    {saving ? t("sxGroupDetailSaving") : t("sxGroupDetailSave")}
                </Button>
                <Button
                    type="button"
                    variant="plain"
                    size="form"
                    block
                    disabled={saving}
                    onClick={() => setRows(toRows(group.attributes))}
                >
                    {t("sxGroupDetailCancel")}
                </Button>
            </div>
        </div>
    );
}

function ChildrenTab({ group, onOpen, reload }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const { data: children, status, retry } = useLoader(
        () => adminClient.groups.listSubGroups({ parentId: group.id, briefRepresentation: false }),
        [adminClient, group.id]
    );

    const create = async () => {
        const n = name.trim();
        if (!n) return;
        try {
            await adminClient.groups.createChildGroup({ id: group.id }, { name: n });
            addAlert(t("sxGroupDetailChildCreated"), AlertVariant.success);
            setCreating(false);
            setName("");
            retry();
            reload();
        } catch (e) {
            addError(t("sxGroupDetailChildCreateError"), e);
        }
    };

    return (
        <Section
            label={status === "ready" ? t("sxGroupDetailChildrenCount", { total: children.length }) : t("sxGroupDetailTabChildren")}
            action={
                status === "ready" && (
                    <TextAction onClick={() => setCreating(true)}>
                        <AddLabel icon={<PlusIcon weight="bold" />}>{t("sxGroupDetailChild")}</AddLabel>
                    </TextAction>
                )
            }
        >
            {status === "loading" && <ListSkeleton />}
            {status === "error" && (
                <Notice
                    title={t("sxGroupDetailChildrenLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={retry}
                />
            )}
            {status === "ready" &&
                (children.length === 0 ? (
                    <Notice
                        title={t("sxGroupDetailNoChildrenTitle")}
                        description={t("sxGroupDetailNoChildrenDescription")}
                        action={<Button onClick={() => setCreating(true)}>{t("sxGroupDetailCreateChild")}</Button>}
                    />
                ) : (
                    <Group>
                        {children.map(c => (
                            <Row
                                key={c.id}
                                onClick={() => onOpen(c.id)}
                                leading={
                                    <IconTile>
                                        <UsersThreeIcon />
                                    </IconTile>
                                }
                                title={c.name}
                            />
                        ))}
                    </Group>
                ))}
            <Modal open={creating} onOpenChange={o => !o && setCreating(false)}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>{t("sxGroupDetailCreateChild")}</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <Field size="lg">
                            <FieldLabel htmlFor="child-group-name">{t("sxGroupDetailChildName")}</FieldLabel>
                            <Input
                                id="child-group-name"
                                size="lg"
                                autoFocus
                                value={name}
                                onChange={(e: any) => setName(e.target.value)}
                                onKeyDown={(e: any) => e.key === "Enter" && create()}
                                placeholder={t("sxGroupDetailChildName")}
                            />
                        </Field>
                    </ModalBody>
                    <ModalFooter>
                        <Button disabled={!name.trim()} onClick={create}>
                            {t("sxGroupDetailCreate")}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Section>
    );
}

function SettingsTab({ group, reload, onDeleted }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;
    const [name, setName] = useState(group.name || "");
    const [saving, setSaving] = useState(false);
    const dirty = name !== (group.name || "");

    const save = async () => {
        const n = name.trim();
        if (!n) return;
        setSaving(true);
        try {
            await adminClient.groups.update({ id: group.id }, { ...group, name: n });
            addAlert(t("sxGroupDetailUpdated"), AlertVariant.success);
            reload();
        } catch (e) {
            addError(t("sxGroupDetailUpdateError"), e);
        } finally {
            setSaving(false);
        }
    };

    const remove = () =>
        confirm({
            title: t("sxGroupDetailDeleteGroup"),
            message: t("sxGroupDetailDeleteGroupMessage", { name: group.name }),
            confirmLabel: t("sxGroupDetailDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.groups.del({ id: group.id });
                    addAlert(t("sxGroupDetailDeleted"), AlertVariant.success);
                    onDeleted();
                } catch (e) {
                    addError(t("sxGroupDetailDeleteError"), e);
                }
            }
        });

    return (
        <div className="max-w-110">
            <form
                onSubmit={e => {
                    e.preventDefault();
                    save();
                }}
            >
                <div className="flex flex-col gap-4">
                    <Field size="lg">
                        <FieldLabel htmlFor="group-settings-name">{t("sxGroupDetailName")}</FieldLabel>
                        <Input
                            id="group-settings-name"
                            size="lg"
                            value={name}
                            onChange={(e: any) => setName(e.target.value)}
                        />
                    </Field>
                    <Field size="lg">
                        <FieldLabel>{t("sxGroupDetailPath")}</FieldLabel>
                        <p className="ps-0.5 font-mono text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                            {group.path}
                        </p>
                    </Field>
                    <Field size="lg">
                        <FieldLabel>{t("sxGroupDetailId")}</FieldLabel>
                        <p className="ps-0.5 font-mono text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                            {group.id}
                        </p>
                    </Field>
                </div>
                <div className="mt-7 flex flex-col gap-1.5">
                    <Button type="submit" size="form" block disabled={saving || !name.trim() || !dirty}>
                        {saving ? t("sxGroupDetailSaving") : t("sxGroupDetailSave")}
                    </Button>
                    <Button
                        type="button"
                        variant="plain"
                        size="form"
                        block
                        disabled={saving || !dirty}
                        onClick={() => setName(group.name || "")}
                    >
                        {t("sxGroupDetailCancel")}
                    </Button>
                </div>
            </form>
            <section className="mt-7 border-t border-border pt-6">
                <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">
                    {t("sxGroupDetailDeleteHint")}
                </p>
                <Button type="button" size="form" block className={DANGER_BTN} onClick={remove}>
                    {t("sxGroupDetailDeleteGroup")}
                </Button>
            </section>
            <ConfirmDialog opts={confirmOpts} onClose={() => setConfirmOpts(null)} />
        </div>
    );
}
