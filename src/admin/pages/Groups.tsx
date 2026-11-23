// @ts-nocheck

import {
    ArrowsOutCardinalIcon,
    CaretRightIcon,
    CopyIcon,
    DotsThreeIcon,
    FolderPlusIcon,
    StarIcon,
    TrashIcon,
    UsersIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { Field, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib/utils";
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
import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { AdminPage, Chip, GROUP, ListSkeleton, Notice, SEPARATOR, SearchField, Section, TextAction } from "../ui/kit";
import { useCapabilities } from "../ui/capabilities";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import { DuplicateGroupModal } from "./groups/DuplicateGroupModal";
import { MoveGroupModal } from "./groups/MoveGroupModal";

export default function Groups() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const navigate = useNavigate();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);
    const confirm = setConfirmOpts;

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [roots, setRoots] = useState<any[]>([]);
    const [defaults, setDefaults] = useState<Set<string>>(new Set());
    const [reloadKey, setReloadKey] = useState(0);
    const reload = () => setReloadKey(k => k + 1);

    const [createParent, setCreateParent] = useState<any>(undefined);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [query, setQuery] = useState("");
    const [term, setTerm] = useState("");
    const [moving, setMoving] = useState<any>(null);
    const [duplicating, setDuplicating] = useState<any>(null);
    const caps = useCapabilities();
    const copyPermissions = caps.isFeatureEnabled("ADMIN_FINE_GRAINED_AUTHZ");

    useEffect(() => {
        const timer = setTimeout(() => setTerm(query.trim()), 300);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        let alive = true;
        (async () => {
            setStatus("loading");
            try {
                const [list, def] = await Promise.all([
                    term
                        ? adminClient.groups.find({ search: term, briefRepresentation: false, first: 0, max: 100 })
                        : adminClient.groups.find({ briefRepresentation: false }),
                    adminClient.realms.getDefaultGroups({ realm })
                ]);
                if (!alive) return;
                setRoots(sortGroups(list));
                setDefaults(new Set((def || []).map((g: any) => g.id)));
                setStatus("ready");
            } catch {
                if (alive) setStatus("error");
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, realm, term, reloadKey]);

    const openCreate = (parent: any) => {
        setNewName("");
        setCreateParent(parent ?? null);
    };
    const create = async () => {
        const name = newName.trim();
        if (!name) return;
        setCreating(true);
        try {
            if (createParent)
                await adminClient.groups.createChildGroup(
                    { id: createParent.id },
                    { name }
                );
            else await adminClient.groups.create({ name });
            addAlert(t("sxGroupsCreated"), AlertVariant.success);
            setCreateParent(undefined);
            reload();
        } catch (e) {
            addError(t("sxGroupsCreateError"), e);
        } finally {
            setCreating(false);
        }
    };

    const remove = (g: any) =>
        confirm({
            title: t("sxGroupsDeleteTitle"),
            message: t("sxGroupsDeleteMessage", { name: g.name }),
            confirmLabel: t("sxGroupsDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.groups.del({ id: g.id });
                    addAlert(t("sxGroupsDeleted"), AlertVariant.success);
                    reload();
                } catch (e) {
                    addError(t("sxGroupsDeleteError"), e);
                }
            }
        });

    const toggleDefault = async (g: any) => {
        const isDef = defaults.has(g.id);
        try {
            if (isDef) await adminClient.realms.removeDefaultGroup({ realm, id: g.id });
            else await adminClient.realms.addDefaultGroup({ realm, id: g.id });
            addAlert(
                isDef ? t("sxGroupsDefaultRemoved") : t("sxGroupsDefaultAdded"),
                AlertVariant.success
            );
            setDefaults(prev => {
                const next = new Set(prev);
                isDef ? next.delete(g.id) : next.add(g.id);
                return next;
            });
        } catch (e) {
            addError(t("sxGroupsDefaultError"), e);
        }
    };

    return (
        <AdminPage
            title={t("sxNavGroups")}
            description={t("sxGroupsDescription")}
            actions={<Button onClick={() => openCreate(null)}>{t("sxGroupsNew")}</Button>}
        >
            <SearchField
                value={query}
                onChange={setQuery}
                onEnter={() => setTerm(query.trim())}
                placeholder={t("sxGroupsSearch")}
            />
            <Section label={term ? t("sxGroupsSearchResults") : t("sxNavGroups")}>
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice
                        title={t("sxGroupsLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={reload}
                    />
                )}
                {status === "ready" && roots.length === 0 && term && (
                    <Notice title={t("sxGroupsNoMatchTitle")} description={t("sxGroupsNoMatchDescription")} />
                )}
                {status === "ready" && roots.length === 0 && !term && (
                    <Notice
                        title={t("sxGroupsEmptyTitle")}
                        description={t("sxGroupsEmptyDescription")}
                        action={<Button onClick={() => openCreate(null)}>{t("sxGroupsNew")}</Button>}
                    />
                )}
                {status === "ready" && roots.length > 0 && (
                    <ul key={`${term}:${reloadKey}`} className={GROUP}>
                        {roots.map((g, i) => (
                            <Fragment key={g.id}>
                                {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                <TreeNode
                                    group={g}
                                    depth={0}
                                    defaults={defaults}
                                    term={term}
                                    onOpen={id => navigate(`/${realm}/groups/${id}`)}
                                    onAddChild={openCreate}
                                    onDelete={remove}
                                    onToggleDefault={toggleDefault}
                                    onMove={setMoving}
                                    onDuplicate={setDuplicating}
                                />
                            </Fragment>
                        ))}
                    </ul>
                )}
            </Section>

            <Modal
                open={createParent !== undefined}
                onOpenChange={o => !o && setCreateParent(undefined)}
            >
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>
                            {createParent
                                ? t("sxGroupsSubgroupTitle", { name: createParent.name })
                                : t("sxGroupsNew")}
                        </ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <Field size="lg">
                            <FieldLabel htmlFor="group-create-name">
                                {t("sxGroupsNameLabel")} <span className="text-[#d70015] dark:text-[#ff453a]">*</span>
                            </FieldLabel>
                            <Input
                                id="group-create-name"
                                size="lg"
                                autoFocus
                                value={newName}
                                placeholder={t("sxGroupsNamePlaceholder")}
                                onChange={(e: any) => setNewName(e.target.value)}
                                onKeyDown={(e: any) => e.key === "Enter" && create()}
                            />
                        </Field>
                    </ModalBody>
                    <ModalFooter>
                        <Button disabled={creating || !newName.trim()} onClick={create}>
                            {t("sxGroupsCreate")}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            {moving && (
                <MoveGroupModal
                    group={moving}
                    onClose={() => setMoving(null)}
                    onMoved={() => {
                        setMoving(null);
                        reload();
                    }}
                />
            )}
            {duplicating && (
                <DuplicateGroupModal
                    group={duplicating}
                    copyPermissions={copyPermissions}
                    onClose={() => setDuplicating(null)}
                    onDone={() => {
                        setDuplicating(null);
                        reload();
                    }}
                />
            )}
            <Confirm
                open={!!confirmOpts}
                onOpenChange={o => !o && setConfirmOpts(null)}
            >
                <ConfirmContent>
                    <ConfirmHeader>
                        <ConfirmTitle>{confirmOpts?.title}</ConfirmTitle>
                        {confirmOpts?.message && (
                            <ConfirmDescription>{confirmOpts.message}</ConfirmDescription>
                        )}
                    </ConfirmHeader>
                    <ConfirmFooter>
                        <ConfirmCancel>{t("sxGroupsCancel")}</ConfirmCancel>
                        <ConfirmAction
                            variant={confirmOpts?.danger ? "destructive" : "default"}
                            onClick={() => {
                                const fn = confirmOpts?.onConfirm;
                                setConfirmOpts(null);
                                fn?.();
                            }}
                        >
                            {confirmOpts?.confirmLabel ?? t("sxGroupsConfirm")}
                        </ConfirmAction>
                    </ConfirmFooter>
                </ConfirmContent>
            </Confirm>
        </AdminPage>
    );
}

function sortGroups(list: any[]) {
    return [...(list ?? [])].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

function TreeNode({
    group,
    depth,
    defaults,
    term,
    onOpen,
    onAddChild,
    onDelete,
    onToggleDefault,
    onMove,
    onDuplicate
}: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const preset = term && Array.isArray(group.subGroups) && group.subGroups.length > 0 ? sortGroups(group.subGroups) : null;
    const [open, setOpen] = useState(!!preset);
    const [children, setChildren] = useState<any[] | null>(preset);
    const matched = !!term && (group.name ?? "").toLowerCase().includes(term.toLowerCase());
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const hasChildren = (group.subGroupCount ?? group.subGroups?.length ?? 0) > 0;
    const isDefault = defaults.has(group.id);

    const loadChildren = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const subs = await adminClient.groups.listSubGroups({
                parentId: group.id,
                briefRepresentation: false
            });
            setChildren(sortGroups(subs));
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [adminClient, group.id]);

    const expand = useCallback(async () => {
        if (open) {
            setOpen(false);
            return;
        }
        setOpen(true);
        if (children === null) await loadChildren();
    }, [open, children, loadChildren]);

    const indent = { paddingInlineStart: 8 + depth * 20 };
    const childIndent = { paddingInlineStart: 8 + (depth + 1) * 20 + 36 };

    return (
        <>
            <li className="flex min-h-16 items-center gap-2 py-2 pe-3" style={indent}>
                <button
                    type="button"
                    onClick={expand}
                    aria-label={open ? t("sxGroupsCollapse") : t("sxGroupsExpand")}
                    className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/8",
                        !hasChildren && "invisible"
                    )}
                >
                    <CaretRightIcon className={cn("size-3.5 transition-transform", open && "rotate-90")} weight="bold" />
                </button>
                <button
                    type="button"
                    onClick={() => onOpen(group.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e5e5ea] dark:bg-[#2c2c2e]">
                        <UsersThreeIcon className="size-4.5" />
                    </span>
                    <span className="min-w-0">
                        <span className={cn("block truncate text-base font-medium", matched && "text-primary")}>
                            {group.name}
                        </span>
                        {matched && (
                            <span className="mt-0.5 block truncate font-mono text-[13px] text-muted-foreground">
                                {group.path}
                            </span>
                        )}
                        {isDefault && (
                            <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground sm:hidden">
                                <StarIcon weight="fill" className="size-3" /> {t("sxGroupsDefault")}
                            </span>
                        )}
                    </span>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                    {isDefault && (
                        <span className="hidden sm:flex">
                            <Chip tone="info">
                                <span className="flex items-center gap-1">
                                    <StarIcon weight="fill" className="size-3" /> {t("sxGroupsDefault")}
                                </span>
                            </Chip>
                        </span>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={t("sxGroupsActions")}>
                                <DotsThreeIcon weight="bold" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onOpen(group.id)}>
                                <UsersIcon /> {t("sxGroupsOpen")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddChild(group)}>
                                <FolderPlusIcon /> {t("sxGroupsAddSubgroup")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onToggleDefault(group)}>
                                <StarIcon /> {isDefault ? t("sxGroupsUnsetDefault") : t("sxGroupsSetDefault")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onMove(group)}>
                                <ArrowsOutCardinalIcon /> {t("sxGroupsMoveTo")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDuplicate(group)}>
                                <CopyIcon /> {t("sxGroupsDuplicate")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => onDelete(group)}>
                                <TrashIcon /> {t("sxGroupsDelete")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </li>
            {open &&
                (loading ? (
                    <>
                        <li aria-hidden className={SEPARATOR} />
                        <li className="flex min-h-12 flex-col justify-center gap-2 py-2 pe-4" style={childIndent}>
                            <div className="h-3 w-2/5 animate-pulse rounded-md bg-[#e5e5ea] dark:bg-[#2c2c2e]" />
                            <div className="h-2.5 w-1/4 animate-pulse rounded-md bg-[#e5e5ea] dark:bg-[#2c2c2e]" />
                        </li>
                    </>
                ) : failed ? (
                    <>
                        <li aria-hidden className={SEPARATOR} />
                        <li className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 py-2 pe-3 text-[13px] text-muted-foreground" style={childIndent}>
                            <span>{t("sxGroupsSubgroupsLoadError")}</span>
                            <TextAction onClick={loadChildren} className="text-[13px]">
                                {t("sxRetry")}
                            </TextAction>
                        </li>
                    </>
                ) : children && children.length > 0 ? (
                    children.map(c => (
                        <Fragment key={c.id}>
                            <li aria-hidden className={SEPARATOR} />
                            <TreeNode
                                group={c}
                                depth={depth + 1}
                                defaults={defaults}
                                term={term}
                                onOpen={onOpen}
                                onAddChild={onAddChild}
                                onDelete={onDelete}
                                onToggleDefault={onToggleDefault}
                                onMove={onMove}
                                onDuplicate={onDuplicate}
                            />
                        </Fragment>
                    ))
                ) : (
                    <>
                        <li aria-hidden className={SEPARATOR} />
                        <li className="flex min-h-12 items-center py-2 text-[13px] text-muted-foreground" style={childIndent}>
                            {t("sxGroupsNoSubgroups")}
                        </li>
                    </>
                ))}
        </>
    );
}
