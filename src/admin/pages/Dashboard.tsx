// @ts-nocheck

import {
    AppWindowIcon,
    ClockCounterClockwiseIcon,
    LightningIcon,
    ShieldCheckIcon,
    UserIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent
} from "@ui/components/chart";
import { Button } from "@ui/components/button";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Link, useNavigate } from "react-router-dom";
import { useAdminClient } from "../admin-client";
import { AdminPage, Chip, GROUP, Group, ListSkeleton, Notice, Row, Section } from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";

const DAY = 86400000;

const LINK_CLS =
    "rounded-md text-[15px] font-medium text-primary outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50";

function Monogram({ name }: { name: string }) {
    return (
        <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-[11px] font-semibold text-white dark:bg-[#48484a]">
            {initials(name)}
        </span>
    );
}

function IconTile({ children }: { children: any }) {
    return (
        <span className="grid size-8 place-items-center rounded-lg bg-[#e5e5ea] text-foreground dark:bg-[#2c2c2e] [&_svg]:size-4.5">
            {children}
        </span>
    );
}

function useLoad(load: () => Promise<any>, adminClient: any, realm: string) {
    const [state, setState] = useState<{ status: "loading" | "error" | "ready"; data: any }>({
        status: "loading",
        data: null
    });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let alive = true;
        setState({ status: "loading", data: null });
        load()
            .then(data => alive && setState({ status: "ready", data }))
            .catch(() => alive && setState({ status: "error", data: null }));
        return () => {
            alive = false;
        };
    }, [adminClient, realm, attempt]);
    return { ...state, retry: () => setAttempt(n => n + 1) };
}

export default function Dashboard() {
    const t = useT();
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();

    const info = useLoad(() => adminClient.realms.findOne({ realm }), adminClient, realm);
    const stats = useLoad(async () => {
        const [users, clients, roles, groups, idps] = await Promise.all([
            adminClient.users.count(),
            adminClient.clients.find(),
            adminClient.roles.find(),
            adminClient.groups.count(),
            adminClient.identityProviders.find()
        ]);
        return {
            users: Number(users) || 0,
            clients: clients?.length ?? 0,
            roles: roles?.length ?? 0,
            groups: groups?.count ?? 0,
            idps: idps?.length ?? 0
        };
    }, adminClient, realm);
    const events = useLoad(
        async () => (await adminClient.realms.findEvents({ realm, max: 500 })) ?? [],
        adminClient,
        realm
    );
    const recentUsers = useLoad(async () => {
        const list = (await adminClient.users.find({ first: 0, max: 5, briefRepresentation: true })) ?? [];
        return [...list].sort((a, b) => (b.createdTimestamp ?? 0) - (a.createdTimestamp ?? 0));
    }, adminClient, realm);

    const num = (value: number) => value.toLocaleString(lang);

    const page = (children: any) => (
        <AdminPage title={t("sxNavDashboard")} description={t("sxDashboardDescription")}>
            {children}
        </AdminPage>
    );

    if (info.status === "loading") {
        return page(
            <>
                <ListSkeleton rows={2} />
                <ListSkeleton rows={4} />
            </>
        );
    }

    if (info.status === "error") {
        return page(
            <Notice
                title={t("sxDashboardLoadError")}
                description={t("sxLoadErrorDescription")}
                onRetry={info.retry}
            />
        );
    }

    const realmInfo = info.data;
    const loginChartConfig = {
        value: { label: t("sxDashboardLogins"), color: "var(--chart-1)" }
    } satisfies ChartConfig;

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
    const eventList = events.data ?? [];
    for (const e of eventList) {
        if (e.type && e.type !== "LOGIN") continue;
        const k = new Date(e.time).toISOString().slice(0, 10);
        if (k in idx) {
            days[idx[k]].value++;
            totalLogins++;
        }
    }

    const tiles = [
        { key: "users", label: t("sxNavUsers"), to: "users", icon: ICON.users },
        { key: "clients", label: t("sxNavClients"), to: "clients", icon: ICON.clients },
        { key: "roles", label: t("sxDashboardRoles"), to: "roles", icon: ICON.roles },
        { key: "groups", label: t("sxNavGroups"), to: "groups", icon: ICON.groups }
    ];

    const quick = [
        { key: "users", label: t("sxNavUsers"), desc: t("sxDashboardQuickUsers"), to: "users", icon: ICON.users },
        { key: "clients", label: t("sxNavClients"), desc: t("sxDashboardQuickClients"), to: "clients", icon: ICON.clients },
        { key: "sessions", label: t("sxNavSessions"), desc: t("sxDashboardQuickSessions"), to: "sessions", icon: ICON.sessions },
        { key: "events", label: t("sxNavEvents"), desc: t("sxDashboardQuickEvents"), to: "events", icon: ICON.events }
    ];

    const recentLogins = eventList.slice(0, 6);

    const onOff = (value: boolean) => (
        <Chip tone={value ? "success" : "neutral"}>{value ? t("sxDashboardOn") : t("sxDashboardOff")}</Chip>
    );

    const eventsError = (
        <Notice title={t("sxDashboardEventsLoadError")} description={t("sxLoadErrorDescription")} onRetry={events.retry} />
    );

    return page(
        <>
            {stats.status === "error" ? (
                <Notice
                    title={t("sxDashboardStatsLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={stats.retry}
                />
            ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {tiles.map(tile => (
                        <Link
                            key={tile.key}
                            to={`/${realm}/${tile.to}`}
                            className={`${GROUP} block px-4 py-3.5 outline-none transition-colors hover:bg-black/3 focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/4`}
                        >
                            <div className="flex items-center gap-2 text-[13px] text-muted-foreground [&_svg]:size-4">
                                {tile.icon}
                                <span className="truncate">{tile.label}</span>
                            </div>
                            <div className="mt-1.5 text-2xl font-semibold tracking-[-0.01em] tabular-nums">
                                {stats.status === "loading" ? (
                                    <span
                                        aria-busy="true"
                                        className="my-1.5 block h-5 w-12 animate-pulse rounded-md bg-[#e5e5ea] dark:bg-[#2c2c2e]"
                                    />
                                ) : (
                                    num(stats.data[tile.key])
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <Section
                label={t("sxDashboardLoginActivity")}
                action={
                    events.status === "ready" && (
                        <span className="text-[13px] font-medium text-muted-foreground tabular-nums">
                            {t("sxDashboardLoginCount", { total: num(totalLogins) })}
                        </span>
                    )
                }
            >
                {events.status === "loading" ? (
                    <ListSkeleton rows={2} />
                ) : events.status === "error" ? (
                    eventsError
                ) : totalLogins > 0 ? (
                    <div className={`${GROUP} space-y-4 p-4`}>
                        <ChartContainer config={loginChartConfig} className="aspect-auto h-11 w-full">
                            <AreaChart data={days} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
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
                        <ChartContainer config={loginChartConfig} className="aspect-auto h-36 w-full">
                            <BarChart accessibilityLayer data={days}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                <Bar dataKey="value" fill="var(--color-value)" radius={6} />
                            </BarChart>
                        </ChartContainer>
                    </div>
                ) : (
                    <Notice
                        title={t("sxDashboardNoLoginsTitle")}
                        description={t("sxDashboardNoLoginsDescription")}
                    />
                )}
            </Section>

            <div className="grid gap-6 lg:grid-cols-2">
                <Section label={t("sxDashboardQuickAccess")}>
                    <Group>
                        {quick.map(q => (
                            <Row
                                key={q.key}
                                onClick={() => navigate(`/${realm}/${q.to}`)}
                                leading={<IconTile>{q.icon}</IconTile>}
                                title={q.label}
                                subtitle={q.desc}
                            />
                        ))}
                    </Group>
                </Section>

                <Section
                    label="Realm"
                    action={
                        <Link to={`/${realm}/realm-settings`} className={LINK_CLS}>
                            {t("sxDashboardSettings")}
                        </Link>
                    }
                >
                    <Group>
                        <InfoRow
                            label={t("sxDashboardName")}
                            value={<span className="[overflow-wrap:anywhere]">{realmInfo?.realm}</span>}
                        />
                        <InfoRow
                            label={t("sxDashboardDisplayName")}
                            value={<span className="[overflow-wrap:anywhere]">{realmInfo?.displayName || "—"}</span>}
                        />
                        <InfoRow
                            label={t("sxDashboardStatus")}
                            value={
                                <Chip tone={realmInfo?.enabled ? "success" : "danger"}>
                                    {realmInfo?.enabled ? t("sxDashboardEnabled") : t("sxDashboardDisabled")}
                                </Chip>
                            }
                        />
                        <InfoRow label={t("sxDashboardUserRegistration")} value={onOff(realmInfo?.registrationAllowed)} />
                        <InfoRow
                            label={t("sxDashboardIdentityProviders")}
                            value={
                                <span className="tabular-nums">
                                    {stats.status === "ready" ? num(stats.data.idps) : "—"}
                                </span>
                            }
                        />
                        <InfoRow label={t("sxDashboardBruteForce")} value={onOff(realmInfo?.bruteForceProtected)} />
                    </Group>
                </Section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Section
                    label={t("sxDashboardRecentLogins")}
                    action={
                        <Link to={`/${realm}/events`} className={LINK_CLS}>
                            {t("sxDashboardSeeAll")}
                        </Link>
                    }
                >
                    {events.status === "loading" ? (
                        <ListSkeleton />
                    ) : events.status === "error" ? (
                        eventsError
                    ) : recentLogins.length === 0 ? (
                        <Notice title={t("sxDashboardNoEventsTitle")} description={t("sxDashboardNoEventsDescription")} />
                    ) : (
                        <Group>
                            {recentLogins.map((e, i) => {
                                const who = e.details?.username || e.userId?.slice(0, 8) || "—";
                                return (
                                    <Row
                                        key={i}
                                        leading={<Monogram name={who} />}
                                        title={who}
                                        subtitle={`${e.clientId || "—"} · ${new Date(e.time).toLocaleString(lang)}`}
                                        trailing={<Chip tone={eventTone(e.type)}>{eventLabel(t, e.type)}</Chip>}
                                    />
                                );
                            })}
                        </Group>
                    )}
                </Section>

                <Section
                    label={t("sxDashboardRecentUsers")}
                    action={
                        <Link to={`/${realm}/users`} className={LINK_CLS}>
                            {t("sxDashboardSeeAll")}
                        </Link>
                    }
                >
                    {recentUsers.status === "loading" ? (
                        <ListSkeleton />
                    ) : recentUsers.status === "error" ? (
                        <Notice
                            title={t("sxDashboardUsersLoadError")}
                            description={t("sxLoadErrorDescription")}
                            onRetry={recentUsers.retry}
                        />
                    ) : recentUsers.data.length === 0 ? (
                        <Notice
                            title={t("sxDashboardNoUsersTitle")}
                            description={t("sxDashboardNoUsersDescription")}
                            action={
                                <Button onClick={() => navigate(`/${realm}/users`)}>{t("sxDashboardGoToUsers")}</Button>
                            }
                        />
                    ) : (
                        <Group>
                            {recentUsers.data.map(u => (
                                <Row
                                    key={u.id}
                                    onClick={() => navigate(`/${realm}/users/${u.id}`)}
                                    leading={<Monogram name={u.username} />}
                                    title={u.username}
                                    subtitle={u.email || "—"}
                                    trailing={
                                        <Chip tone={u.enabled ? "success" : "danger"}>
                                            {u.enabled ? t("sxDashboardEnabled") : t("sxDashboardInactive")}
                                        </Chip>
                                    }
                                />
                            ))}
                        </Group>
                    )}
                </Section>
            </div>
        </>
    );
}

function InfoRow({ label, value }: { label: string; value: any }) {
    return (
        <li className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5">
            <span className="shrink-0 text-[15px] text-muted-foreground">{label}</span>
            <span className="min-w-0 text-end text-[15px] font-medium">{value}</span>
        </li>
    );
}

function eventTone(type: string) {
    if (!type) return "neutral";
    if (type === "LOGIN") return "success";
    if (type.endsWith("_ERROR")) return "danger";
    if (type === "LOGOUT") return "neutral";
    return "info";
}

const EVENT_LABELS: Record<string, string> = {
    LOGIN: "sxDashboardEventLogin",
    LOGOUT: "sxDashboardEventLogout",
    LOGIN_ERROR: "sxDashboardEventLoginError",
    CODE_TO_TOKEN: "sxDashboardEventCodeToToken",
    REFRESH_TOKEN: "sxDashboardEventRefreshToken",
    REGISTER: "sxDashboardEventRegister"
};

function eventLabel(t: any, type: string) {
    const key = EVENT_LABELS[type];
    return key ? t(key) : type || "—";
}

const ICON = {
    users: <UserIcon />,
    clients: <AppWindowIcon />,
    roles: <ShieldCheckIcon />,
    groups: <UsersThreeIcon />,
    sessions: <ClockCounterClockwiseIcon />,
    events: <LightningIcon />
};
