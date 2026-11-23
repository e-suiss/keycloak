// @ts-nocheck
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useEffect, useMemo, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { Chip, Group, ListSkeleton, Notice, Pager, SearchField, Section, SegmentTabs, TextAction } from "../../ui/kit";
import { useRealm } from "../../ui/realm";
import { adminFetch } from "../../ui/util";
import { useConfirmDialog } from "./shared";

const PAGE = 20;

const rowKey = (r: any) => `${r.client?.id || "realm"}:${r.role.id}`;

function sortRows(rows: any[]) {
    return [...rows].sort((a, b) => {
        const ca = a.client?.clientId || "";
        const cb = b.client?.clientId || "";
        if (ca !== cb) return ca.localeCompare(cb);
        return (a.role.name || "").localeCompare(b.role.name || "");
    });
}

function RoleLine({ row, trailing }: any) {
    return (
        <li className="flex min-h-16 items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    {row.client?.clientId && <Chip tone="info">{row.client.clientId}</Chip>}
                    <span className="min-w-0 text-base font-medium [overflow-wrap:anywhere]">{row.role.name}</span>
                </div>
                {row.role.description && (
                    <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                        {row.role.description}
                    </div>
                )}
            </div>
            {trailing && <div className="flex shrink-0 items-center gap-3">{trailing}</div>}
        </li>
    );
}

export default function RoleScopeMapping({ resource, id, name }: { resource: "clients" | "clientScopes"; id: string; name: string }) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const [hide, setHide] = useState(true);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [rows, setRows] = useState<any[]>([]);
    const [attempt, setAttempt] = useState(0);
    const [query, setQuery] = useState("");
    const [assignKind, setAssignKind] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        (async () => {
            const api = adminClient[resource];
            const mappings = await api.listScopeMappings({ id });
            const assigned = [
                ...(mappings?.realmMappings || []).map((role: any) => ({ role })),
                ...Object.values(mappings?.clientMappings || {}).flatMap((c: any) =>
                    (c.mappings || []).map((role: any) => ({ role, client: { id: c.id, clientId: c.client } }))
                )
            ];
            const assignedKeys = new Set(assigned.map(rowKey));
            let list = assigned.map(r => ({ ...r, inherited: false }));
            if (!hide) {
                const [all, realmComposite] = await Promise.all([
                    adminFetch(adminClient, realm, `ui-ext/effective-roles-all/${resource}/${encodeURIComponent(id)}`).catch(() => []),
                    api.listCompositeRealmScopeMappings({ id }).catch(() => [])
                ]);
                const effective = [
                    ...(Array.isArray(all) ? all : []).map((e: any) => ({
                        role: { id: e.id, name: e.name, description: e.description },
                        client: e.clientRole && e.clientId ? { id: e.clientId, clientId: e.client } : undefined
                    })),
                    ...(realmComposite || []).map((role: any) => ({ role }))
                ];
                const seen = new Set(assignedKeys);
                for (const e of effective) {
                    const k = rowKey(e);
                    if (seen.has(k)) continue;
                    seen.add(k);
                    list.push({ ...e, inherited: true });
                }
            }
            return sortRows(list);
        })()
            .then(list => {
                if (!alive) return;
                setRows(list);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, resource, id, hide, attempt, realm]);

    const reload = () => setAttempt(n => n + 1);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(
            r =>
                (r.role.name || "").toLowerCase().includes(q) ||
                (r.client?.clientId || "").toLowerCase().includes(q) ||
                (r.role.description || "").toLowerCase().includes(q)
        );
    }, [rows, query]);

    const unassign = (row: any) =>
        confirm({
            title: t("sxGroupDetailRemoveRoleTitle"),
            message: t("sxClientScopesXUnassignMessage", { name: row.role.name }),
            confirmLabel: t("sxGroupDetailUnassign"),
            danger: true,
            onConfirm: async () => {
                try {
                    const api = adminClient[resource];
                    const role = { id: row.role.id, name: row.role.name };
                    if (row.client) await api.delClientScopeMappings({ id, client: row.client.id }, [role]);
                    else await api.delRealmScopeMappings({ id }, [role]);
                    addAlert(t("sxClientScopesXMappingUpdated"), AlertVariant.success);
                    reload();
                } catch (e) {
                    addError(t("sxClientScopesXMappingUpdateError"), e);
                }
            }
        });

    const assignedCount = rows.filter(r => !r.inherited).length;

    const assignMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <TextAction className="inline-flex items-center gap-1">
                    {t("sxGroupDetailAssignRole")}
                    <CaretDownIcon className="size-3.5" />
                </TextAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setAssignKind("client")}>{t("sxClientDetailClientRoles")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAssignKind("realm")}>{t("sxNavRealmRoles")}</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <div className="flex flex-col gap-4">
            <p className="px-0.5 text-[13px] leading-[1.4] text-muted-foreground">{t("sxClientScopesXScopeIntro")}</p>
            <SearchField value={query} onChange={setQuery} placeholder={t("sxRolesSearch")} />
            <label className="flex items-center gap-2.5 px-0.5 text-[15px]">
                <Checkbox checked={hide} onCheckedChange={(v: any) => setHide(v === true)} />
                {t("sxClientScopesXHideInherited")}
            </label>
            <Section
                label={
                    status === "ready"
                        ? t("sxClientScopesXAssignedCount", { total: assignedCount })
                        : t("sxClientScopesXAssignedRoles")
                }
                action={status === "ready" && assignMenu}
            >
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice title={t("sxClientScopesXMappingsLoadError")} description={t("sxLoadErrorDescription")} onRetry={reload} />
                )}
                {status === "ready" && filtered.length === 0 && (
                    <Notice
                        title={query.trim() ? t("sxRolesNoMatchTitle") : t("sxGroupDetailNoRolesTitle")}
                        description={query.trim() ? t("sxCommonTryDifferentSearch") : t("sxClientScopesXNoMappingsDescription")}
                        action={
                            query.trim() ? undefined : (
                                <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setAssignKind("client")}>
                                    {t("sxGroupDetailAssignRole")}
                                </Button>
                            )
                        }
                    />
                )}
                {status === "ready" && filtered.length > 0 && (
                    <Group>
                        {filtered.map(r => (
                            <RoleLine
                                key={rowKey(r)}
                                row={r}
                                trailing={
                                    r.inherited ? (
                                        <Chip>{t("sxClientScopesXInherited")}</Chip>
                                    ) : (
                                        <TextAction tone="danger" onClick={() => unassign(r)}>
                                            {t("sxGroupDetailUnassign")}
                                        </TextAction>
                                    )
                                }
                            />
                        ))}
                    </Group>
                )}
            </Section>
            {assignKind && (
                <AssignRolesModal
                    resource={resource}
                    id={id}
                    name={name}
                    initialKind={assignKind}
                    onClose={() => setAssignKind(null)}
                    onDone={() => {
                        setAssignKind(null);
                        reload();
                    }}
                />
            )}
            {confirmNode}
        </div>
    );
}

function AssignRolesModal({ resource, id, name, initialKind, onClose, onDone }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [kind, setKind] = useState(initialKind);
    const [query, setQuery] = useState("");
    const [applied, setApplied] = useState("");
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [items, setItems] = useState<any[]>([]);
    const [hasNext, setHasNext] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [selected, setSelected] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const h = setTimeout(() => {
            setApplied(query.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(h);
    }, [query]);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        const run =
            kind === "realm"
                ? adminClient[resource].listAvailableRealmScopeMappings({ id }).then((list: any[]) =>
                      (list || [])
                          .map((role: any) => ({ role }))
                          .sort((a: any, b: any) => (a.role.name || "").localeCompare(b.role.name || ""))
                  )
                : adminFetch(adminClient, realm, `ui-ext/available-roles/${resource}/${encodeURIComponent(id)}`, {
                      first: (page - 1) * PAGE,
                      max: PAGE + 1,
                      search: applied
                  }).then((list: any[]) =>
                      (Array.isArray(list) ? list : []).map((e: any) => ({
                          role: { id: e.id, name: e.role, description: e.description },
                          client: { id: e.clientId, clientId: e.client }
                      }))
                  );
        run.then((list: any[]) => {
            if (!alive) return;
            if (kind === "realm") {
                setItems(list);
                setHasNext(false);
            } else {
                setItems(list.slice(0, PAGE));
                setHasNext(list.length > PAGE);
            }
            setStatus("ready");
        }).catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, resource, id, kind, page, applied, attempt, realm]);

    const visible = useMemo(() => {
        if (kind !== "realm" || !applied) return items;
        const q = applied.toLowerCase();
        return items.filter(r => (r.role.name || "").toLowerCase().includes(q));
    }, [items, kind, applied]);

    const toggle = (row: any) =>
        setSelected(prev => {
            const next = { ...prev };
            const k = rowKey(row);
            if (next[k]) delete next[k];
            else next[k] = row;
            return next;
        });

    const count = Object.keys(selected).length;

    const assign = async () => {
        const chosen = Object.values(selected);
        if (!chosen.length) return;
        setSaving(true);
        try {
            const api = adminClient[resource];
            const realmRoles = chosen.filter((r: any) => !r.client).map((r: any) => ({ id: r.role.id, name: r.role.name }));
            const byClient: Record<string, any[]> = {};
            chosen
                .filter((r: any) => r.client)
                .forEach((r: any) => {
                    (byClient[r.client.id] ||= []).push({ id: r.role.id, name: r.role.name });
                });
            if (realmRoles.length) await api.addRealmScopeMappings({ id }, realmRoles);
            for (const [client, roles] of Object.entries(byClient)) await api.addClientScopeMappings({ id, client }, roles);
            addAlert(t("sxClientScopesXMappingUpdated"), AlertVariant.success);
            onDone();
        } catch (e) {
            addError(t("sxClientScopesXMappingUpdateError"), e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={(o: boolean) => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxClientScopesXAssignTitle", { name })}</ModalTitle>
                </ModalHeader>
                <ModalBody className="space-y-4">
                    <div className="min-w-0 overflow-hidden">
                        <SegmentTabs
                            ariaLabel={t("sxClientScopesXRoleFilter")}
                            value={kind}
                            onChange={(v: string) => {
                                setKind(v);
                                setPage(1);
                            }}
                            items={[
                                { value: "client", label: t("sxClientDetailClientRoles") },
                                { value: "realm", label: t("sxNavRealmRoles") }
                            ]}
                        />
                    </div>
                    <SearchField value={query} onChange={setQuery} placeholder={t("sxRolesSearch")} />
                    <div className="max-h-80 overflow-y-auto">
                        {status === "loading" && <ListSkeleton />}
                        {status === "error" && (
                            <Notice
                                title={t("sxRolesLoadError")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => setAttempt(n => n + 1)}
                            />
                        )}
                        {status === "ready" && visible.length === 0 && (
                            <Notice
                                title={applied ? t("sxRolesNoMatchTitle") : t("sxGroupDetailNoAvailableRolesTitle")}
                                description={applied ? t("sxCommonTryDifferentSearch") : t("sxClientScopesXNoAvailableDescription")}
                            />
                        )}
                        {status === "ready" && visible.length > 0 && (
                            <Group>
                                {visible.map(r => {
                                    const on = !!selected[rowKey(r)];
                                    return (
                                        <li key={rowKey(r)}>
                                            <button
                                                type="button"
                                                role="checkbox"
                                                aria-checked={on}
                                                onClick={() => toggle(r)}
                                                className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                                        {r.client?.clientId && <Chip tone="info">{r.client.clientId}</Chip>}
                                                        <span className="min-w-0 text-[15px] font-medium [overflow-wrap:anywhere]">{r.role.name}</span>
                                                    </div>
                                                    {r.role.description && (
                                                        <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                                            {r.role.description}
                                                        </div>
                                                    )}
                                                </div>
                                                {on && <CheckIcon weight="bold" className="size-4 shrink-0 text-primary" />}
                                            </button>
                                        </li>
                                    );
                                })}
                            </Group>
                        )}
                    </div>
                    {kind === "client" && (
                        <Pager
                            page={page}
                            hasPrev={page > 1}
                            hasNext={hasNext}
                            onPrev={() => setPage(p => Math.max(1, p - 1))}
                            onNext={() => setPage(p => p + 1)}
                        />
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button disabled={saving || count === 0} onClick={assign}>
                        {saving ? t("sxGroupDetailAssigning") : count > 0 ? t("sxGroupDetailAssignCount", { total: count }) : t("sxClientDetailAssign")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
