// @ts-nocheck

import {
    AppWindowIcon,
    CaretRightIcon,
    ClockCounterClockwiseIcon,
    LightningIcon,
    ShieldCheckIcon,
    UserIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@ui/components/card";
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent
} from "@ui/components/chart";
import { Empty, EmptyDescription, EmptyHeader } from "@ui/components/empty";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import { Spinner } from "@ui/components/spinner";
import { Fragment, useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Link } from "react-router-dom";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";

const DAY = 86400000;

const loginChartConfig = {
    value: { label: "Giriş", color: "var(--chart-1)" }
} satisfies ChartConfig;

const PAGE_CLS = "mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8";

export default function Dashboard() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const [loading, setLoading] = useState(true);
    const [info, setInfo] = useState<any>(null);
    const [stats, setStats] = useState({
        users: 0,
        clients: 0,
        roles: 0,
        groups: 0,
        idps: 0
    });
    const [events, setEvents] = useState<any[]>([]);
    const [recentUsers, setRecentUsers] = useState<any[]>([]);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const [realmRep, users, clients, roles, groups, idps, evts, lastUsers] =
                    await Promise.all([
                        adminClient.realms.findOne({ realm }),
                        adminClient.users.count().catch(() => 0),
                        adminClient.clients.find().catch(() => []),
                        adminClient.roles.find().catch(() => []),
                        adminClient.groups.count().catch(() => ({ count: 0 })),
                        adminClient.identityProviders.find().catch(() => []),
                        adminClient.realms
                            .findEvents({ realm, max: 500 })
                            .catch(() => []),
                        adminClient.users
                            .find({ first: 0, max: 5, briefRepresentation: true })
                            .catch(() => [])
                    ]);
                if (!alive) return;
                setInfo(realmRep);
                setStats({
                    users,
                    clients: clients.length,
                    roles: roles.length,
                    groups: groups?.count ?? 0,
                    idps: idps.length
                });
                setEvents(evts);
                setRecentUsers(
                    [...lastUsers].sort(
                        (a, b) => (b.createdTimestamp ?? 0) - (a.createdTimestamp ?? 0)
                    )
                );
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, realm]);

    if (loading) {
        return (
            <div className={PAGE_CLS}>
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            </div>
        );
    }

    // Login activity, last 14 days (real data from events).
    const now = Date.now();
    const days = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now - i * DAY);
        days.push({
            key: d.toISOString().slice(0, 10),
            label: String(d.getDate()),
            value: 0
        });
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    let totalLogins = 0;
    for (const e of events) {
        if (e.type && e.type !== "LOGIN") continue;
        const k = new Date(e.time).toISOString().slice(0, 10);
        if (k in idx) {
            days[idx[k]].value++;
            totalLogins++;
        }
    }

    const tiles = [
        {
            label: "Kullanıcılar",
            value: stats.users,
            to: "users",
            icon: ICON.users
        },
        {
            label: "İstemciler",
            value: stats.clients,
            to: "clients",
            icon: ICON.clients
        },
        {
            label: "Roller",
            value: stats.roles,
            to: "roles",
            icon: ICON.roles
        },
        {
            label: "Gruplar",
            value: stats.groups,
            to: "groups",
            icon: ICON.groups
        }
    ];

    const quick = [
        {
            label: "Kullanıcılar",
            desc: "Hesapları yönet",
            to: "users",
            icon: ICON.users
        },
        {
            label: "İstemciler",
            desc: "Uygulama istemcileri",
            to: "clients",
            icon: ICON.clients
        },
        {
            label: "Oturumlar",
            desc: "Aktif oturumlar",
            to: "sessions",
            icon: ICON.sessions
        },
        {
            label: "Olaylar",
            desc: "Denetim kaydı",
            to: "events",
            icon: ICON.events
        }
    ];

    const recentLogins = events.slice(0, 6);

    return (
        <div className={PAGE_CLS}>
            <div className="space-y-8">
                {/* Stat tiles */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {tiles.map(t => (
                        <Link key={t.label} to={`/${realm}/${t.to}`} className="block">
                            <Card size="sm">
                                <CardHeader>
                                    <CardDescription className="flex items-center gap-2">
                                        {t.icon}
                                        {t.label}
                                    </CardDescription>
                                    <CardTitle className="text-2xl tabular-nums">
                                        {t.value.toLocaleString("tr-TR")}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Login activity chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Giriş Etkinliği · Son 14 Gün</CardTitle>
                        <CardAction>
                            <span className="text-sm font-medium text-muted-foreground tabular-nums">
                                {totalLogins.toLocaleString("tr-TR")} giriş
                            </span>
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        {totalLogins > 0 ? (
                            <div className="space-y-4">
                                <ChartContainer
                                    config={loginChartConfig}
                                    className="aspect-auto h-11 w-full"
                                >
                                    <AreaChart
                                        data={days}
                                        margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                                    >
                                        <Area
                                            dataKey="value"
                                            type="monotone"
                                            stroke="var(--color-value)"
                                            fill="var(--color-value)"
                                            fillOpacity={0.15}
                                            strokeWidth={2}
                                            isAnimationActive={false}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                                <ChartContainer
                                    config={loginChartConfig}
                                    className="aspect-auto h-36 w-full"
                                >
                                    <BarChart accessibilityLayer data={days}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                        />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent />}
                                        />
                                        <Bar
                                            dataKey="value"
                                            fill="var(--color-value)"
                                            radius={6}
                                        />
                                    </BarChart>
                                </ChartContainer>
                            </div>
                        ) : (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyDescription>
                                        Bu dönemde giriş olayı yok (olay kaydı kapalı
                                        olabilir).
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        )}
                    </CardContent>
                </Card>

                {/* Quick access + realm info */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                        <SectionHeader title="Hızlı Erişim" />
                        <ItemGroup>
                            {quick.map(q => (
                                <Item key={q.label} variant="outline" asChild>
                                    <Link to={`/${realm}/${q.to}`}>
                                        <ItemMedia variant="icon">{q.icon}</ItemMedia>
                                        <ItemContent>
                                            <ItemTitle>{q.label}</ItemTitle>
                                            <ItemDescription>{q.desc}</ItemDescription>
                                        </ItemContent>
                                        <ItemActions>
                                            <CaretRightIcon className="text-muted-foreground rtl:rotate-180" />
                                        </ItemActions>
                                    </Link>
                                </Item>
                            ))}
                        </ItemGroup>
                    </div>

                    <div>
                        <SectionHeader
                            title="Realm"
                            action={
                                <Button variant="link" size="sm" asChild>
                                    <Link to={`/${realm}/realm-settings`}>Ayarlar</Link>
                                </Button>
                            }
                        />
                        <Card>
                            <CardContent>
                                <dl className="space-y-3">
                                    <InfoRow label="Ad" value={info?.realm} />
                                    <InfoRow
                                        label="Görünen ad"
                                        value={info?.displayName || "—"}
                                    />
                                    <InfoRow
                                        label="Durum"
                                        value={
                                            <Badge
                                                variant={
                                                    info?.enabled
                                                        ? "outline"
                                                        : "destructive"
                                                }
                                            >
                                                {info?.enabled ? "Etkin" : "Devre dışı"}
                                            </Badge>
                                        }
                                    />
                                    <InfoRow
                                        label="Kullanıcı kaydı"
                                        value={
                                            <Badge
                                                variant={
                                                    info?.registrationAllowed
                                                        ? "outline"
                                                        : "secondary"
                                                }
                                            >
                                                {info?.registrationAllowed
                                                    ? "Açık"
                                                    : "Kapalı"}
                                            </Badge>
                                        }
                                    />
                                    <InfoRow
                                        label="Kimlik sağlayıcı"
                                        value={stats.idps.toLocaleString("tr-TR")}
                                    />
                                    <InfoRow
                                        label="Brute-force"
                                        value={
                                            <Badge
                                                variant={
                                                    info?.bruteForceProtected
                                                        ? "outline"
                                                        : "secondary"
                                                }
                                            >
                                                {info?.bruteForceProtected
                                                    ? "Açık"
                                                    : "Kapalı"}
                                            </Badge>
                                        }
                                    />
                                </dl>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Recent logins + recent users */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                        <SectionHeader
                            title="Son Girişler"
                            action={
                                <Button variant="link" size="sm" asChild>
                                    <Link to={`/${realm}/events`}>Tümü</Link>
                                </Button>
                            }
                        />
                        {recentLogins.length === 0 ? (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyDescription>Olay yok.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <ItemGroup variant="inset">
                                {recentLogins.map((e, i) => {
                                    const who =
                                        e.details?.username || e.userId?.slice(0, 8) || "—";
                                    return (
                                        <Fragment key={i}>
                                            {i > 0 && <ItemSeparator />}
                                            <Item size="sm">
                                                <ItemMedia>
                                                    <Avatar>
                                                        <AvatarFallback className="uppercase">
                                                            {(who || "?").charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </ItemMedia>
                                                <ItemContent className="min-w-0">
                                                    <ItemTitle>{who}</ItemTitle>
                                                    <ItemDescription className="truncate">
                                                        {e.clientId || "—"} ·{" "}
                                                        {new Date(e.time).toLocaleString(
                                                            "tr-TR"
                                                        )}
                                                    </ItemDescription>
                                                </ItemContent>
                                                <ItemActions>
                                                    <Badge variant={eventBadge(e.type)}>
                                                        {eventLabel(e.type)}
                                                    </Badge>
                                                </ItemActions>
                                            </Item>
                                        </Fragment>
                                    );
                                })}
                            </ItemGroup>
                        )}
                    </div>

                    <div>
                        <SectionHeader
                            title="Son Kullanıcılar"
                            action={
                                <Button variant="link" size="sm" asChild>
                                    <Link to={`/${realm}/users`}>Tümü</Link>
                                </Button>
                            }
                        />
                        {recentUsers.length === 0 ? (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyDescription>Kullanıcı yok.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <ItemGroup variant="inset">
                                {recentUsers.map((u, i) => (
                                    <Fragment key={u.id}>
                                        {i > 0 && <ItemSeparator />}
                                        <Item size="sm" asChild>
                                            <Link to={`/${realm}/users/${u.id}`}>
                                                <ItemMedia>
                                                    <Avatar>
                                                        <AvatarFallback className="uppercase">
                                                            {(u.username || "?").charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </ItemMedia>
                                                <ItemContent className="min-w-0">
                                                    <ItemTitle>{u.username}</ItemTitle>
                                                    <ItemDescription className="truncate">
                                                        {u.email || "—"}
                                                    </ItemDescription>
                                                </ItemContent>
                                                <ItemActions>
                                                    <Badge
                                                        variant={
                                                            u.enabled
                                                                ? "outline"
                                                                : "destructive"
                                                        }
                                                    >
                                                        {u.enabled ? "Etkin" : "Pasif"}
                                                    </Badge>
                                                </ItemActions>
                                            </Link>
                                        </Item>
                                    </Fragment>
                                ))}
                            </ItemGroup>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionHeader({ title, action }: { title: string; action?: any }) {
    return (
        <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold tracking-tight">{title}</h3>
            {action}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium text-foreground">{value}</dd>
        </div>
    );
}

function eventBadge(type: string) {
    if (!type) return "secondary";
    if (type === "LOGIN") return "outline";
    if (type.endsWith("_ERROR")) return "destructive";
    if (type === "LOGOUT") return "secondary";
    return "default";
}
function eventLabel(type: string) {
    const map: Record<string, string> = {
        LOGIN: "Giriş",
        LOGOUT: "Çıkış",
        LOGIN_ERROR: "Giriş hatası",
        CODE_TO_TOKEN: "Token",
        REFRESH_TOKEN: "Yenileme",
        REGISTER: "Kayıt"
    };
    return map[type] || type || "—";
}

const ICON = {
    users: <UserIcon />,
    clients: <AppWindowIcon />,
    roles: <ShieldCheckIcon />,
    groups: <UsersThreeIcon />,
    sessions: <ClockCounterClockwiseIcon />,
    events: <LightningIcon />
};
