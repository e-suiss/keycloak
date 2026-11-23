// @ts-nocheck

import { PlusIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
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
import { Fragment, useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import {
    Chip,
    GROUP,
    Group,
    ListSkeleton,
    Notice,
    Pager,
    Row,
    SEPARATOR,
    SearchField,
    Section,
    SegmentTabs,
    TextAction
} from "../../ui/kit";
import { useT } from "../../ui/i18n";
import { useRealm } from "../../ui/realm";
import { adminFetch } from "../../ui/util";

const PAGE = 20;

const FILTERS = [
    { value: "all", label: "sxGroupDetailRoleFilterAll" },
    { value: "realm", label: "sxGroupDetailRoleFilterRealm" },
    { value: "client", label: "sxGroupDetailRoleFilterClient" }
];

function rowKey(row: any) {
    return `${row.client?.id ?? "realm"}:${row.role.id}`;
}

function sortRows(rows: any[]) {
    return [...rows].sort((a, b) => {
        const ca = a.client?.clientId ?? "";
        const cb = b.client?.clientId ?? "";
        if (ca !== cb) return ca.localeCompare(cb);
        return (a.role.name ?? "").localeCompare(b.role.name ?? "");
    });
}

function matches(row: any, term: string) {
    if (!term) return true;
    const q = term.toLowerCase();
    return (
        (row.role.name ?? "").toLowerCase().includes(q) ||
        (row.client?.clientId ?? "").toLowerCase().includes(q) ||
        (row.role.description ?? "").toLowerCase().includes(q)
    );
}

function IconTile() {
    return (
        <span className="grid size-8 place-items-center rounded-lg bg-[#e5e5ea] dark:bg-[#2c2c2e] [&_svg]:size-4.5">
            <ShieldCheckIcon />
        </span>
    );
}

function RoleSubtitle({ row }: any) {
    if (!row.client) return row.role.description || null;
    return (
        <>
            <span className="font-mono">{row.client.clientId}</span>
            {row.role.description ? ` · ${row.role.description}` : null}
        </>
    );
}

export function RoleMappingPanel({ group }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [hide, setHide] = useState(true);
    const [filter, setFilter] = useState("all");
    const [query, setQuery] = useState("");
    const [rows, setRows] = useState<any[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [picking, setPicking] = useState(false);
    const [pending, setPending] = useState<any>(null);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        (async () => {
            const mapping = await adminClient.groups.listRoleMappings({ id: group.id });
            const assigned = [
                ...(mapping?.realmMappings || []).map((role: any) => ({ role })),
                ...Object.values(mapping?.clientMappings || {}).flatMap((c: any) =>
                    (c.mappings || []).map((role: any) => ({ role, client: { id: c.id, clientId: c.client } }))
                )
            ];
            if (hide) return assigned.map(r => ({ ...r, inherited: false }));
            const [realmEffective, clientEffective] = await Promise.all([
                adminClient.groups.listCompositeRealmRoleMappings({ id: group.id }),
                adminFetch(adminClient, realm, `ui-ext/effective-roles/groups/${encodeURIComponent(group.id)}`, {
                    first: 0,
                    max: 1000
                })
            ]);
            const own = new Set(assigned.map(rowKey));
            const effective = [
                ...(realmEffective || []).map((role: any) => ({ role })),
                ...(Array.isArray(clientEffective) ? clientEffective : []).map((e: any) => ({
                    role: { id: e.id, name: e.role, description: e.description },
                    client: { id: e.clientId, clientId: e.client }
                }))
            ];
            const seen = new Set<string>();
            return effective
                .filter(r => {
                    const k = rowKey(r);
                    if (seen.has(k)) return false;
                    seen.add(k);
                    return true;
                })
                .map(r => ({ ...r, inherited: !own.has(rowKey(r)) }));
        })()
            .then(list => {
                if (!alive) return;
                setRows(sortRows(list));
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, realm, group.id, hide, attempt]);

    const visible = rows.filter(
        r =>
            (filter === "all" || (filter === "client" ? !!r.client : !r.client)) && matches(r, query.trim())
    );

    const unassign = async (row: any) => {
        try {
            if (row.client)
                await adminClient.groups.delClientRoleMappings({
                    id: group.id,
                    clientUniqueId: row.client.id,
                    roles: [{ id: row.role.id, name: row.role.name }]
                });
            else
                await adminClient.groups.delRealmRoleMappings({
                    id: group.id,
                    roles: [{ id: row.role.id, name: row.role.name }]
                });
            addAlert(t("sxGroupDetailRoleRemoved"), AlertVariant.success);
            setAttempt(n => n + 1);
        } catch (e) {
            addError(t("sxGroupDetailRoleRemoveError"), e);
        }
    };

    const assignedKeys = new Set(rows.filter(r => !r.inherited).map(rowKey));

    return (
        <Section
            label={t("sxGroupDetailAssignedRolesAll")}
            action={
                status === "ready" && (
                    <TextAction onClick={() => setPicking(true)}>
                        <span className="inline-flex items-center gap-1 [&_svg]:size-3.5">
                            <PlusIcon weight="bold" />
                            {t("sxGroupDetailAssignRole")}
                        </span>
                    </TextAction>
                )
            }
        >
            <div className="mb-3 flex flex-col gap-3">
                <SearchField value={query} onChange={setQuery} placeholder={t("sxGroupDetailRoleSearch")} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <SegmentTabs
                        ariaLabel={t("sxGroupDetailRoleFilterLabel")}
                        value={filter}
                        onChange={setFilter}
                        items={FILTERS.map(f => ({ value: f.value, label: t(f.label) }))}
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-[15px]">
                        <Checkbox checked={hide} onCheckedChange={(v: any) => setHide(!!v)} />
                        {t("sxGroupDetailHideInherited")}
                    </label>
                </div>
            </div>
            {status === "loading" && <ListSkeleton />}
            {status === "error" && (
                <Notice
                    title={t("sxGroupDetailRolesLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            )}
            {status === "ready" && rows.length === 0 && (
                <Notice
                    title={t("sxGroupDetailNoRolesTitle")}
                    description={t("sxGroupDetailNoRolesAnyDescription")}
                    action={<Button onClick={() => setPicking(true)}>{t("sxGroupDetailAssignRole")}</Button>}
                />
            )}
            {status === "ready" && rows.length > 0 && visible.length === 0 && (
                <Notice title={t("sxGroupDetailRoleNoMatchTitle")} description={t("sxCommonTryDifferentSearch")} />
            )}
            {status === "ready" && visible.length > 0 && (
                <Group>
                    {visible.map(r => (
                        <Row
                            key={rowKey(r)}
                            leading={<IconTile />}
                            title={r.role.name}
                            subtitle={<RoleSubtitle row={r} />}
                            trailing={
                                r.inherited ? (
                                    <Chip>{t("sxGroupDetailInherited")}</Chip>
                                ) : (
                                    <TextAction
                                        tone="danger"
                                        onClick={() => setPending(r)}
                                        aria-label={t("sxGroupDetailRemoveRoleTitle")}
                                    >
                                        {t("sxGroupDetailUnassign")}
                                    </TextAction>
                                )
                            }
                        />
                    ))}
                </Group>
            )}
            {picking && (
                <AssignRolesModal
                    group={group}
                    assignedKeys={assignedKeys}
                    onClose={() => setPicking(false)}
                    onAdded={() => {
                        setPicking(false);
                        setAttempt(n => n + 1);
                    }}
                />
            )}
            <Confirm open={!!pending} onOpenChange={o => !o && setPending(null)}>
                <ConfirmContent>
                    <ConfirmHeader>
                        <ConfirmTitle>{t("sxGroupDetailRemoveRoleTitle")}</ConfirmTitle>
                        <ConfirmDescription>
                            {pending?.client
                                ? t("sxGroupDetailRemoveClientRoleMessage", {
                                      name: pending?.role.name,
                                      client: pending?.client.clientId
                                  })
                                : t("sxGroupDetailRemoveRoleMessage", { name: pending?.role.name })}
                        </ConfirmDescription>
                    </ConfirmHeader>
                    <ConfirmFooter>
                        <ConfirmCancel>{t("sxGroupDetailCancel")}</ConfirmCancel>
                        <ConfirmAction
                            variant="destructive"
                            onClick={() => {
                                const r = pending;
                                setPending(null);
                                if (r) unassign(r);
                            }}
                        >
                            {t("sxGroupDetailUnassign")}
                        </ConfirmAction>
                    </ConfirmFooter>
                </ConfirmContent>
            </Confirm>
        </Section>
    );
}

function AssignRolesModal({ group, assignedKeys, onClose, onAdded }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [kind, setKind] = useState("client");
    const [query, setQuery] = useState("");
    const [term, setTerm] = useState("");
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState<any[]>([]);
    const [hasNext, setHasNext] = useState(false);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [selected, setSelected] = useState<Map<string, any>>(new Map());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setTerm(query.trim()), 300);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => setPage(0), [kind, term]);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        const load =
            kind === "realm"
                ? adminClient.groups.listAvailableRealmRoleMappings({ id: group.id }).then((list: any[]) => {
                      const all = sortRows((list || []).map(role => ({ role }))).filter(r => matches(r, term));
                      return { list: all, more: false };
                  })
                : adminFetch(adminClient, realm, `ui-ext/available-roles/groups/${encodeURIComponent(group.id)}`, {
                      first: page * PAGE,
                      max: PAGE + 1,
                      search: term
                  }).then((list: any) => {
                      const mapped = (Array.isArray(list) ? list : []).map((e: any) => ({
                          role: { id: e.id, name: e.role, description: e.description },
                          client: { id: e.clientId, clientId: e.client }
                      }));
                      return { list: mapped.slice(0, PAGE), more: mapped.length > PAGE };
                  });
        load
            .then(({ list, more }) => {
                if (!alive) return;
                setRows(list.filter(r => !assignedKeysHas(assignedKeys, r)));
                setHasNext(more);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, realm, group.id, kind, term, page, attempt]);

    const toggle = (row: any) =>
        setSelected(prev => {
            const next = new Map(prev);
            const k = rowKey(row);
            next.has(k) ? next.delete(k) : next.set(k, row);
            return next;
        });

    const save = async () => {
        const chosen = [...selected.values()];
        if (chosen.length === 0) return;
        setSaving(true);
        try {
            const realmRoles = chosen.filter(r => !r.client).map(r => ({ id: r.role.id, name: r.role.name }));
            const byClient = new Map<string, any[]>();
            chosen
                .filter(r => r.client)
                .forEach(r => {
                    const list = byClient.get(r.client.id) ?? [];
                    list.push({ id: r.role.id, name: r.role.name });
                    byClient.set(r.client.id, list);
                });
            if (realmRoles.length > 0)
                await adminClient.groups.addRealmRoleMappings({ id: group.id, roles: realmRoles });
            for (const [clientUniqueId, roles] of byClient)
                await adminClient.groups.addClientRoleMappings({ id: group.id, clientUniqueId, roles });
            addAlert(t("sxGroupDetailRolesAssigned", { total: chosen.length }), AlertVariant.success);
            onAdded();
        } catch (e) {
            addError(t("sxGroupDetailRolesAssignError"), e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxGroupDetailAssignRole")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-3">
                        <SegmentTabs
                            ariaLabel={t("sxGroupDetailRoleFilterLabel")}
                            value={kind}
                            onChange={setKind}
                            items={[
                                { value: "client", label: t("sxGroupDetailClientRoles") },
                                { value: "realm", label: t("sxGroupDetailRealmRoles") }
                            ]}
                        />
                        <SearchField
                            value={query}
                            onChange={setQuery}
                            onEnter={() => setTerm(query.trim())}
                            placeholder={kind === "realm" ? t("sxGroupDetailRoleSearch") : t("sxGroupDetailClientRoleSearch")}
                        />
                        {status === "loading" ? (
                            <ListSkeleton />
                        ) : status === "error" ? (
                            <Notice
                                title={t("sxGroupDetailRolesLoadError")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => setAttempt(n => n + 1)}
                            />
                        ) : rows.length === 0 ? (
                            <Notice
                                title={term ? t("sxGroupDetailRoleNoMatchTitle") : t("sxGroupDetailNoAvailableRolesTitle")}
                                description={
                                    term
                                        ? t("sxCommonTryDifferentSearch")
                                        : kind === "realm"
                                          ? t("sxGroupDetailNoAvailableRolesDescription")
                                          : t("sxGroupDetailNoAvailableClientRolesDescription")
                                }
                            />
                        ) : (
                            <ul className={GROUP}>
                                {rows.map((r, i) => (
                                    <Fragment key={rowKey(r)}>
                                        {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                        <li>
                                            <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-black/3 dark:hover:bg-white/4">
                                                <Checkbox checked={selected.has(rowKey(r))} onCheckedChange={() => toggle(r)} />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-base font-medium">{r.role.name}</span>
                                                    {(r.client || r.role.description) && (
                                                        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                                                            <RoleSubtitle row={r} />
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                        </li>
                                    </Fragment>
                                ))}
                            </ul>
                        )}
                        {kind === "client" && status === "ready" && (
                            <Pager
                                page={page + 1}
                                hasPrev={page > 0}
                                hasNext={hasNext}
                                onPrev={() => setPage(p => Math.max(0, p - 1))}
                                onNext={() => setPage(p => p + 1)}
                            />
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving || selected.size === 0} onClick={save}>
                        {saving ? t("sxGroupDetailAssigning") : t("sxGroupDetailAssignCount", { total: selected.size })}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function assignedKeysHas(keys: Set<string>, row: any) {
    return keys.has(rowKey(row));
}
