// @ts-nocheck
import { Button } from "@ui/components/button";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useEffect, useMemo, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { Chip, Group, ListSkeleton, Notice, Pager, Row, SearchField, Section, TextAction } from "../../ui/kit";
import { useT } from "../../ui/i18n";
import { ConfirmDialog, TextField } from "../idp/shared";
import { ListState, Monogram, useDebounced } from "./shared";

const PAGE = 20;
const asList = (v: any) => (Array.isArray(v) ? v : []);

export function OrgGroups({ org }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const api = useMemo(() => adminClient.organizations.groups(org.id), [adminClient, org.id]);
    const [path, setPath] = useState<any[]>([]);
    const parent = path[path.length - 1];
    const parentId = parent?.id || "";
    const [searchInput, setSearchInput] = useState("");
    const search = useDebounced(searchInput);
    const [first, setFirst] = useState(0);
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<any>({ status: "loading", list: [], more: false });
    const [editing, setEditing] = useState<any>(null);
    const [membersOf, setMembersOf] = useState<any>(null);
    const [confirmOpts, setConfirmOpts] = useState<any>(null);

    useEffect(() => setFirst(0), [parentId, search]);

    useEffect(() => {
        let alive = true;
        setState((s: any) => ({ ...s, status: "loading" }));
        const req = parentId
            ? api.listSubGroups({ parentId, first, max: PAGE + 1, subGroupsCount: true, ...(search ? { search } : {}) })
            : api.find({ first, max: PAGE + 1, subGroupsCount: true, ...(search ? { search } : {}) });
        req.then((r: any) => {
            if (!alive) return;
            const list = asList(r);
            setState({ status: "ready", list: list.slice(0, PAGE), more: list.length > PAGE });
        }).catch(() => alive && setState({ status: "error", list: [], more: false }));
        return () => {
            alive = false;
        };
    }, [api, parentId, search, first, attempt]);

    const refresh = () => setAttempt(n => n + 1);

    const remove = (g: any) =>
        setConfirmOpts({
            title: t("sxGroupsDeleteTitle"),
            message: t("sxOrgDetailDeleteGroupMessage", { name: g.name }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await api.del({ id: g.id });
                    addAlert(t("sxOrgDetailGroupDeleted"), AlertVariant.success);
                    refresh();
                } catch (e) {
                    addError(t("sxCommonDeleteError"), e);
                }
            }
        });

    const createButton = (size?: string) =>
        size ? (
            <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setEditing({})}>
                {parentId ? t("sxOrgDetailNewSubgroup") : t("sxGroupsNew")}
            </Button>
        ) : (
            <TextAction onClick={() => setEditing({})}>
                {parentId ? t("sxOrgDetailNewSubgroup") : t("sxGroupsNew")}
            </TextAction>
        );

    return (
        <>
            {path.length > 0 && (
                <nav aria-label={t("sxOrgDetailGroupPath")} className="flex flex-wrap items-center gap-1.5 px-0.5 text-[15px]">
                    <TextAction onClick={() => setPath([])}>{t("sxNavGroups")}</TextAction>
                    {path.map((g, i) => (
                        <span key={g.id} className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">/</span>
                            {i === path.length - 1 ? (
                                <span className="font-medium [overflow-wrap:anywhere]">{g.name}</span>
                            ) : (
                                <TextAction onClick={() => setPath(path.slice(0, i + 1))}>{g.name}</TextAction>
                            )}
                        </span>
                    ))}
                </nav>
            )}
            <SearchField value={searchInput} onChange={setSearchInput} placeholder={t("sxOrgDetailSearchGroups")} />
            <Section label={parent ? t("sxOrgDetailSubgroupsOf", { name: parent.name }) : t("sxNavGroups")} action={state.status === "ready" && createButton()}>
                <ListState
                    status={state.status}
                    count={state.list.length}
                    onRetry={refresh}
                    errorTitle={t("sxOrgDetailGroupsLoadError")}
                    emptyTitle={search ? t("sxOrgDetailNoGroupsMatch") : parentId ? t("sxOrgDetailNoSubgroups") : t("sxOrgDetailNoGroups")}
                    emptyDescription={search ? t("sxCommonTryDifferentSearch") : t("sxOrgDetailNoGroupsDescription")}
                    emptyAction={!search ? createButton("sm") : undefined}
                >
                    <Group>
                        {state.list.map((g: any) => (
                            <li key={g.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPath([...path, { id: g.id, name: g.name }])}
                                    className="min-w-0 text-left outline-none focus-visible:underline"
                                >
                                    <div className="truncate text-base font-medium">{g.name}</div>
                                    {g.subGroupCount != null && (
                                        <div className="mt-0.5 text-[13px] text-muted-foreground">
                                            {t("sxOrgDetailSubgroupCount", { total: g.subGroupCount })}
                                        </div>
                                    )}
                                </button>
                                <div className="flex shrink-0 flex-wrap items-center gap-4">
                                    <TextAction onClick={() => setMembersOf(g)}>{t("sxOrgDetailTabMembers")}</TextAction>
                                    <TextAction onClick={() => setEditing(g)}>{t("sxOrgDetailRename")}</TextAction>
                                    <TextAction tone="danger" onClick={() => remove(g)}>
                                        {t("sxCommonDelete")}
                                    </TextAction>
                                </div>
                            </li>
                        ))}
                    </Group>
                </ListState>
                {state.status === "ready" && (
                    <div className="mt-3">
                        <Pager
                            page={Math.floor(first / PAGE) + 1}
                            hasPrev={first > 0}
                            hasNext={state.more}
                            onPrev={() => setFirst(f => Math.max(0, f - PAGE))}
                            onNext={() => setFirst(f => f + PAGE)}
                        />
                    </div>
                )}
            </Section>
            {editing && (
                <GroupNameModal
                    api={api}
                    group={editing.id ? editing : null}
                    parentId={parentId}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        refresh();
                    }}
                />
            )}
            {membersOf && <GroupMembersModal api={api} org={org} group={membersOf} onClose={() => setMembersOf(null)} />}
            <ConfirmDialog opts={confirmOpts} setOpts={setConfirmOpts} />
        </>
    );
}

function GroupNameModal({ api, group, parentId, onClose, onSaved }: any) {
    const t = useT();
    const { addAlert, addError } = useAlerts();
    const [name, setName] = useState(group?.name || "");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        const n = name.trim();
        if (!n) return;
        setSaving(true);
        try {
            if (group) {
                await api.update({ id: group.id }, { ...group, name: n });
                addAlert(t("sxOrgDetailGroupRenamed"), AlertVariant.success);
            } else if (parentId) {
                await api.createChildGroup({ id: parentId }, { name: n });
                addAlert(t("sxOrgDetailGroupCreated"), AlertVariant.success);
            } else {
                await api.create({ name: n });
                addAlert(t("sxOrgDetailGroupCreated"), AlertVariant.success);
            }
            onSaved();
        } catch (e) {
            addError(group ? t("sxCommonSaveError") : t("sxCommonCreateError"), e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>
                        {group ? t("sxOrgDetailRenameGroup") : parentId ? t("sxOrgDetailNewSubgroup") : t("sxGroupsNew")}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <TextField id="org-group-name" label={t("sxGroupsNameLabel")} required value={name} onChange={setName} />
                </ModalBody>
                <ModalFooter>
                    <Button size="form" block disabled={saving || !name.trim()} onClick={save}>
                        {saving ? t("sxCommonSaving") : group ? t("sxCommonSave") : t("sxCommonCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function GroupMembersModal({ api, org, group, onClose }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<any>({ status: "loading", members: [] });
    const [adding, setAdding] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        setState((s: any) => ({ ...s, status: "loading" }));
        api.listMembers({ id: group.id, max: 200 })
            .then((r: any) => alive && setState({ status: "ready", members: asList(r) }))
            .catch(() => alive && setState({ status: "error", members: [] }));
        return () => {
            alive = false;
        };
    }, [api, group.id, attempt]);

    const removeMember = async (u: any) => {
        setBusy(u.id);
        try {
            await api.removeMemberFromOrgGroup({ groupId: group.id, userId: u.id });
            addAlert(t("sxOrgDetailGroupMemberRemoved", { username: u.username }), AlertVariant.success);
            setState((s: any) => ({ ...s, members: s.members.filter((m: any) => m.id !== u.id) }));
        } catch (e) {
            addError(t("sxCommonRemoveError"), e);
        } finally {
            setBusy(null);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-lg">
                <ModalHeader>
                    <ModalTitle>{t("sxOrgDetailGroupMembersTitle", { name: group.name })}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {adding ? (
                        <AddGroupMember
                            api={api}
                            org={org}
                            group={group}
                            existing={new Set(state.members.map((m: any) => m.id))}
                            onDone={() => {
                                setAdding(false);
                                setAttempt(n => n + 1);
                            }}
                        />
                    ) : (
                        <div className="max-h-[55svh] overflow-y-auto">
                            <ListState
                                status={state.status}
                                count={state.members.length}
                                onRetry={() => setAttempt(n => n + 1)}
                                errorTitle={t("sxOrgDetailMembersLoadError")}
                                emptyTitle={t("sxOrgDetailNoGroupMembers")}
                                emptyDescription={t("sxOrgDetailNoGroupMembersDescription")}
                            >
                                <Group>
                                    {state.members.map((u: any) => (
                                        <Row
                                            key={u.id}
                                            leading={<Monogram name={u.username} />}
                                            title={u.username}
                                            subtitle={u.email || "—"}
                                            trailing={
                                                <TextAction tone="danger" disabled={busy === u.id} onClick={() => removeMember(u)}>
                                                    {t("sxCommonRemoveFrom")}
                                                </TextAction>
                                            }
                                        />
                                    ))}
                                </Group>
                            </ListState>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    {adding ? (
                        <Button variant="plain" size="form" block onClick={() => setAdding(false)}>
                            {t("sxCommonBack")}
                        </Button>
                    ) : (
                        <Button size="form" block disabled={state.status !== "ready"} onClick={() => setAdding(true)}>
                            {t("sxOrgDetailAddMember")}
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function AddGroupMember({ api, org, group, existing, onDone }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [q, setQ] = useState("");
    const term = useDebounced(q);
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<any>({ status: "loading", list: [] });
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        setState((s: any) => ({ ...s, status: "loading" }));
        adminClient.organizations
            .listMembers({ orgId: org.id, max: 50, ...(term ? { search: term } : {}) })
            .then((r: any) => alive && setState({ status: "ready", list: asList(r) }))
            .catch(() => alive && setState({ status: "error", list: [] }));
        return () => {
            alive = false;
        };
    }, [adminClient, org.id, term, attempt]);

    const add = async (u: any) => {
        setBusy(u.id);
        try {
            await api.addMemberToOrgGroup({ groupId: group.id, userId: u.id });
            addAlert(t("sxOrgDetailMemberAdded", { username: u.username }), AlertVariant.success);
            onDone();
        } catch (e) {
            addError(t("sxOrgDetailMemberAddError"), e);
            setBusy(null);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <SearchField value={q} onChange={setQ} placeholder={t("sxOrgDetailSearchMembers")} />
            <div className="max-h-[45svh] overflow-y-auto">
                {state.status === "loading" ? (
                    <ListSkeleton />
                ) : state.status === "error" ? (
                    <Notice
                        title={t("sxOrgDetailMembersLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                ) : state.list.length === 0 ? (
                    <Notice
                        title={term ? t("sxOrgDetailNoUsersFound") : t("sxOrgDetailNoMembers")}
                        description={term ? t("sxOrgDetailNoUsersFoundSearch") : t("sxOrgDetailGroupNeedsMembers")}
                    />
                ) : (
                    <Group>
                        {state.list.map((u: any) => (
                            <Row
                                key={u.id}
                                leading={<Monogram name={u.username} />}
                                title={u.username}
                                subtitle={u.email || "—"}
                                trailing={
                                    existing.has(u.id) ? (
                                        <Chip>{t("sxOrgDetailMemberChip")}</Chip>
                                    ) : (
                                        <TextAction disabled={busy === u.id} onClick={() => add(u)}>
                                            {t("sxCommonAdd")}
                                        </TextAction>
                                    )
                                }
                            />
                        ))}
                    </Group>
                )}
            </div>
        </div>
    );
}
