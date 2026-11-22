// @ts-nocheck
/**
 * Tek sayfadan IAM (yetki) yönetimi — shadcn tasarım dili, doğrudan Keycloak
 * Admin REST API (adminClient) üzerinden. Client OLUŞTURMA burada yok (client'lar
 * başka yerde yönetilir); geri kalan her şeyin oluşturma / listeleme / silme /
 * atama işlemleri burada:
 *
 *   1. İzinler     — bir client'ın "menü:aksiyon" rolleri (client roles)
 *   2. İş Rolleri  — composite realm rolleri (izinleri paketler)
 *   3. Birimler    — gruplar (departman) → iş rolü + üye
 *   4. Adminler    — kullanıcı → birim ataması
 *
 * Yetki modeli CANLI (PDP) olduğu için, buradaki her değişiklik anında geçerlidir.
 */

import { CaretRightIcon, CheckIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    Card as UiCard,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@ui/components/card";
import {
    Empty as UiEmpty,
    EmptyDescription,
    EmptyHeader
} from "@ui/components/empty";
import { Field, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemFooter,
    ItemTitle
} from "@ui/components/item";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { Separator } from "@ui/components/separator";
import { Spinner as UiSpinner } from "@ui/components/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs";
import { cn } from "@ui/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";

// Keycloak'ın kendi/yerleşik rolleri — iş rolü listesinde gizlenir.
const BUILTIN_ROLE = (n: string) =>
    n === "offline_access" || n === "uma_authorization" || n.startsWith("default-roles-");

const TABS = [
    { key: "overview", label: "Genel Bakış" },
    { key: "perms", label: "İzinler" },
    { key: "roles", label: "İş Rolleri" },
    { key: "units", label: "Birimler" },
    { key: "admins", label: "Adminler" }
];

export default function IamManagement() {
    const [tab, setTab] = useState("overview");

    return (
        <div className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <header>
                    <h1 className="font-semibold text-2xl tracking-tight">
                        Yetki Yönetimi
                    </h1>
                    <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                        İzinler, iş rolleri, birimler ve admin atamaları — tek yerden.
                        Değişiklikler anında geçerli olur.
                    </p>
                </header>

                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList variant="line">
                        {TABS.map(t => (
                            <TabsTrigger key={t.key} value={t.key}>
                                {t.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                {tab === "overview" && <OverviewTab onGo={setTab} />}
                {tab === "perms" && <PermissionsTab />}
                {tab === "roles" && <RolesTab />}
                {tab === "units" && <UnitsTab />}
                {tab === "admins" && <AdminsTab />}
            </div>
        </div>
    );
}

/* ────────────────────────── 0. GENEL BAKIŞ (dashboard) ───────────────────── */
function OverviewTab({ onGo }: { onGo: (tab: string) => void }) {
    const { adminClient } = useAdminClient();
    const { addError } = useAlerts();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
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

                // Client izinleri: her client'ın rolleri (menü:aksiyon).
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

                // Gruplar: rol eşlemeleri + üyeler.
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

                // İş rolü kullanımı (kaç birim) + içerdiği izin sayısı.
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

                // Adminler: birim üyeliklerinden türet (user → birimler + roller).
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
                addError("Genel bakış yüklenemedi", e as Error);
            } finally {
                setLoading(false);
            }
        })();
    }, [adminClient, addError]);

    if (loading) {
        return (
            <Card title="Genel Bakış">
                <Spinner />
            </Card>
        );
    }
    if (!data) return <Empty>Veri yok.</Empty>;

    const { stats, clientPerms, unitRows, roleRows, admins } = data;

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <StatCard
                    label="Client (servis)"
                    value={stats.clients}
                    onClick={() => onGo("perms")}
                />
                <StatCard
                    label="İzin"
                    value={stats.perms}
                    onClick={() => onGo("perms")}
                />
                <StatCard
                    label="İş rolü"
                    value={stats.roles}
                    onClick={() => onGo("roles")}
                />
                <StatCard
                    label="Birim"
                    value={stats.units}
                    onClick={() => onGo("units")}
                />
                <StatCard
                    label="Admin"
                    value={stats.admins}
                    onClick={() => onGo("admins")}
                />
            </div>

            <Card
                title="Adminler"
                desc="Kim, hangi birim(ler)de ve bu birimlerden gelen iş rolleri."
            >
                {admins.length === 0 ? (
                    <Empty>Henüz birime atanmış admin yok.</Empty>
                ) : (
                    <DataTable
                        head={["Kullanıcı", "E-posta", "Birimler", "İş rolleri"]}
                        rows={admins.map((a: any) => [
                            <span className="font-medium">{a.username}</span>,
                            a.email || "—",
                            <ChipList items={a.units} tone="amber" />,
                            <ChipList items={a.roles} tone="blue" />
                        ])}
                    />
                )}
            </Card>

            <Card title="Birimler" desc="Her birimin iş rolleri ve üye sayısı.">
                {unitRows.length === 0 ? (
                    <Empty>Henüz birim yok.</Empty>
                ) : (
                    <DataTable
                        head={["Birim", "İş rolleri", "Üye"]}
                        rows={unitRows.map((u: any) => [
                            <span className="font-medium">{u.name}</span>,
                            <ChipList items={u.roles} tone="blue" />,
                            <span className="tabular-nums">{u.members}</span>
                        ])}
                    />
                )}
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
                <Card
                    title="Client izinleri"
                    desc="Her servisin tanımlı izin ve menü sayısı."
                >
                    {clientPerms.length === 0 ? (
                        <Empty>Client yok.</Empty>
                    ) : (
                        <DataTable
                            head={["Client", "İzin", "Menü"]}
                            rows={clientPerms.map((c: any) => [
                                <span className="font-medium">{c.clientId}</span>,
                                <span className="tabular-nums">{c.count}</span>,
                                <span className="tabular-nums">{c.menus.length}</span>
                            ])}
                        />
                    )}
                </Card>

                <Card
                    title="İş rolleri"
                    desc="İçerdiği izin sayısı ve kaç birimde kullanıldığı."
                >
                    {roleRows.length === 0 ? (
                        <Empty>İş rolü yok.</Empty>
                    ) : (
                        <DataTable
                            head={["Rol", "İzin", "Birim"]}
                            rows={roleRows.map((r: any) => [
                                <span className="font-medium">{r.name}</span>,
                                <span className="tabular-nums">{r.perms}</span>,
                                <span className="tabular-nums">{r.units}</span>
                            ])}
                        />
                    )}
                </Card>
            </div>
        </div>
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
        <Item variant="outline" asChild>
            <button type="button" onClick={onClick}>
                <ItemContent className="text-start">
                    <ItemTitle className="text-2xl tabular-nums">{value}</ItemTitle>
                    <ItemDescription>{label}</ItemDescription>
                </ItemContent>
            </button>
        </Item>
    );
}

function ChipList({
    items,
    tone,
    max = 5
}: {
    items: string[];
    tone: "blue" | "amber" | "muted";
    max?: number;
}) {
    if (!items || items.length === 0)
        return <span className="text-muted-foreground">—</span>;
    const variant =
        tone === "blue" ? "default" : tone === "amber" ? "outline" : "secondary";
    const shown = items.slice(0, max);
    const extra = items.length - shown.length;
    return (
        <div className="flex flex-wrap gap-1.5">
            {shown.map(i => (
                <Badge key={i} variant={variant}>
                    {i}
                </Badge>
            ))}
            {extra > 0 && (
                <Badge variant="secondary" title={items.join(", ")}>
                    +{extra}
                </Badge>
            )}
        </div>
    );
}

/* ────────────────────────── 1. İZİNLER (client roles) ───────────────────── */
function PermissionsTab() {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();

    const [clients, setClients] = useState<any[]>([]);
    const [clientId, setClientId] = useState("");
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [menu, setMenu] = useState("");
    const [action, setAction] = useState("");

    useEffect(() => {
        adminClient.clients
            .find()
            .then((cs: any[]) => {
                const list = cs
                    .filter(c => !c.clientId.startsWith("$") && c.protocol !== "saml")
                    .sort((a, b) => a.clientId.localeCompare(b.clientId));
                setClients(list);
            })
            .catch(e => addError("Client'lar yüklenemedi", e as Error));
    }, [adminClient, addError]);

    const loadRoles = useCallback(
        async (id: string) => {
            if (!id) return setRoles([]);
            setLoading(true);
            try {
                const r = await adminClient.clients.listRoles({ id });
                setRoles(r.sort((a: any, b: any) => a.name.localeCompare(b.name)));
            } catch (e) {
                addError("İzinler yüklenemedi", e as Error);
            } finally {
                setLoading(false);
            }
        },
        [adminClient, addError]
    );

    useEffect(() => {
        loadRoles(clientId);
    }, [clientId, loadRoles]);

    const create = async () => {
        const m = menu.trim();
        const a = action.trim();
        if (!m || !a || !clientId) return;
        const name = `${m}:${a}`;
        try {
            await adminClient.clients.createRole({ id: clientId, name });
            addAlert(`"${name}" izni oluşturuldu.`, AlertVariant.success);
            setMenu("");
            setAction("");
            await loadRoles(clientId);
        } catch (e) {
            addError("İzin oluşturulamadı", e as Error);
        }
    };

    const del = async (roleName: string) => {
        try {
            await adminClient.clients.delRole({ id: clientId, roleName });
            addAlert(`"${roleName}" silindi.`, AlertVariant.success);
            await loadRoles(clientId);
        } catch (e) {
            addError("Silinemedi", e as Error);
        }
    };

    // menü:aksiyon → menüye göre grupla
    const grouped: Record<string, string[]> = {};
    for (const r of roles) {
        const [m, ...rest] = r.name.split(":");
        const a = rest.join(":") || "(aksiyon yok)";
        (grouped[m] ||= []).push(a);
    }

    return (
        <Card
            title="İzinler"
            desc="Bir client (servis) seçin; o servisin “menü:aksiyon” izinlerini yönetin."
        >
            <Field className="mb-4 max-w-sm">
                <FieldLabel>Client (servis)</FieldLabel>
                <NativeSelect
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full"
                    size="sm"
                >
                    <NativeSelectOption value="">Client seçin…</NativeSelectOption>
                    {clients.map(c => (
                        <NativeSelectOption key={c.id} value={c.id}>
                            {c.clientId}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </Field>

            {clientId && (
                <>
                    <div className="mb-5 flex flex-wrap items-end gap-2">
                        <Field className="w-auto">
                            <FieldLabel>Menü</FieldLabel>
                            <Input
                                value={menu}
                                onChange={e =>
                                    setMenu(e.target.value.replace(/[^a-z0-9_-]/gi, ""))
                                }
                                placeholder="cards"
                            />
                        </Field>
                        <span className="pb-2 text-muted-foreground">:</span>
                        <Field className="w-auto">
                            <FieldLabel>Aksiyon</FieldLabel>
                            <Input
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
                            disabled={!menu || !action}
                            onClick={create}
                        >
                            İzin ekle
                        </Button>
                        {menu && action && (
                            <span className="pb-2 text-sm text-muted-foreground">
                                →{" "}
                                <code className="text-foreground">
                                    {menu}:{action}
                                </code>
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <Spinner />
                    ) : roles.length === 0 ? (
                        <Empty>Bu client'ta henüz izin yok.</Empty>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(grouped).map(([m, actions]) => (
                                <Item key={m} variant="outline">
                                    <ItemContent>
                                        <ItemDescription className="font-semibold uppercase tracking-wide">
                                            {m}
                                        </ItemDescription>
                                    <div className="flex flex-wrap gap-1.5">
                                        {actions.map(a => (
                                            <Chip
                                                key={a}
                                                onRemove={() => del(`${m}:${a}`)}
                                            >
                                                {a}
                                            </Chip>
                                        ))}
                                    </div>
                                    </ItemContent>
                                </Item>
                            ))}
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}

/* ──────────────────── 2. İŞ ROLLERİ (composite realm roles) ─────────────── */
function RolesTab() {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();

    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [open, setOpen] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const all = await adminClient.roles.find();
            setRoles(
                all
                    .filter((r: any) => !BUILTIN_ROLE(r.name))
                    .sort((a, b) => a.name.localeCompare(b.name))
            );
        } catch (e) {
            addError("Roller yüklenemedi", e as Error);
        } finally {
            setLoading(false);
        }
    }, [adminClient, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const create = async () => {
        const n = name.trim();
        if (!n) return;
        try {
            await adminClient.roles.create({ name: n });
            addAlert(`"${n}" iş rolü oluşturuldu.`, AlertVariant.success);
            setName("");
            await load();
        } catch (e) {
            addError("Rol oluşturulamadı", e as Error);
        }
    };

    const del = async (roleName: string) => {
        try {
            await adminClient.roles.delByName({ name: roleName });
            addAlert(`"${roleName}" silindi.`, AlertVariant.success);
            if (open === roleName) setOpen(null);
            await load();
        } catch (e) {
            addError("Silinemedi", e as Error);
        }
    };

    return (
        <Card
            title="İş Rolleri"
            desc="İzinleri paketleyen composite roller. Bir rolü açıp hangi izinleri içerdiğini düzenleyin."
        >
            <div className="mb-5 flex gap-2">
                <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && create()}
                    placeholder="Rol adı (örn. card-ops)"
                    className="max-w-xs"
                />
                <Button type="button" disabled={!name.trim()} onClick={create}>
                    Rol oluştur
                </Button>
            </div>

            {loading ? (
                <Spinner />
            ) : roles.length === 0 ? (
                <Empty>Henüz iş rolü yok.</Empty>
            ) : (
                <div className="space-y-2">
                    {roles.map(r => (
                        <Item key={r.name} variant="outline" size="sm">
                            <ItemContent>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-fit"
                                    aria-expanded={open === r.name}
                                    onClick={() => setOpen(open === r.name ? null : r.name)}
                                >
                                    <CaretRightIcon
                                        className={cn(
                                            "text-muted-foreground transition-transform",
                                            open === r.name && "rotate-90"
                                        )}
                                    />
                                    {r.name}
                                </Button>
                            </ItemContent>
                            <ItemActions>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => del(r.name)}
                                >
                                    Sil
                                </Button>
                            </ItemActions>
                            {open === r.name && (
                                <ItemFooter className="block">
                                    <Separator className="mb-4" />
                                    <RolePermissions role={r} />
                                </ItemFooter>
                            )}
                        </Item>
                    ))}
                </div>
            )}
        </Card>
    );
}

/** Bir composite role'ün içerdiği client izinlerini (client roles) düzenler. */
function RolePermissions({ role }: { role: any }) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();

    const [clients, setClients] = useState<any[]>([]);
    const [clientId, setClientId] = useState("");
    const [clientRoles, setClientRoles] = useState<any[]>([]);
    const [included, setIncluded] = useState<Set<string>>(new Set()); // composite role id'leri
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        adminClient.clients
            .find()
            .then((cs: any[]) =>
                setClients(
                    cs
                        .filter(c => !c.clientId.startsWith("$"))
                        .sort((a, b) => a.clientId.localeCompare(b.clientId))
                )
            );
    }, [adminClient]);

    const refreshIncluded = useCallback(async () => {
        const comps = await adminClient.roles.getCompositeRoles({ id: role.id });
        setIncluded(new Set(comps.map((c: any) => c.id)));
    }, [adminClient, role.id]);

    useEffect(() => {
        refreshIncluded();
    }, [refreshIncluded]);

    useEffect(() => {
        if (!clientId) return setClientRoles([]);
        adminClient.clients
            .listRoles({ id: clientId })
            .then((r: any[]) =>
                setClientRoles(r.sort((a, b) => a.name.localeCompare(b.name)))
            );
    }, [clientId, adminClient]);

    const toggle = async (cr: any, on: boolean) => {
        setBusy(true);
        try {
            if (on) await adminClient.roles.createComposite({ roleId: role.id }, [cr]);
            else await adminClient.roles.delCompositeRoles({ id: role.id }, [cr]);
            await refreshIncluded();
            addAlert(
                on ? `"${cr.name}" eklendi.` : `"${cr.name}" çıkarıldı.`,
                AlertVariant.success
            );
        } catch (e) {
            addError("İşlem başarısız", e as Error);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <Field className="mb-3 max-w-xs">
                <FieldLabel>İzin eklemek için client seçin</FieldLabel>
                <NativeSelect
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full"
                    size="sm"
                >
                    <NativeSelectOption value="">Client seçin…</NativeSelectOption>
                    {clients.map(c => (
                        <NativeSelectOption key={c.id} value={c.id}>
                            {c.clientId}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </Field>

            {clientId && (
                <div className="flex flex-wrap gap-1.5">
                    {clientRoles.length === 0 && (
                        <span className="text-sm text-muted-foreground">
                            Bu client'ta izin yok.
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
                            >
                                {on ? <CheckIcon /> : <PlusIcon />}
                                {cr.name}
                            </Button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ────────────────────────── 3. BİRİMLER (groups) ────────────────────────── */
function UnitsTab() {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();

    const [groups, setGroups] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [open, setOpen] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [g, r] = await Promise.all([
                adminClient.groups.find(),
                adminClient.roles.find()
            ]);
            setGroups(g.sort((a: any, b: any) => a.name.localeCompare(b.name)));
            setRoles(
                r
                    .filter((x: any) => !BUILTIN_ROLE(x.name))
                    .sort((a, b) => a.name.localeCompare(b.name))
            );
        } catch (e) {
            addError("Birimler yüklenemedi", e as Error);
        } finally {
            setLoading(false);
        }
    }, [adminClient, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const create = async () => {
        const n = name.trim();
        if (!n) return;
        try {
            await adminClient.groups.create({ name: n });
            addAlert(`"${n}" birimi oluşturuldu.`, AlertVariant.success);
            setName("");
            await load();
        } catch (e) {
            addError("Birim oluşturulamadı", e as Error);
        }
    };

    const del = async (g: any) => {
        try {
            await adminClient.groups.del({ id: g.id });
            addAlert(`"${g.name}" silindi.`, AlertVariant.success);
            if (open === g.id) setOpen(null);
            await load();
        } catch (e) {
            addError("Silinemedi", e as Error);
        }
    };

    return (
        <Card
            title="Birimler"
            desc="Departmanlar (gruplar). Bir birimi açıp iş rollerini ve üyelerini yönetin."
        >
            <div className="mb-5 flex gap-2">
                <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && create()}
                    placeholder="Birim adı (örn. Kart Operasyonları)"
                    className="max-w-xs"
                />
                <Button type="button" disabled={!name.trim()} onClick={create}>
                    Birim oluştur
                </Button>
            </div>

            {loading ? (
                <Spinner />
            ) : groups.length === 0 ? (
                <Empty>Henüz birim yok.</Empty>
            ) : (
                <div className="space-y-2">
                    {groups.map(g => (
                        <Item key={g.id} variant="outline" size="sm">
                            <ItemContent>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-fit"
                                    aria-expanded={open === g.id}
                                    onClick={() => setOpen(open === g.id ? null : g.id)}
                                >
                                    <CaretRightIcon
                                        className={cn(
                                            "text-muted-foreground transition-transform",
                                            open === g.id && "rotate-90"
                                        )}
                                    />
                                    {g.name}
                                </Button>
                            </ItemContent>
                            <ItemActions>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => del(g)}
                                >
                                    Sil
                                </Button>
                            </ItemActions>
                            {open === g.id && (
                                <ItemFooter className="block">
                                    <Separator className="mb-4" />
                                    <UnitDetail group={g} roles={roles} />
                                </ItemFooter>
                            )}
                        </Item>
                    ))}
                </div>
            )}
        </Card>
    );
}

/** Bir birimin iş rolleri + üyeleri. */
function UnitDetail({ group, roles }: { group: any; roles: any[] }) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();

    const [mapped, setMapped] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const roleByName = (n: string) => roles.find(r => r.name === n);

    const refresh = useCallback(async () => {
        const [rm, mem] = await Promise.all([
            adminClient.groups.listRealmRoleMappings({ id: group.id }),
            adminClient.groups.listMembers({ id: group.id })
        ]);
        setMapped(rm);
        setMembers(mem);
    }, [adminClient, group.id]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const addRole = async (n: string) => {
        const r = roleByName(n);
        if (!r) return;
        try {
            await adminClient.groups.addRealmRoleMappings({ id: group.id, roles: [r] });
            addAlert(`"${n}" rolü birime eklendi.`, AlertVariant.success);
            await refresh();
        } catch (e) {
            addError("Eklenemedi", e as Error);
        }
    };

    const removeRole = async (r: any) => {
        try {
            await adminClient.groups.delRealmRoleMappings({ id: group.id, roles: [r] });
            addAlert(`"${r.name}" rolü çıkarıldı.`, AlertVariant.success);
            await refresh();
        } catch (e) {
            addError("Çıkarılamadı", e as Error);
        }
    };

    const mappedNames = mapped.map(r => r.name);

    return (
        <div className="space-y-4">
            <div>
                <Label>İş rolleri</Label>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {mapped.length === 0 && (
                        <span className="text-sm text-muted-foreground">
                            Rol yok.{" "}
                        </span>
                    )}
                    {mapped.map(r => (
                        <Chip key={r.id} onRemove={() => removeRole(r)}>
                            {r.name}
                        </Chip>
                    ))}
                    <Picker
                        options={roles
                            .map(r => r.name)
                            .filter(n => !mappedNames.includes(n))}
                        placeholder="Rol ekle…"
                        onPick={addRole}
                    />
                </div>
            </div>

            <div>
                <Label>Üyeler ({members.length})</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {members.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                            Üye yok.
                        </span>
                    ) : (
                        members.map(m => (
                            <Badge key={m.id} variant="secondary">
                                {m.username}
                            </Badge>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

/* ────────────────────────── 4. ADMİNLER (user → unit) ───────────────────── */
function AdminsTab() {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();

    const [groups, setGroups] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [userGroups, setUserGroups] = useState<Record<string, any[]>>({});

    useEffect(() => {
        adminClient.groups
            .find()
            .then((g: any[]) =>
                setGroups(g.sort((a, b) => a.name.localeCompare(b.name)))
            );
    }, [adminClient]);

    const loadUserGroups = useCallback(
        async (users: any[]) => {
            const map: Record<string, any[]> = {};
            for (const u of users) {
                map[u.id] = await adminClient.users.listGroups({ id: u.id });
            }
            setUserGroups(map);
        },
        [adminClient]
    );

    const doSearch = async () => {
        if (!search.trim()) return setResults([]);
        try {
            const users = await adminClient.users.find({
                search: search.trim(),
                max: 10
            });
            setResults(users);
            await loadUserGroups(users);
        } catch (e) {
            addError("Arama başarısız", e as Error);
        }
    };

    const join = async (userId: string, groupId: string, groupName: string) => {
        try {
            await adminClient.users.addToGroup({ id: userId, groupId });
            addAlert(`"${groupName}" birimine eklendi.`, AlertVariant.success);
            await loadUserGroups(results);
        } catch (e) {
            addError("Eklenemedi", e as Error);
        }
    };

    const leave = async (userId: string, g: any) => {
        try {
            await adminClient.users.delFromGroup({ id: userId, groupId: g.id });
            addAlert(`"${g.name}" biriminden çıkarıldı.`, AlertVariant.success);
            await loadUserGroups(results);
        } catch (e) {
            addError("Çıkarılamadı", e as Error);
        }
    };

    return (
        <Card
            title="Adminler"
            desc="Kullanıcı arayın ve birim(ler)e atayın. Bir kişi birime girince o birimin tüm yetkilerini alır."
        >
            <div className="mb-4 flex gap-2">
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && doSearch()}
                    placeholder="Kullanıcı adı / e-posta ara…"
                    className="max-w-md flex-1"
                />
                <Button type="button" variant="secondary" onClick={doSearch}>
                    Ara
                </Button>
            </div>

            {results.length === 0 ? (
                <Empty>Aramak için bir şey yazın.</Empty>
            ) : (
                <DataTable
                    head={["Kullanıcı", "E-posta", "Birimler", "Birime ekle"]}
                    rows={results.map(u => {
                        const gs = userGroups[u.id] || [];
                        const inIds = gs.map(g => g.id);
                        return [
                            <span className="font-medium">{u.username}</span>,
                            u.email || "—",
                            <div className="flex flex-wrap gap-1.5">
                                {gs.length === 0 && (
                                    <span className="text-muted-foreground">—</span>
                                )}
                                {gs.map(g => (
                                    <Chip key={g.id} onRemove={() => leave(u.id, g)}>
                                        {g.name}
                                    </Chip>
                                ))}
                            </div>,
                            <Picker
                                options={groups
                                    .filter(g => !inIds.includes(g.id))
                                    .map(g => g.name)}
                                placeholder="Birim seç…"
                                onPick={name => {
                                    const g = groups.find(x => x.name === name);
                                    if (g) join(u.id, g.id, g.name);
                                }}
                            />
                        ];
                    })}
                />
            )}
        </Card>
    );
}

/* ────────────────────────────── ortak parçalar ──────────────────────────── */
function Card({
    title,
    desc,
    children
}: {
    title: string;
    desc?: string;
    children: React.ReactNode;
}) {
    return (
        <UiCard>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {desc && <CardDescription>{desc}</CardDescription>}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </UiCard>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <p className="text-xs font-medium text-muted-foreground">{children}</p>;
}

function Empty({ children }: { children: React.ReactNode }) {
    return (
        <UiEmpty>
            <EmptyHeader>
                <EmptyDescription>{children}</EmptyDescription>
            </EmptyHeader>
        </UiEmpty>
    );
}

function Spinner() {
    return (
        <div className="grid place-items-center py-12">
            <UiSpinner />
        </div>
    );
}

function Chip({
    children,
    onRemove
}: {
    children: React.ReactNode;
    onRemove: () => void;
}) {
    return (
        <Badge className="pe-0.5">
            {children}
            <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onRemove}
                title="Kaldır"
                aria-label="Kaldır"
                className="size-4"
            >
                <XIcon />
            </Button>
        </Badge>
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

function DataTable({
    head,
    rows,
    className
}: {
    head: string[];
    rows: React.ReactNode[][];
    className?: string;
}) {
    return (
        <Table className={className}>
            <TableHeader>
                <TableRow>
                    {head.map(h => (
                        <TableHead key={h}>{h}</TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((cells, i) => (
                    <TableRow key={i}>
                        {cells.map((c, j) => (
                            <TableCell key={j}>{c}</TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
