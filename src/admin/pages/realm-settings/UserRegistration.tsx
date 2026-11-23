// @ts-nocheck

import { PlusIcon, ShieldCheckIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { Fragment, useEffect, useRef, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import {
    Chip,
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
} from "../../ui/kit";
import { adminFetch } from "../../ui/util";
import { ConfirmDialog, Footnote } from "./fields";

function IconTile({ children }: any) {
    return (
        <span className="grid size-8 place-items-center rounded-lg bg-[#e5e5ea] dark:bg-[#2c2c2e] [&_svg]:size-4.5">
            {children}
        </span>
    );
}

function AddLabel({ children }: any) {
    return (
        <span className="inline-flex items-center gap-1 [&_svg]:size-3.5">
            <PlusIcon weight="bold" />
            {children}
        </span>
    );
}

export function UserRegistration({ realm, defaultRole }: any) {
    return (
        <>
            <DefaultRoles realm={realm} defaultRole={defaultRole} />
            <DefaultGroups realm={realm} />
        </>
    );
}

function DefaultRoles({ realm, defaultRole }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const roleId = defaultRole?.id;
    const [roles, setRoles] = useState<any[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [picking, setPicking] = useState(false);
    const [confirm, setConfirm] = useState<any>(null);
    const [clients, setClients] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!roleId) return;
        let alive = true;
        setRoles(null);
        setFailed(false);
        adminClient.roles
            .getCompositeRoles({ id: roleId, realm })
            .then(async (res: any) => {
                const list = res || [];
                const ids = [...new Set(list.filter((r: any) => r.clientRole).map((r: any) => r.containerId))];
                const map: Record<string, string> = {};
                await Promise.all(
                    ids.map(async (id: any) => {
                        try {
                            const c = await adminClient.clients.findOne({ id, realm });
                            map[id] = c?.clientId || id;
                        } catch {
                            map[id] = id;
                        }
                    })
                );
                if (!alive) return;
                setClients(map);
                setRoles(
                    [...list].sort((a: any, b: any) =>
                        `${a.clientRole ? map[a.containerId] : ""} ${a.name}`.localeCompare(
                            `${b.clientRole ? map[b.containerId] : ""} ${b.name}`
                        )
                    )
                );
            })
            .catch(() => alive && setFailed(true));
        return () => {
            alive = false;
        };
    }, [realm, roleId, attempt]);

    const remove = (r: any) =>
        setConfirm({
            title: t("sxRealmSettingsDefaultRoleRemoveTitle"),
            message: t("sxRealmSettingsDefaultRoleRemoveMessage", { name: r.name }),
            confirmLabel: t("sxCommonRemove"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.roles.delCompositeRoles({ id: roleId, realm }, [r]);
                    setRoles(prev => (prev || []).filter(x => x.id !== r.id));
                    addAlert(t("sxRealmSettingsDefaultRoleRemoved"), AlertVariant.success);
                } catch (err) {
                    addError(t("sxRealmSettingsDefaultRoleRemoveError"), err);
                }
            }
        });

    return (
        <Section
            label={t("sxRealmSettingsDefaultRoles")}
            action={roles && <TextAction onClick={() => setPicking(true)}><AddLabel>{t("sxRealmSettingsAssignRole")}</AddLabel></TextAction>}
        >
            {!roleId ? (
                <Notice
                    title={t("sxRealmSettingsDefaultRoleMissingTitle")}
                    description={t("sxRealmSettingsDefaultRoleMissingDescription")}
                />
            ) : failed ? (
                <Notice
                    title={t("sxRealmSettingsDefaultRolesLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            ) : roles === null ? (
                <ListSkeleton />
            ) : roles.length === 0 ? (
                <Notice
                    title={t("sxRealmSettingsNoDefaultRolesTitle")}
                    description={t("sxRealmSettingsNoDefaultRolesDescription")}
                    action={<Button onClick={() => setPicking(true)}>{t("sxRealmSettingsAssignRole")}</Button>}
                />
            ) : (
                <Group>
                    {roles.map(r => (
                        <Row
                            key={r.id}
                            leading={<IconTile><ShieldCheckIcon /></IconTile>}
                            title={r.name}
                            subtitle={r.clientRole ? clients[r.containerId] : r.description || undefined}
                            trailing={
                                <>
                                    {r.clientRole && <Chip>{t("sxRealmSettingsClientRole")}</Chip>}
                                    <TextAction tone="danger" onClick={() => remove(r)}>
                                        {t("sxCommonRemove")}
                                    </TextAction>
                                </>
                            }
                        />
                    ))}
                </Group>
            )}
            <Footnote>{t("sxRealmSettingsDefaultRolesHint", { role: defaultRole?.name || "" })}</Footnote>
            {picking && roleId && (
                <PickRolesModal
                    realm={realm}
                    roleId={roleId}
                    existing={new Set((roles || []).map(r => r.id))}
                    onClose={() => setPicking(false)}
                    onAdded={() => {
                        setPicking(false);
                        setAttempt(n => n + 1);
                    }}
                />
            )}
            <ConfirmDialog opts={confirm} onClose={() => setConfirm(null)} />
        </Section>
    );
}

function PickRolesModal({ realm, roleId, existing, onClose, onAdded }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [kind, setKind] = useState<"realm" | "client">("realm");
    const [query, setQuery] = useState("");
    const [applied, setApplied] = useState("");
    const [items, setItems] = useState<any[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [sel, setSel] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);
    const existingRef = useRef(existing);

    useEffect(() => {
        const h = setTimeout(() => setApplied(query.trim()), 300);
        return () => clearTimeout(h);
    }, [query]);

    useEffect(() => {
        let alive = true;
        setItems(null);
        setFailed(false);
        const task =
            kind === "realm"
                ? adminClient.roles.find({ realm, search: applied || undefined, max: 200 }).then((list: any) =>
                      (list || [])
                          .filter((r: any) => r.id !== roleId && !existingRef.current.has(r.id))
                          .map((r: any) => ({ id: r.id, name: r.name, description: r.description, rep: r }))
                  )
                : adminFetch(adminClient, realm, `ui-ext/available-roles/roles/${encodeURIComponent(roleId)}`, {
                      first: 0,
                      max: 200,
                      search: applied
                  }).then((list: any) =>
                      (Array.isArray(list) ? list : [])
                          .filter((r: any) => !existingRef.current.has(r.id))
                          .map((r: any) => ({
                              id: r.id,
                              name: r.role,
                              client: r.client,
                              description: r.description,
                              rep: { id: r.id, name: r.role, clientRole: true, containerId: r.clientId }
                          }))
                  );
        task.then((list: any) => alive && setItems(list)).catch(() => alive && setFailed(true));
        return () => {
            alive = false;
        };
    }, [realm, roleId, kind, applied, attempt]);

    const toggle = (item: any) =>
        setSel(prev => {
            const next = { ...prev };
            if (next[item.id]) delete next[item.id];
            else next[item.id] = item.rep;
            return next;
        });

    const chosen = Object.values(sel);

    const save = async () => {
        if (!chosen.length) return;
        setSaving(true);
        try {
            await adminClient.roles.createComposite({ roleId, realm }, chosen);
            addAlert(t("sxRealmSettingsDefaultRolesAdded", { total: chosen.length }), AlertVariant.success);
            onAdded();
        } catch (err) {
            addError(t("sxRealmSettingsDefaultRolesAddError"), err);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={(o: boolean) => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxRealmSettingsAssignRole")}</ModalTitle>
                </ModalHeader>
                <ModalBody className="flex flex-col gap-3">
                    <SegmentTabs
                        value={kind}
                        onChange={(v: any) => setKind(v)}
                        items={[
                            { value: "realm", label: t("sxRealmSettingsRealmRoles") },
                            { value: "client", label: t("sxRealmSettingsClientRoles") }
                        ]}
                        ariaLabel={t("sxRealmSettingsRoleKind")}
                    />
                    <SearchField value={query} onChange={setQuery} placeholder={t("sxRealmSettingsSearchRoles")} />
                    <div className="max-h-[50vh] overflow-y-auto">
                        {failed ? (
                            <Notice
                                title={t("sxRealmSettingsRolesLoadError")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => setAttempt(n => n + 1)}
                            />
                        ) : items === null ? (
                            <ListSkeleton />
                        ) : items.length === 0 ? (
                            <Notice
                                title={t("sxRealmSettingsNoAvailableRolesTitle")}
                                description={
                                    applied ? t("sxCommonTryDifferentSearch") : t("sxRealmSettingsNoAvailableRolesDescription")
                                }
                            />
                        ) : (
                            <ul className={GROUP}>
                                {items.map((r, i) => (
                                    <Fragment key={r.id}>
                                        {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                        <li>
                                            <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-black/3 dark:hover:bg-white/4">
                                                <Checkbox checked={!!sel[r.id]} onCheckedChange={() => toggle(r)} />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-base font-medium">{r.name}</span>
                                                    {(r.client || r.description) && (
                                                        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                                                            {r.client || r.description}
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                        </li>
                                    </Fragment>
                                ))}
                            </ul>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="plain" onClick={onClose}>
                        {t("sxCommonCancel")}
                    </Button>
                    <Button disabled={saving || chosen.length === 0} onClick={save}>
                        {saving ? t("sxCommonAdding") : t("sxCommonAddWithCount", { total: chosen.length })}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function DefaultGroups({ realm }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [groups, setGroups] = useState<any[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [picking, setPicking] = useState(false);
    const [confirm, setConfirm] = useState<any>(null);

    useEffect(() => {
        let alive = true;
        setGroups(null);
        setFailed(false);
        adminClient.realms
            .getDefaultGroups({ realm })
            .then((res: any) => alive && setGroups(res || []))
            .catch(() => alive && setFailed(true));
        return () => {
            alive = false;
        };
    }, [realm, attempt]);

    const remove = (g: any) =>
        setConfirm({
            title: t("sxRealmSettingsDefaultGroupRemoveTitle"),
            message: t("sxRealmSettingsDefaultGroupRemoveMessage", { name: g.name }),
            confirmLabel: t("sxCommonRemove"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.realms.removeDefaultGroup({ realm, id: g.id });
                    setGroups(prev => (prev || []).filter(x => x.id !== g.id));
                    addAlert(t("sxRealmSettingsDefaultGroupRemoved"), AlertVariant.success);
                } catch (err) {
                    addError(t("sxRealmSettingsDefaultGroupRemoveError"), err);
                }
            }
        });

    return (
        <Section
            label={t("sxRealmSettingsDefaultGroups")}
            action={groups && <TextAction onClick={() => setPicking(true)}><AddLabel>{t("sxRealmSettingsAddGroups")}</AddLabel></TextAction>}
        >
            {failed ? (
                <Notice
                    title={t("sxRealmSettingsDefaultGroupsLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            ) : groups === null ? (
                <ListSkeleton />
            ) : groups.length === 0 ? (
                <Notice
                    title={t("sxRealmSettingsNoDefaultGroupsTitle")}
                    description={t("sxRealmSettingsNoDefaultGroupsDescription")}
                    action={<Button onClick={() => setPicking(true)}>{t("sxRealmSettingsAddGroups")}</Button>}
                />
            ) : (
                <Group>
                    {groups.map(g => (
                        <Row
                            key={g.id}
                            leading={<IconTile><UsersThreeIcon /></IconTile>}
                            title={g.name}
                            subtitle={g.path}
                            trailing={
                                <TextAction tone="danger" onClick={() => remove(g)}>
                                    {t("sxCommonRemove")}
                                </TextAction>
                            }
                        />
                    ))}
                </Group>
            )}
            <Footnote>{t("sxRealmSettingsDefaultGroupsHint")}</Footnote>
            {picking && (
                <PickGroupsModal
                    realm={realm}
                    existing={new Set((groups || []).map(g => g.id))}
                    onClose={() => setPicking(false)}
                    onAdded={() => {
                        setPicking(false);
                        setAttempt(n => n + 1);
                    }}
                />
            )}
            <ConfirmDialog opts={confirm} onClose={() => setConfirm(null)} />
        </Section>
    );
}

function flattenGroups(list: any[], out: any[] = []) {
    (list || []).forEach(g => {
        out.push(g);
        if (Array.isArray(g.subGroups) && g.subGroups.length) flattenGroups(g.subGroups, out);
    });
    return out;
}

function PickGroupsModal({ realm, existing, onClose, onAdded }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [query, setQuery] = useState("");
    const [applied, setApplied] = useState("");
    const [items, setItems] = useState<any[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const existingRef = useRef(existing);

    useEffect(() => {
        const h = setTimeout(() => setApplied(query.trim()), 300);
        return () => clearTimeout(h);
    }, [query]);

    useEffect(() => {
        let alive = true;
        setItems(null);
        setFailed(false);
        adminClient.groups
            .find({ realm, search: applied || undefined, max: 100, briefRepresentation: true })
            .then((list: any) => {
                if (!alive) return;
                const flat = applied ? flattenGroups(list || []) : list || [];
                const seen = new Set<string>();
                setItems(
                    flat.filter((g: any) => {
                        if (!g.id || seen.has(g.id) || existingRef.current.has(g.id)) return false;
                        seen.add(g.id);
                        return true;
                    })
                );
            })
            .catch(() => alive && setFailed(true));
        return () => {
            alive = false;
        };
    }, [realm, applied, attempt]);

    const toggle = (id: string) =>
        setSel(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const save = async () => {
        const ids = [...sel];
        if (!ids.length) return;
        setSaving(true);
        try {
            await Promise.all(ids.map(id => adminClient.realms.addDefaultGroup({ realm, id })));
            addAlert(t("sxRealmSettingsDefaultGroupsAdded", { total: ids.length }), AlertVariant.success);
            onAdded();
        } catch (err) {
            addError(t("sxRealmSettingsDefaultGroupsAddError"), err);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={(o: boolean) => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>{t("sxRealmSettingsAddGroups")}</ModalTitle>
                </ModalHeader>
                <ModalBody className="flex flex-col gap-3">
                    <SearchField value={query} onChange={setQuery} placeholder={t("sxRealmSettingsSearchGroups")} />
                    <div className="max-h-[50vh] overflow-y-auto">
                        {failed ? (
                            <Notice
                                title={t("sxRealmSettingsGroupsLoadError")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => setAttempt(n => n + 1)}
                            />
                        ) : items === null ? (
                            <ListSkeleton />
                        ) : items.length === 0 ? (
                            <Notice
                                title={t("sxRealmSettingsNoAvailableGroupsTitle")}
                                description={
                                    applied ? t("sxCommonTryDifferentSearch") : t("sxRealmSettingsNoAvailableGroupsDescription")
                                }
                            />
                        ) : (
                            <ul className={GROUP}>
                                {items.map((g, i) => (
                                    <Fragment key={g.id}>
                                        {i > 0 && <li aria-hidden className={SEPARATOR} />}
                                        <li>
                                            <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-black/3 dark:hover:bg-white/4">
                                                <Checkbox checked={sel.has(g.id)} onCheckedChange={() => toggle(g.id)} />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-base font-medium">{g.name}</span>
                                                    {g.path && (
                                                        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                                                            {g.path}
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                        </li>
                                    </Fragment>
                                ))}
                            </ul>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="plain" onClick={onClose}>
                        {t("sxCommonCancel")}
                    </Button>
                    <Button disabled={saving || sel.size === 0} onClick={save}>
                        {saving ? t("sxCommonAdding") : t("sxCommonAddWithCount", { total: sel.size })}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
