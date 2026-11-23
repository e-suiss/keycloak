// @ts-nocheck

import { CaretRightIcon, CheckIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Field, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { cn } from "@ui/lib/utils";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useT } from "../ui/i18n";
import {
    AdminPage,
    Chip,
    GROUP,
    Group,
    ListSkeleton,
    Notice,
    Row,
    SearchField,
    SegmentTabs,
    Section,
    SEPARATOR,
    TextAction
} from "../ui/kit";

const BUILTIN_ROLE = (n: string) =>
    n === "offline_access" || n === "uma_authorization" || n.startsWith("default-roles-");

const TABS = [
    { value: "overview", label: "sxIamTabOverview" },
    { value: "perms", label: "sxIamTabPermissions" },
    { value: "roles", label: "sxIamTabRoles" },
    { value: "units", label: "sxIamTabUnits" },
    { value: "admins", label: "sxIamTabAdmins" }
];

export default function IamManagement() {
    const t = useT();
    const [tab, setTab] = useState("overview");

    return (
        <AdminPage
            title={t("sxIamTitle")}
            description={t("sxIamDescription")}
            width="wide"
        >
            <SegmentTabs
                value={tab}
                onChange={setTab}
                items={TABS.map(x => ({ value: x.value, label: t(x.label) }))}
                ariaLabel={t("sxIamTitle")}
            />

            {tab === "overview" && <OverviewTab onGo={setTab} />}
            {tab === "perms" && <PermissionsTab />}
            {tab === "roles" && <RolesTab />}
            {tab === "units" && <UnitsTab />}
            {tab === "admins" && <AdminsTab />}
        </AdminPage>
    );
}

function OverviewTab({ onGo }: { onGo: (tab: string) => void }) {
    const { adminClient } = useAdminClient();
    const t = useT();

    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [data, setData] = useState<any>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setFailed(false);
            try {
                const [clientsRaw, rolesRaw, groups] = await Promise.all([
                    adminClient.clients.find(),
                    adminClient.roles.find(),
                    adminClient.groups.find()
                ]);
                const clients = clientsRaw.filter(
                    (c: any) => !c.clientId.startsWith("$")
                );
                const jobRoles = rolesRaw.filter((r: any) => !BUILTIN_ROLE(r.name));

                const clientRoleLists = await Promise.all(
                    clients.map((c: any) =>
                        adminClient.clients.listRoles({ id: c.id }).catch(() => [])
                    )
                );
                const clientPerms = clients.map((c: any, i: number) => {
                    const roles = clientRoleLists[i] || [];
                    const menus = new Set(roles.map((r: any) => r.name.split(":")[0]));
                    return {
                        clientId: c.clientId,
                        count: roles.length,
                        menus: [...menus]
                    };
                });
                const totalPerms = clientPerms.reduce(
                    (a: number, c: any) => a + c.count,
                    0
                );

                const groupInfo = await Promise.all(
                    groups.map(async (g: any) => {
                        const [rm, mem] = await Promise.all([
                            adminClient.groups
                                .listRealmRoleMappings({ id: g.id })
                                .catch(() => []),
                            adminClient.groups
                                .listMembers({ id: g.id, max: 2000 })
                                .catch(() => [])
                        ]);
                        return { group: g, roles: rm, members: mem };
                    })
                );

                const roleUsage: Record<string, number> = {};
                groupInfo.forEach(gi =>
                    gi.roles.forEach(
                        (r: any) => (roleUsage[r.name] = (roleUsage[r.name] || 0) + 1)
                    )
                );
                const roleComposites = await Promise.all(
                    jobRoles.map((r: any) =>
                        adminClient.roles.getCompositeRoles({ id: r.id }).catch(() => [])
                    )
                );
                const roleRows = jobRoles
                    .map((r: any, i: number) => ({
                        name: r.name,
                        perms: (roleComposites[i] || []).filter((c: any) => c.clientRole)
                            .length,
                        units: roleUsage[r.name] || 0
                    }))
                    .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name));

                const adminMap = new Map<string, any>();
                groupInfo.forEach(gi => {
                    gi.members.forEach((m: any) => {
                        const e = adminMap.get(m.id) || {
                            id: m.id,
                            username: m.username,
                            email: m.email,
                            units: [],
                            roles: new Set()
                        };
                        e.units.push(gi.group.name);
                        gi.roles.forEach((r: any) => e.roles.add(r.name));
                        adminMap.set(m.id, e);
                    });
                });
                const admins = [...adminMap.values()]
                    .map(a => ({ ...a, roles: [...a.roles] }))
                    .sort((a, b) => (a.username || "").localeCompare(b.username || ""));

                const unitRows = groupInfo
                    .map(gi => ({
                        name: gi.group.name,
                        roles: gi.roles.map((r: any) => r.name),
                        members: gi.members.length
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name));

                if (!alive) return;
                setData({
                    stats: {
                        clients: clients.length,
                        perms: totalPerms,
                        roles: jobRoles.length,
                        units: groups.length,
                        admins: adminMap.size
                    },
                    clientPerms: clientPerms.sort((a: any, b: any) => b.count - a.count),
                    unitRows,
                    roleRows,
                    admins
                });
            } catch (e) {
                console.error("[iam] overview load failed:", e);
                if (alive) setFailed(true);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, attempt]);

    if (loading) return <ListSkeleton rows={4} />;
    if (failed || !data)
        return (
            <Notice
                title={t("sxIamOverviewLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={() => setAttempt(n => n + 1)}
            />
        );

    const { stats, clientPerms, unitRows, roleRows, admins } = data;

    return (
        <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <StatCard label={t("sxIamStatClients")} value={stats.clients} onClick={() => onGo("perms")} />
                <StatCard label={t("sxIamStatPermissions")} value={stats.perms} onClick={() => onGo("perms")} />
                <StatCard label={t("sxIamStatRoles")} value={stats.roles} onClick={() => onGo("roles")} />
                <StatCard label={t("sxIamStatUnits")} value={stats.units} onClick={() => onGo("units")} />
                <StatCard label={t("sxIamStatAdmins")} value={stats.admins} onClick={() => onGo("admins")} />
            </div>

            <Panel title={t("sxIamTabAdmins")} desc={t("sxIamOverviewAdminsDesc")}>
                {admins.length === 0 ? (
                    <Notice
                        title={t("sxIamOverviewAdminsEmptyTitle")}
                        description={t("sxIamOverviewAdminsEmptyDescription")}
                        action={
                            <Button size="sm" variant="plain" onClick={() => onGo("admins")}>
                                {t("sxIamGoToAdmins")}
                            </Button>
                        }
                    />
                ) : (
                    <Group>
                        {admins.map((a: any) => (
                            <Row
                                key={a.id}
                                title={a.username}
                                subtitle={
                                    <>
                                        {a.email || "—"}
                                        <ChipLine label={t("sxIamTabUnits")} items={a.units} />
                                        <ChipLine label={t("sxIamJobRoles")} items={a.roles} tone="info" />
                                    </>
                                }
                            />
                        ))}
                    </Group>
                )}
            </Panel>

            <Panel title={t("sxIamTabUnits")} desc={t("sxIamOverviewUnitsDesc")}>
                {unitRows.length === 0 ? (
                    <Notice
                        title={t("sxIamUnitsEmptyTitle")}
                        description={t("sxIamUnitsEmptyDescription")}
                        action={
                            <Button size="sm" variant="plain" onClick={() => onGo("units")}>
                                {t("sxIamGoToUnits")}
                            </Button>
                        }
                    />
                ) : (
                    <Group>
                        {unitRows.map((u: any) => (
                            <Row
                                key={u.name}
                                title={u.name}
                                subtitle={<ChipLine label={t("sxIamJobRoles")} items={u.roles} tone="info" />}
                                trailing={<Count value={u.members} label={t("sxIamCountMembers")} />}
                            />
                        ))}
                    </Group>
                )}
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title={t("sxIamOverviewClientPerms")} desc={t("sxIamOverviewClientPermsDesc")}>
                    {clientPerms.length === 0 ? (
                        <Notice
                            title={t("sxIamClientsEmptyTitle")}
                            description={t("sxIamClientsEmptyDescription")}
                        />
                    ) : (
                        <Group>
                            {clientPerms.map((c: any) => (
                                <Row
                                    key={c.clientId}
                                    title={c.clientId}
                                    trailing={
                                        <span className="flex gap-4">
                                            <Count value={c.count} label={t("sxIamCountPermissions")} />
                                            <Count value={c.menus.length} label={t("sxIamCountMenus")} />
                                        </span>
                                    }
                                />
                            ))}
                        </Group>
                    )}
                </Panel>

                <Panel title={t("sxIamJobRoles")} desc={t("sxIamOverviewRolesDesc")}>
                    {roleRows.length === 0 ? (
                        <Notice
                            title={t("sxIamRolesEmptyTitle")}
                            description={t("sxIamRolesEmptyDescription")}
                            action={
                                <Button size="sm" variant="plain" onClick={() => onGo("roles")}>
                                    {t("sxIamGoToRoles")}
                                </Button>
                            }
                        />
                    ) : (
                        <Group>
                            {roleRows.map((r: any) => (
                                <Row
                                    key={r.name}
                                    title={r.name}
                                    trailing={
                                        <span className="flex gap-4">
                                            <Count value={r.perms} label={t("sxIamCountPermissions")} />
                                            <Count value={r.units} label={t("sxIamCountUnits")} />
                                        </span>
                                    }
                                />
                            ))}
                        </Group>
                    )}
                </Panel>
            </div>
        </>
    );
}

function StatCard({
    label,
    value,
    onClick
}: {
    label: string;
    value: number;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                GROUP,
                "px-4 py-3.5 outline-none transition-colors hover:bg-[#ebebef] focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-[#242426]"
            )}
        >
            <div className="text-[28px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">
                {value}
            </div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">{label}</div>
        </button>
    );
}

function Count({ value, label }: { value: number; label: string }) {
    return (
        <span className="flex flex-col items-end">
            <span className="text-base font-medium tabular-nums">{value}</span>
            <span className="text-[12px] text-muted-foreground">{label}</span>
        </span>
    );
}

function ChipLine({
    label,
    items,
    tone = "neutral",
    max = 5
}: {
    label: string;
    items: string[];
    tone?: "neutral" | "info";
    max?: number;
}) {
    const shown = (items || []).slice(0, max);
    const extra = (items || []).length - shown.length;
    return (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="me-0.5">{label}:</span>
            {shown.length === 0 && <span>—</span>}
            {shown.map(i => (
                <Chip key={i} tone={tone}>
                    {i}
                </Chip>
            ))}
            {extra > 0 && (
                <span title={items.join(", ")}>
                    <Chip>+{extra}</Chip>
                </span>
            )}
        </div>
    );
}

function PermissionsTab() {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const t = useT();

    const [clients, setClients] = useState<any[]>([]);
    const [clientsStatus, setClientsStatus] = useState<"loading" | "error" | "ready">("loading");
    const [clientsAttempt, setClientsAttempt] = useState(0);
    const [clientId, setClientId] = useState("");
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [rolesFailed, setRolesFailed] = useState(false);
    const [menu, setMenu] = useState("");
    const [action, setAction] = useState("");
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let alive = true;
        setClientsStatus("loading");
        adminClient.clients
            .find()
            .then((cs: any[]) => {
                if (!alive) return;
                const list = cs
                    .filter(c => !c.clientId.startsWith("$") && c.protocol !== "saml")
                    .sort((a, b) => a.clientId.localeCompare(b.clientId));
                setClients(list);
                setClientsStatus("ready");
            })
            .catch(e => {
                console.error("[iam] clients load failed:", e);
                if (alive) setClientsStatus("error");
            });
        return () => {
            alive = false;
        };
    }, [adminClient, clientsAttempt]);

    useEffect(() => {
        if (!clientId) {
            setRoles([]);
            setRolesFailed(false);
            return;
        }
        let alive = true;
        (async () => {
            setLoading(true);
            setRolesFailed(false);
            try {
                const r = await adminClient.clients.listRoles({ id: clientId });
                if (alive) setRoles(r.sort((a: any, b: any) => a.name.localeCompare(b.name)));
            } catch (e) {
                console.error("[iam] permissions load failed:", e);
                if (alive) {
                    setRoles([]);
                    setRolesFailed(true);
                }
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, clientId, reload]);

    const create = async () => {
        const m = menu.trim();
        const a = action.trim();
        if (!m || !a || !clientId) return;
        const name = `${m}:${a}`;
        try {
            await adminClient.clients.createRole({ id: clientId, name });
            addAlert(t("sxIamPermissionCreated", { name }), AlertVariant.success);
            setMenu("");
            setAction("");
            setReload(n => n + 1);
        } catch (e) {
            addError(t("sxIamPermissionCreateError"), e as Error);
        }
    };

    const del = async (roleName: string) => {
        try {
            await adminClient.clients.delRole({ id: clientId, roleName });
            addAlert(t("sxIamDeleted", { name: roleName }), AlertVariant.success);
            setReload(n => n + 1);
        } catch (e) {
            addError(t("sxIamDeleteError"), e as Error);
        }
    };

    const grouped: Record<string, string[]> = {};
    for (const r of roles) {
        const [m, ...rest] = r.name.split(":");
        const a = rest.join(":") || t("sxIamNoAction");
        (grouped[m] ||= []).push(a);
    }

    return (
        <>
            <Intro>{t("sxIamPermissionsIntro")}</Intro>

            {clientsStatus === "loading" ? (
                <ListSkeleton rows={1} />
            ) : clientsStatus === "error" ? (
                <Notice
                    title={t("sxIamClientsLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setClientsAttempt(n => n + 1)}
                />
            ) : clients.length === 0 ? (
                <Notice
                    title={t("sxIamClientsEmptyTitle")}
                    description={t("sxIamClientsEmptyDescription")}
                />
            ) : (
                <Field size="lg" className="sm:max-w-sm">
                    <FieldLabel htmlFor="iam-perm-client">{t("sxIamClientField")}</FieldLabel>
                    <NativeSelect
                        id="iam-perm-client"
                        size="lg"
                        value={clientId}
                        onChange={e => setClientId(e.target.value)}
                        className="w-full"
                    >
                        <NativeSelectOption value="">{t("sxIamSelectClient")}</NativeSelectOption>
                        {clients.map(c => (
                            <NativeSelectOption key={c.id} value={c.id}>
                                {c.clientId}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </Field>
            )}

            {clientsStatus === "ready" && clientId && (
                <>
                    <Section label={t("sxIamAddPermission")}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <Field size="lg" className="sm:w-48">
                                <FieldLabel htmlFor="iam-perm-menu">{t("sxIamMenu")}</FieldLabel>
                                <Input
                                    id="iam-perm-menu"
                                    value={menu}
                                    onChange={e =>
                                        setMenu(e.target.value.replace(/[^a-z0-9_-]/gi, ""))
                                    }
                                    placeholder="cards"
                                />
                            </Field>
                            <span className="hidden pb-3 text-muted-foreground sm:block">:</span>
                            <Field size="lg" className="sm:w-48">
                                <FieldLabel htmlFor="iam-perm-action">{t("sxIamAction")}</FieldLabel>
                                <Input
                                    id="iam-perm-action"
                                    value={action}
                                    onChange={e =>
                                        setAction(e.target.value.replace(/[^a-z0-9_-]/gi, ""))
                                    }
                                    placeholder="freeze"
                                    onKeyDown={e => e.key === "Enter" && create()}
                                />
                            </Field>
                            <Button
                                type="button"
                                size="lg"
                                disabled={!menu || !action}
                                onClick={create}
                            >
                                {t("sxIamAddPermission")}
                            </Button>
                        </div>
                        {menu && action && (
                            <p className="mt-2 px-0.5 text-sm text-muted-foreground">
                                →{" "}
                                <code className="text-foreground">
                                    {menu}:{action}
                                </code>
                            </p>
                        )}
                    </Section>

                    <Section label={t("sxIamTabPermissions")}>
                        {loading ? (
                            <ListSkeleton />
                        ) : rolesFailed ? (
                            <Notice
                                title={t("sxIamPermissionsLoadError")}
                                description={t("sxLoadErrorDescription")}
                                onRetry={() => setReload(n => n + 1)}
                            />
                        ) : roles.length === 0 ? (
                            <Notice
                                title={t("sxIamPermissionsEmptyTitle")}
                                description={t("sxIamPermissionsEmptyDescription")}
                            />
                        ) : (
                            <ListGroup>
                                {Object.entries(grouped).map(([m, actions]) => (
                                    <li key={m} className="px-4 py-3">
                                        <div className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            {m}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {actions.map(a => (
                                                <RemovableChip
                                                    key={a}
                                                    onRemove={() => del(`${m}:${a}`)}
                                                >
                                                    {a}
                                                </RemovableChip>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                            </ListGroup>
                        )}
                    </Section>
                </>
            )}
        </>
    );
}

function RolesTab() {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const t = useT();

    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [name, setName] = useState("");
    const [open, setOpen] = useState<string | null>(null);
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setFailed(false);
            try {
                const all = await adminClient.roles.find();
                if (!alive) return;
                setRoles(
                    all
                        .filter((r: any) => !BUILTIN_ROLE(r.name))
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
            } catch (e) {
                console.error("[iam] roles load failed:", e);
                if (alive) setFailed(true);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, reload]);

    const create = async () => {
        const n = name.trim();
        if (!n) return;
        try {
            await adminClient.roles.create({ name: n });
            addAlert(t("sxIamRoleCreated", { name: n }), AlertVariant.success);
            setName("");
            setReload(x => x + 1);
        } catch (e) {
            addError(t("sxIamRoleCreateError"), e as Error);
        }
    };

    const del = async (roleName: string) => {
        try {
            await adminClient.roles.delByName({ name: roleName });
            addAlert(t("sxIamDeleted", { name: roleName }), AlertVariant.success);
            if (open === roleName) setOpen(null);
            setReload(x => x + 1);
        } catch (e) {
            addError(t("sxIamDeleteError"), e as Error);
        }
    };

    return (
        <>
            <Intro>{t("sxIamRolesIntro")}</Intro>

            <CreateRow
                value={name}
                onChange={setName}
                onSubmit={create}
                placeholder={t("sxIamRoleNamePlaceholder")}
                label={t("sxIamCreateRole")}
            />

            <Section label={t("sxIamTabRoles")}>
                {loading ? (
                    <ListSkeleton />
                ) : failed ? (
                    <Notice
                        title={t("sxIamRolesLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setReload(x => x + 1)}
                    />
                ) : roles.length === 0 ? (
                    <Notice
                        title={t("sxIamRolesEmptyTitle")}
                        description={t("sxIamRolesEmptyDescription")}
                    />
                ) : (
                    <ListGroup>
                        {roles.map(r => (
                            <ExpandRow
                                key={r.name}
                                title={r.name}
                                open={open === r.name}
                                onToggle={() => setOpen(open === r.name ? null : r.name)}
                                onDelete={() => del(r.name)}
                            >
                                <RolePermissions role={r} />
                            </ExpandRow>
                        ))}
                    </ListGroup>
                )}
            </Section>
        </>
    );
}

function RolePermissions({ role }: { role: any }) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const t = useT();

    const [clients, setClients] = useState<any[]>([]);
    const [clientId, setClientId] = useState("");
    const [clientRoles, setClientRoles] = useState<any[]>([]);
    const [included, setIncluded] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [baseStatus, setBaseStatus] = useState<"loading" | "error" | "ready">("loading");
    const [baseAttempt, setBaseAttempt] = useState(0);
    const [rolesStatus, setRolesStatus] = useState<"loading" | "error" | "ready">("ready");
    const [rolesAttempt, setRolesAttempt] = useState(0);

    useEffect(() => {
        let alive = true;
        setBaseStatus("loading");
        Promise.all([
            adminClient.clients.find(),
            adminClient.roles.getCompositeRoles({ id: role.id })
        ])
            .then(([cs, comps]: any[]) => {
                if (!alive) return;
                setClients(
                    cs
                        .filter(c => !c.clientId.startsWith("$"))
                        .sort((a, b) => a.clientId.localeCompare(b.clientId))
                );
                setIncluded(new Set(comps.map((c: any) => c.id)));
                setBaseStatus("ready");
            })
            .catch(e => {
                console.error("[iam] role permissions load failed:", e);
                if (alive) setBaseStatus("error");
            });
        return () => {
            alive = false;
        };
    }, [adminClient, role.id, baseAttempt]);

    const refreshIncluded = async () => {
        const comps = await adminClient.roles.getCompositeRoles({ id: role.id });
        setIncluded(new Set(comps.map((c: any) => c.id)));
    };

    useEffect(() => {
        if (!clientId) {
            setClientRoles([]);
            setRolesStatus("ready");
            return;
        }
        let alive = true;
        setRolesStatus("loading");
        adminClient.clients
            .listRoles({ id: clientId })
            .then((r: any[]) => {
                if (!alive) return;
                setClientRoles(r.sort((a, b) => a.name.localeCompare(b.name)));
                setRolesStatus("ready");
            })
            .catch(e => {
                console.error("[iam] client permissions load failed:", e);
                if (alive) {
                    setClientRoles([]);
                    setRolesStatus("error");
                }
            });
        return () => {
            alive = false;
        };
    }, [clientId, adminClient, rolesAttempt]);

    const toggle = async (cr: any, on: boolean) => {
        setBusy(true);
        try {
            if (on) await adminClient.roles.createComposite({ roleId: role.id }, [cr]);
            else await adminClient.roles.delCompositeRoles({ id: role.id }, [cr]);
            await refreshIncluded();
            addAlert(
                on
                    ? t("sxIamItemAdded", { name: cr.name })
                    : t("sxIamItemRemoved", { name: cr.name }),
                AlertVariant.success
            );
        } catch (e) {
            addError(t("sxIamActionFailed"), e as Error);
        } finally {
            setBusy(false);
        }
    };

    if (baseStatus === "loading") return <InlineSkeleton />;
    if (baseStatus === "error")
        return (
            <Notice
                title={t("sxIamRolePermissionsLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={() => setBaseAttempt(n => n + 1)}
            />
        );
    if (clients.length === 0)
        return (
            <Notice
                title={t("sxIamClientsEmptyTitle")}
                description={t("sxIamClientsEmptyDescription")}
            />
        );

    return (
        <div className="flex flex-col gap-3">
            <Field className="sm:max-w-xs">
                <FieldLabel htmlFor={`iam-role-client-${role.id}`}>
                    {t("sxIamSelectClientToAdd")}
                </FieldLabel>
                <NativeSelect
                    id={`iam-role-client-${role.id}`}
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full"
                >
                    <NativeSelectOption value="">{t("sxIamSelectClient")}</NativeSelectOption>
                    {clients.map(c => (
                        <NativeSelectOption key={c.id} value={c.id}>
                            {c.clientId}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </Field>

            {clientId && rolesStatus === "loading" && <InlineSkeleton />}
            {clientId && rolesStatus === "error" && (
                <Notice
                    title={t("sxIamPermissionsLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setRolesAttempt(n => n + 1)}
                />
            )}
            {clientId && rolesStatus === "ready" && (
                <div className="flex flex-wrap gap-1.5">
                    {clientRoles.length === 0 && (
                        <span className="text-sm text-muted-foreground">
                            {t("sxIamClientHasNoPermissions")}
                        </span>
                    )}
                    {clientRoles.map(cr => {
                        const on = included.has(cr.id);
                        return (
                            <Button
                                key={cr.id}
                                type="button"
                                size="xs"
                                variant={on ? "tinted" : "secondary"}
                                aria-pressed={on}
                                disabled={busy}
                                onClick={() => toggle(cr, !on)}
                                className="max-w-full"
                            >
                                {on ? <CheckIcon /> : <PlusIcon />}
                                <span className="truncate">{cr.name}</span>
                            </Button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function UnitsTab() {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const t = useT();

    const [groups, setGroups] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [name, setName] = useState("");
    const [open, setOpen] = useState<string | null>(null);
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setFailed(false);
            try {
                const [g, r] = await Promise.all([
                    adminClient.groups.find(),
                    adminClient.roles.find()
                ]);
                if (!alive) return;
                setGroups(g.sort((a: any, b: any) => a.name.localeCompare(b.name)));
                setRoles(
                    r
                        .filter((x: any) => !BUILTIN_ROLE(x.name))
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
            } catch (e) {
                console.error("[iam] units load failed:", e);
                if (alive) setFailed(true);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, reload]);

    const create = async () => {
        const n = name.trim();
        if (!n) return;
        try {
            await adminClient.groups.create({ name: n });
            addAlert(t("sxIamUnitCreated", { name: n }), AlertVariant.success);
            setName("");
            setReload(x => x + 1);
        } catch (e) {
            addError(t("sxIamUnitCreateError"), e as Error);
        }
    };

    const del = async (g: any) => {
        try {
            await adminClient.groups.del({ id: g.id });
            addAlert(t("sxIamDeleted", { name: g.name }), AlertVariant.success);
            if (open === g.id) setOpen(null);
            setReload(x => x + 1);
        } catch (e) {
            addError(t("sxIamDeleteError"), e as Error);
        }
    };

    return (
        <>
            <Intro>{t("sxIamUnitsIntro")}</Intro>

            <CreateRow
                value={name}
                onChange={setName}
                onSubmit={create}
                placeholder={t("sxIamUnitNamePlaceholder")}
                label={t("sxIamCreateUnit")}
            />

            <Section label={t("sxIamTabUnits")}>
                {loading ? (
                    <ListSkeleton />
                ) : failed ? (
                    <Notice
                        title={t("sxIamUnitsLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setReload(x => x + 1)}
                    />
                ) : groups.length === 0 ? (
                    <Notice
                        title={t("sxIamUnitsEmptyTitle")}
                        description={t("sxIamUnitsEmptyDescription")}
                    />
                ) : (
                    <ListGroup>
                        {groups.map(g => (
                            <ExpandRow
                                key={g.id}
                                title={g.name}
                                open={open === g.id}
                                onToggle={() => setOpen(open === g.id ? null : g.id)}
                                onDelete={() => del(g)}
                            >
                                <UnitDetail group={g} roles={roles} />
                            </ExpandRow>
                        ))}
                    </ListGroup>
                )}
            </Section>
        </>
    );
}

function UnitDetail({ group, roles }: { group: any; roles: any[] }) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const t = useT();

    const [mapped, setMapped] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [reload, setReload] = useState(0);
    const roleByName = (n: string) => roles.find(r => r.name === n);

    useEffect(() => {
        let alive = true;
        Promise.all([
            adminClient.groups.listRealmRoleMappings({ id: group.id }),
            adminClient.groups.listMembers({ id: group.id })
        ])
            .then(([rm, mem]) => {
                if (!alive) return;
                setMapped(rm);
                setMembers(mem);
                setStatus("ready");
            })
            .catch(e => {
                console.error("[iam] unit load failed:", e);
                if (alive) setStatus("error");
            });
        return () => {
            alive = false;
        };
    }, [adminClient, group.id, reload]);

    const addRole = async (n: string) => {
        const r = roleByName(n);
        if (!r) return;
        try {
            await adminClient.groups.addRealmRoleMappings({ id: group.id, roles: [r] });
            addAlert(t("sxIamUnitRoleAdded", { name: n }), AlertVariant.success);
            setReload(x => x + 1);
        } catch (e) {
            addError(t("sxIamAddError"), e as Error);
        }
    };

    const removeRole = async (r: any) => {
        try {
            await adminClient.groups.delRealmRoleMappings({ id: group.id, roles: [r] });
            addAlert(t("sxIamUnitRoleRemoved", { name: r.name }), AlertVariant.success);
            setReload(x => x + 1);
        } catch (e) {
            addError(t("sxIamRemoveError"), e as Error);
        }
    };

    const mappedNames = mapped.map(r => r.name);

    if (status === "loading") return <InlineSkeleton />;
    if (status === "error")
        return (
            <Notice
                title={t("sxIamUnitLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={() => {
                    setStatus("loading");
                    setReload(x => x + 1);
                }}
            />
        );

    return (
        <div className="flex flex-col gap-4">
            <div>
                <Label>{t("sxIamJobRoles")}</Label>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {mapped.length === 0 && (
                        <span className="text-sm text-muted-foreground">{t("sxIamNoRoles")} </span>
                    )}
                    {mapped.map(r => (
                        <RemovableChip key={r.id} onRemove={() => removeRole(r)}>
                            {r.name}
                        </RemovableChip>
                    ))}
                    <Picker
                        options={roles.map(r => r.name).filter(n => !mappedNames.includes(n))}
                        placeholder={t("sxIamAddRolePlaceholder")}
                        onPick={addRole}
                    />
                </div>
            </div>

            <div>
                <Label>{t("sxIamMembersCount", { n: members.length })}</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {members.length === 0 ? (
                        <span className="text-sm text-muted-foreground">{t("sxIamNoMembers")}</span>
                    ) : (
                        members.map(m => <Chip key={m.id}>{m.username}</Chip>)
                    )}
                </div>
            </div>
        </div>
    );
}

function AdminsTab() {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const t = useT();

    const [groups, setGroups] = useState<any[]>([]);
    const [groupsStatus, setGroupsStatus] = useState<"loading" | "error" | "ready">("loading");
    const [groupsAttempt, setGroupsAttempt] = useState(0);
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [results, setResults] = useState<any[]>([]);
    const [userGroups, setUserGroups] = useState<Record<string, any[]>>({});

    useEffect(() => {
        let alive = true;
        setGroupsStatus("loading");
        adminClient.groups
            .find()
            .then((g: any[]) => {
                if (!alive) return;
                setGroups(g.sort((a, b) => a.name.localeCompare(b.name)));
                setGroupsStatus("ready");
            })
            .catch(e => {
                console.error("[iam] units load failed:", e);
                if (alive) setGroupsStatus("error");
            });
        return () => {
            alive = false;
        };
    }, [adminClient, groupsAttempt]);

    const loadUserGroups = async (users: any[]) => {
        const map: Record<string, any[]> = {};
        for (const u of users) {
            map[u.id] = await adminClient.users.listGroups({ id: u.id });
        }
        setUserGroups(map);
    };

    const doSearch = async () => {
        const q = search.trim();
        setQuery(q);
        if (!q) {
            setResults([]);
            setSearchStatus("idle");
            return;
        }
        setSearchStatus("loading");
        try {
            const users = await adminClient.users.find({
                search: q,
                max: 10
            });
            await loadUserGroups(users);
            setResults(users);
            setSearchStatus("ready");
        } catch (e) {
            console.error("[iam] user search failed:", e);
            setResults([]);
            setSearchStatus("error");
        }
    };

    const join = async (userId: string, groupId: string, groupName: string) => {
        try {
            await adminClient.users.addToGroup({ id: userId, groupId });
            addAlert(t("sxIamAddedToUnit", { name: groupName }), AlertVariant.success);
            await loadUserGroups(results);
        } catch (e) {
            addError(t("sxIamAddError"), e as Error);
        }
    };

    const leave = async (userId: string, g: any) => {
        try {
            await adminClient.users.delFromGroup({ id: userId, groupId: g.id });
            addAlert(t("sxIamRemovedFromUnit", { name: g.name }), AlertVariant.success);
            await loadUserGroups(results);
        } catch (e) {
            addError(t("sxIamRemoveError"), e as Error);
        }
    };

    return (
        <>
            <Intro>{t("sxIamAdminsIntro")}</Intro>

            <div className="flex gap-2">
                <SearchField
                    value={search}
                    onChange={setSearch}
                    onEnter={doSearch}
                    placeholder={t("sxIamUserSearchPlaceholder")}
                    className="min-w-0 flex-1"
                />
                <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="h-13.5"
                    onClick={doSearch}
                >
                    {t("sxIamSearch")}
                </Button>
            </div>

            <Section label={t("sxIamTabAdmins")}>
                {groupsStatus === "loading" || searchStatus === "loading" ? (
                    <ListSkeleton />
                ) : groupsStatus === "error" ? (
                    <Notice
                        title={t("sxIamUnitsLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setGroupsAttempt(n => n + 1)}
                    />
                ) : searchStatus === "error" ? (
                    <Notice
                        title={t("sxIamSearchError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={doSearch}
                    />
                ) : searchStatus === "idle" ? (
                    <Notice
                        title={t("sxIamSearchPromptTitle")}
                        description={t("sxIamSearchPromptDescription")}
                    />
                ) : results.length === 0 ? (
                    <Notice
                        title={t("sxIamSearchNoResultsTitle")}
                        description={t("sxIamSearchNoResultsDescription", { query })}
                    />
                ) : (
                    <ListGroup>
                        {results.map(u => {
                            const gs = userGroups[u.id] || [];
                            const inIds = gs.map(g => g.id);
                            return (
                                <li key={u.id} className="px-4 py-3">
                                    <div className="truncate text-base font-medium">{u.username}</div>
                                    <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                                        {u.email || "—"}
                                    </div>
                                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                        {gs.length === 0 && (
                                            <span className="text-sm text-muted-foreground">—</span>
                                        )}
                                        {gs.map(g => (
                                            <RemovableChip key={g.id} onRemove={() => leave(u.id, g)}>
                                                {g.name}
                                            </RemovableChip>
                                        ))}
                                        <Picker
                                            options={groups
                                                .filter(g => !inIds.includes(g.id))
                                                .map(g => g.name)}
                                            placeholder={t("sxIamSelectUnit")}
                                            onPick={name => {
                                                const g = groups.find(x => x.name === name);
                                                if (g) join(u.id, g.id, g.name);
                                            }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ListGroup>
                )}
            </Section>
        </>
    );
}

function Panel({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
    return (
        <Section label={title}>
            {desc && <p className="-mt-1 mb-2.5 px-0.5 text-[13px] text-muted-foreground">{desc}</p>}
            {children}
        </Section>
    );
}

function Intro({ children }: { children: ReactNode }) {
    return <p className="-mb-2 px-0.5 text-sm leading-[1.45] text-muted-foreground">{children}</p>;
}

function InlineSkeleton() {
    return (
        <div aria-busy="true" className="flex flex-col gap-2 py-1">
            <div aria-hidden className="h-3.5 w-2/5 animate-pulse rounded-md bg-[#e5e5ea] dark:bg-[#2c2c2e]" />
            <div aria-hidden className="h-2.5 w-3/5 animate-pulse rounded-md bg-[#e5e5ea] dark:bg-[#2c2c2e]" />
        </div>
    );
}

function Label({ children }: { children: ReactNode }) {
    return <p className="text-[13px] font-medium text-muted-foreground">{children}</p>;
}

function ListGroup({ children }: { children: ReactNode }) {
    const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
    return (
        <ul className={GROUP}>
            {items.map((child: any, i: number) => (
                <Fragment key={child?.key ?? i}>
                    {i > 0 && <li aria-hidden className={SEPARATOR} />}
                    {child}
                </Fragment>
            ))}
        </ul>
    );
}

function ExpandRow({
    title,
    open,
    onToggle,
    onDelete,
    children
}: {
    title: string;
    open: boolean;
    onToggle: () => void;
    onDelete: () => void;
    children: ReactNode;
}) {
    const t = useT();
    return (
        <li>
            <div className="flex min-h-13 items-stretch">
                <button
                    type="button"
                    aria-expanded={open}
                    onClick={onToggle}
                    className="flex min-w-0 flex-1 items-center gap-2.5 py-3 ps-4 pe-3 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
                >
                    <CaretRightIcon
                        className={cn(
                            "size-3.5 shrink-0 text-muted-foreground transition-transform",
                            open && "rotate-90"
                        )}
                    />
                    <span className="truncate text-base font-medium">{title}</span>
                </button>
                <div className="flex shrink-0 items-center pe-4">
                    <TextAction tone="danger" onClick={onDelete}>
                        {t("sxIamDelete")}
                    </TextAction>
                </div>
            </div>
            {open && (
                <div className="border-t border-[#e5e5ea] px-4 pt-3.5 pb-4 dark:border-[#38383a]">
                    {children}
                </div>
            )}
        </li>
    );
}

function CreateRow({
    value,
    onChange,
    onSubmit,
    placeholder,
    label
}: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    placeholder: string;
    label: string;
}) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row">
            <Input
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onSubmit()}
                placeholder={placeholder}
                aria-label={placeholder}
                className="sm:max-w-sm"
            />
            <Button type="button" size="lg" disabled={!value.trim()} onClick={onSubmit}>
                {label}
            </Button>
        </div>
    );
}

function RemovableChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
    const t = useT();
    return (
        <span className="inline-flex h-6.5 max-w-full items-center gap-0.5 rounded-full border border-[#d2d2d7] ps-2.5 pe-0.5 text-[13px] font-medium dark:border-[#48484a]">
            <span className="truncate">{children}</span>
            <button
                type="button"
                onClick={onRemove}
                title={t("sxIamRemove")}
                aria-label={t("sxIamRemove")}
                className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-black/5 hover:text-[#d70015] focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/8 dark:hover:text-[#ff453a]"
            >
                <XIcon className="size-3" weight="bold" />
            </button>
        </span>
    );
}

function Picker({
    options,
    placeholder,
    onPick
}: {
    options: string[];
    placeholder: string;
    onPick: (v: string) => void;
}) {
    const [value, setValue] = useState("");
    if (options.length === 0) return null;
    return (
        <NativeSelect
            value={value}
            onChange={e => {
                const v = e.target.value;
                if (v) {
                    onPick(v);
                    setValue("");
                } else setValue(v);
            }}
            size="sm"
            aria-label={placeholder}
        >
            <NativeSelectOption value="">{placeholder}</NativeSelectOption>
            {options.map(o => (
                <NativeSelectOption key={o} value={o}>
                    {o}
                </NativeSelectOption>
            ))}
        </NativeSelect>
    );
}
