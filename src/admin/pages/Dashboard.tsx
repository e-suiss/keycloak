// @ts-nocheck

import {
    AppWindowIcon,
    ShieldCheckIcon,
    SignInIcon,
    UserIcon,
    UserPlusIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent
} from "@ui/components/chart";
import { Widget, WidgetDescription, WidgetHeader, WidgetIcon, WidgetTitle, WidgetValue } from "@ui/components/widget";
import { Button } from "@ui/components/button";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Area, AreaChart, CartesianGrid, Pie, PieChart, XAxis } from "recharts";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAdminClient } from "../admin-client";
import { AdminPage, ListSkeleton, Notice } from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";
import { GrainAvatar, RealmOrb } from "../../shared/brand";
import { useEnvironment } from "../../shared/keycloak-ui-shared";

const DAY = 86400000;

function Monogram({ name }: { name: string }) {
    return (
        <GrainAvatar seed={name} className="size-8 text-[11px]">
            {initials(name)}
        </GrainAvatar>
    );
}

function useLoad(load: () => Promise<any>, adminClient: any, realm: string) {
    const [state, setState] = useState<{
        status: "loading" | "error" | "ready";
        data: any;
    }>({
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
    const { keycloak } = useEnvironment();

    const info = useLoad(() => adminClient.realms.findOne({ realm }), adminClient, realm);
    const stats = useLoad(
        async () => {
            const [users, disabled, clients, roles, groups, defaults, userList, groupList] = await Promise.all([
                adminClient.users.count(),
                adminClient.users.count({ enabled: false }).catch(() => 0),
                adminClient.clients.find(),
                adminClient.roles.find(),
                adminClient.groups.count(),
                adminClient.realms.getDefaultGroups({ realm }).catch(() => []),
                adminClient.users.find({ first: 0, max: 500, briefRepresentation: true }).catch(() => []),
                adminClient.groups.find({ first: 0, max: 5, briefRepresentation: true }).catch(() => [])
            ]);
            const members = await Promise.all(
                (groupList ?? []).map(g =>
                    adminClient.groups
                        .listMembers({ id: g.id, max: 1000, briefRepresentation: true })
                        .then(list => list?.length ?? 0)
                        .catch(() => 0)
                )
            );
            return {
                users: Number(users) || 0,
                clients: clients?.length ?? 0,
                roles: roles?.length ?? 0,
                groups: groups?.count ?? 0,
                created: (userList ?? []).map(u => u.createdTimestamp).filter(Boolean),
                lists: {
                    users: [...(userList ?? [])]
                        .sort((a, b) => (b.createdTimestamp ?? 0) - (a.createdTimestamp ?? 0))
                        .map(u => ({ name: u.username, time: u.createdTimestamp })),
                    clients: (clients ?? []).map(c => ({ name: c.clientId })),
                    roles: (roles ?? []).map(r => ({ name: r.name, composite: r.composite })),
                    groups: (groupList ?? []).map((g, i) => ({ name: g.name, count: members[i] }))
                },
                members: (groupList ?? [])
                    .map((g, i) => ({ name: g.name, value: members[i] }))
                    .sort((a, b) => b.value - a.value),
                footer: {
                    users: Number(disabled) || 0,
                    clients: (clients ?? []).filter(c => c.publicClient).length,
                    roles: (roles ?? []).filter(r => r.composite).length,
                    groups: defaults?.length ?? 0
                }
            };
        },
        adminClient,
        realm
    );
    const events = useLoad(
        async () => (await adminClient.realms.findEvents({ realm, max: 500 })) ?? [],
        adminClient,
        realm
    );
    const recentUsers = useLoad(
        async () => {
            const list =
                (await adminClient.users.find({
                    first: 0,
                    max: 5,
                    briefRepresentation: true
                })) ?? [];
            return [...list].sort((a, b) => (b.createdTimestamp ?? 0) - (a.createdTimestamp ?? 0));
        },
        adminClient,
        realm
    );

    const num = (value: number) => value.toLocaleString(lang);
    const ago = (time: number) => relativeTime(time, lang);

    const user = keycloak?.idTokenParsed ?? {};
    const firstName = user.given_name || user.name?.split(" ")[0] || user.preferred_username;
    const hour = new Date().getHours();
    const greeting = !firstName
        ? t("sxNavDashboard")
        : t(
              hour >= 5 && hour < 12
                  ? "sxDashboardGreetingMorning"
                  : hour >= 12 && hour < 18
                    ? "sxDashboardGreetingAfternoon"
                    : "sxDashboardGreetingEvening",
              { name: firstName }
          );
    const lastSignIn = (events.data ?? []).filter(e => e.type === "LOGIN" && e.userId === user.sub)[1];
    const description =
        info.status === "ready" ? (
            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <RealmOrb name={realm} className="size-4" />
                <span className="font-medium text-foreground">{info.data?.displayName || realm}</span>
                {lastSignIn && (
                    <>
                        <span aria-hidden>·</span>
                        <span>{t("sxDashboardLastSignIn", { time: ago(lastSignIn.time) })}</span>
                    </>
                )}
            </span>
        ) : (
            t("sxDashboardDescription")
        );

    const page = (children: any) => (
        <AdminPage title={greeting} description={description}>
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
            <Notice title={t("sxDashboardLoadError")} description={t("sxLoadErrorDescription")} onRetry={info.retry} />
        );
    }

    const now = Date.now();
    const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now - (13 - i) * DAY);
        return { key: d.toISOString().slice(0, 10), date: d, login: 0, error: 0 };
    });
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    const byClient = new Map<string, number>();
    let totalLogins = 0;
    let failedLogins = 0;
    const eventList = events.data ?? [];
    for (const e of eventList) {
        const k = new Date(e.time).toISOString().slice(0, 10);
        if (!(k in idx)) continue;
        if (e.type === "LOGIN") {
            days[idx[k]].login++;
            totalLogins++;
            byClient.set(e.clientId || "—", (byClient.get(e.clientId || "—") ?? 0) + 1);
        } else if (e.type === "LOGIN_ERROR") {
            days[idx[k]].error++;
            failedLogins++;
        }
    }

    const counts = [
        {
            key: "users",
            label: t("sxNavUsers"),
            to: "users",
            icon: <UserIcon weight="fill" />,
            tone: "text-blue-700 dark:text-blue-400",
            tint: "var(--color-blue-500)",
            footer: "sxDashboardUsersDisabled"
        },
        {
            key: "clients",
            label: t("sxNavClients"),
            to: "clients",
            icon: <AppWindowIcon weight="fill" />,
            tone: "text-orange-700 dark:text-orange-400",
            tint: "var(--color-orange-500)",
            footer: "sxDashboardClientsPublic"
        },
        {
            key: "roles",
            label: t("sxDashboardRoles"),
            to: "roles",
            icon: <ShieldCheckIcon weight="fill" />,
            tone: "text-green-700 dark:text-green-400",
            tint: "var(--color-green-500)",
            footer: "sxDashboardRolesComposite"
        },
        {
            key: "groups",
            label: t("sxNavGroups"),
            to: "groups",
            icon: <UsersThreeIcon weight="fill" />,
            tone: "text-purple-700 dark:text-purple-400",
            tint: "var(--color-purple-500)",
            footer: "sxDashboardGroupsDefault"
        }
    ];

    const recentLogins = [];
    for (const e of eventList) {
        if (e.type !== "LOGIN" && e.type !== "LOGIN_ERROR") continue;
        const last = recentLogins[recentLogins.length - 1];
        if (last && last.type === e.type && last.userId === e.userId && last.clientId === e.clientId) {
            last.repeat++;
            continue;
        }
        if (recentLogins.length === 5) break;
        recentLogins.push({ ...e, repeat: 1 });
    }

    const eventsError = (
        <Notice
            title={t("sxDashboardEventsLoadError")}
            description={t("sxLoadErrorDescription")}
            onRetry={events.retry}
        />
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
                <div data-count-grid className="grid grid-cols-2 items-start gap-4 md:grid-flow-dense md:grid-cols-8">
                    {counts.map(item => (
                        <CountWidget
                            key={item.key}
                            item={item}
                            loading={stats.status === "loading"}
                            value={stats.status === "ready" ? num(stats.data[item.key]) : ""}
                            footer={
                                stats.status === "ready"
                                    ? t(item.footer, { count: num(stats.data.footer[item.key]) })
                                    : "\u00a0"
                            }
                            onOpen={() => navigate(`/${realm}/${item.to}`)}
                            list={
                                <RecentList
                                    rows={
                                        stats.status === "ready"
                                            ? (item.key === "clients"
                                                  ? [...stats.data.lists.clients].sort(
                                                        (a, b) =>
                                                            (byClient.get(b.name) ?? 0) - (byClient.get(a.name) ?? 0)
                                                    )
                                                  : stats.data.lists[item.key]
                                              )
                                                  .slice(0, 3)
                                                  .map(row => ({
                                                      name: row.name,
                                                      meta:
                                                          item.key === "users" && row.time ? (
                                                              relativeTime(row.time, lang, "narrow")
                                                          ) : item.key === "clients" ? (
                                                              num(byClient.get(row.name) ?? 0)
                                                          ) : item.key === "groups" ? (
                                                              num(row.count)
                                                          ) : row.composite ? (
                                                              <span
                                                                  role="img"
                                                                  aria-label={t("sxDashboardRoleComposite")}
                                                                  title={t("sxDashboardRoleComposite")}
                                                                  className="block size-1.5 rounded-full bg-green-500"
                                                              />
                                                          ) : undefined
                                                  }))
                                            : []
                                    }
                                />
                            }
                        >
                            {stats.status === "ready" && (
                                <WidgetChart
                                    kind={item.key}
                                    stats={stats.data}
                                    days={days}
                                    byClient={byClient}
                                    t={t}
                                    lang={lang}
                                    num={num}
                                />
                            )}
                        </CountWidget>
                    ))}
                </div>
            )}

            {events.status === "error" ? (
                eventsError
            ) : (
                <LoginActivity
                    days={days}
                    total={totalLogins}
                    failed={failedLogins}
                    loading={events.status === "loading"}
                    t={t}
                    lang={lang}
                    num={num}
                />
            )}

            <div className="grid items-start gap-4 lg:grid-cols-2">
                <ActivityPanel
                    title={t("sxDashboardRecentLogins")}
                    icon={<SignInIcon weight="bold" />}
                    tone="text-indigo-700 dark:text-indigo-400"
                    seeAll={{ to: `/${realm}/events`, label: t("sxDashboardSeeAll") }}
                    loading={events.status === "loading"}
                >
                    {events.status === "error" ? (
                        eventsError
                    ) : recentLogins.length === 0 ? (
                        <PanelEmpty
                            title={t("sxDashboardNoEventsTitle")}
                            description={t("sxDashboardNoEventsDescription")}
                        />
                    ) : (
                        <ul className="flex flex-col">
                            {recentLogins.map((e, i) => {
                                const who = e.details?.username || e.userId?.slice(0, 8) || "—";
                                const failed = e.type !== "LOGIN";
                                return (
                                    <PanelRow
                                        key={i}
                                        onClick={e.userId ? () => navigate(`/${realm}/users/${e.userId}`) : undefined}
                                        avatar={who}
                                        title={
                                            <>
                                                {who}
                                                {e.repeat > 1 && (
                                                    <span className="ms-1.5 text-xs font-normal text-muted-foreground tabular-nums">
                                                        ×{e.repeat}
                                                    </span>
                                                )}
                                            </>
                                        }
                                        subtitle={
                                            failed ? (
                                                <span className="text-red-600 dark:text-red-400">
                                                    {eventLabel(t, e.type)}
                                                </span>
                                            ) : undefined
                                        }
                                        meta={relativeTime(e.time, lang, "narrow")}
                                        side={e.clientId && <Pill>{e.clientId}</Pill>}
                                    />
                                );
                            })}
                        </ul>
                    )}
                </ActivityPanel>

                <ActivityPanel
                    title={t("sxDashboardRecentUsers")}
                    icon={<UserPlusIcon weight="bold" />}
                    tone="text-blue-700 dark:text-blue-400"
                    seeAll={{ to: `/${realm}/users`, label: t("sxDashboardSeeAll") }}
                    loading={recentUsers.status === "loading"}
                >
                    {recentUsers.status === "error" ? (
                        <Notice
                            title={t("sxDashboardUsersLoadError")}
                            description={t("sxLoadErrorDescription")}
                            onRetry={recentUsers.retry}
                        />
                    ) : recentUsers.data?.length === 0 ? (
                        <PanelEmpty
                            title={t("sxDashboardNoUsersTitle")}
                            description={t("sxDashboardNoUsersDescription")}
                            action={
                                <Button size="sm" onClick={() => navigate(`/${realm}/users`)}>
                                    {t("sxDashboardGoToUsers")}
                                </Button>
                            }
                        />
                    ) : (
                        <ul className="flex flex-col">
                            {(recentUsers.data ?? []).map(u => (
                                <PanelRow
                                    key={u.id}
                                    onClick={() => navigate(`/${realm}/users/${u.id}`)}
                                    avatar={u.username}
                                    title={u.username}
                                    subtitle={u.email}
                                    meta={u.createdTimestamp ? relativeTime(u.createdTimestamp, lang, "narrow") : ""}
                                    side={
                                        <Pill tone={u.enabled ? "success" : "danger"}>
                                            {u.enabled ? t("sxDashboardEnabled") : t("sxDashboardInactive")}
                                        </Pill>
                                    }
                                />
                            ))}
                        </ul>
                    )}
                </ActivityPanel>
            </div>
        </>
    );
}

function ActivityPanel({ title, icon, tone, seeAll, loading, children }: any) {
    return (
        <section className="flex flex-col gap-2 rounded-3xl bg-muted p-4 pb-2">
            <div className="flex items-center justify-between gap-3">
                <WidgetHeader className={`gap-1.5 ${tone}`}>
                    <WidgetIcon size="sm" className={tone}>
                        {icon}
                    </WidgetIcon>
                    <WidgetTitle>{title}</WidgetTitle>
                </WidgetHeader>
                <Link
                    to={seeAll.to}
                    className="rounded-md text-sm font-medium text-primary outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                    {seeAll.label}
                </Link>
            </div>
            {loading ? (
                <ul aria-busy="true" className="flex flex-col">
                    {[0, 1, 2, 3].map(i => (
                        <li key={i} className="flex items-center gap-3 py-2.5">
                            <span className="size-8 animate-pulse rounded-full bg-foreground/8" />
                            <span className="flex flex-1 flex-col gap-1.5">
                                <span className="h-3 w-24 animate-pulse rounded bg-foreground/8" />
                                <span className="h-2.5 w-36 animate-pulse rounded bg-foreground/6" />
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                children
            )}
        </section>
    );
}

function Pill({ tone, children }: { tone?: "success" | "danger"; children: any }) {
    const color =
        tone === "success"
            ? "bg-green-500/12 text-green-700 dark:text-green-400"
            : tone === "danger"
              ? "bg-red-500/12 text-red-700 dark:text-red-400"
              : "bg-background text-muted-foreground dark:bg-white/6";
    return (
        <span className={`min-w-0 max-w-48 truncate rounded-full px-2 py-px text-[11px] font-medium ${color}`}>
            {children}
        </span>
    );
}

function PanelRow({ avatar, title, subtitle, meta, side, onClick }: any) {
    const content = (
        <>
            <Monogram name={avatar} />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">{title}</span>
                    {side}
                </span>
                {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
            </span>
            {meta && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{meta}</span>}
        </>
    );
    const base = "-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-2xl px-2 py-2 text-start outline-none";
    return (
        <li className="border-t border-border/60 first:border-t-0">
            {onClick ? (
                <button
                    type="button"
                    onClick={onClick}
                    className={`${base} transition-colors hover:bg-foreground/4 focus-visible:ring-2 focus-visible:ring-ring/50`}
                >
                    {content}
                </button>
            ) : (
                <div className={base}>{content}</div>
            )}
        </li>
    );
}

function PanelEmpty({ title, description, action }: any) {
    return (
        <div className="flex flex-col items-start gap-1 py-3">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}

const SIZE_KEY = "sx-dashboard-widget-";
const GAP = 16;
const SHORT = 168;
const TALL = 352;
type CountSize = "small" | "default" | "expanded";

function readSize(key: string): CountSize {
    try {
        const value = localStorage.getItem(SIZE_KEY + key);
        return value === "small" || value === "expanded" ? value : "default";
    } catch {
        return "default";
    }
}

function measure(grid: HTMLElement) {
    const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    const column = (grid.clientWidth - GAP * (columns - 1)) / columns;
    const wide = columns >= 8 ? column * 2 + GAP : column;
    const dims: Record<CountSize, [number, number]> = {
        small: columns >= 8 ? [column, SHORT] : [wide, SHORT],
        default: [wide, SHORT],
        expanded: [wide, TALL]
    };
    return dims;
}

function nearest(dims: Record<CountSize, [number, number]>, width: number, height: number): CountSize {
    return (Object.keys(dims) as CountSize[]).reduce((best, size) => {
        const [w, h] = dims[size];
        const [bw, bh] = dims[best];
        return (width - w) ** 2 + (height - h) ** 2 < (width - bw) ** 2 + (height - bh) ** 2 ? size : best;
    });
}

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

function animateLayout(grid: HTMLElement | null | undefined, change: () => void) {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!grid || reduce) {
        change();
        return;
    }
    const cards = [...grid.querySelectorAll<HTMLElement>("[data-count]")].map(card => ({
        card,
        widget: card.querySelector<HTMLElement>("[data-slot=widget]")
    }));
    const below = [...(grid.parentElement?.children ?? [])].filter(
        el => el !== grid && grid.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
    ) as HTMLElement[];
    const before = new Map<HTMLElement, DOMRect>();
    for (const { card, widget } of cards) {
        before.set(card, card.getBoundingClientRect());
        if (widget) before.set(widget, widget.getBoundingClientRect());
    }
    for (const el of below) before.set(el, el.getBoundingClientRect());

    flushSync(change);

    const options = { duration: 500, easing: EASE };
    for (const { card, widget } of cards) {
        const from = before.get(card)!;
        const to = card.getBoundingClientRect();
        const dx = from.left - to.left;
        const dy = from.top - to.top;
        if (dx || dy) card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], options);
        if (!widget) continue;
        const a = before.get(widget)!;
        const b = widget.getBoundingClientRect();
        if (a.width !== b.width || a.height !== b.height) {
            widget.animate(
                [
                    { width: `${a.width}px`, height: `${a.height}px` },
                    { width: `${b.width}px`, height: `${b.height}px` }
                ],
                options
            );
        }
    }
    for (const el of below) {
        const dy = before.get(el)!.top - el.getBoundingClientRect().top;
        if (dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], options);
    }
}

function CountWidget({ item, loading, value, footer, onOpen, list, children }: any) {
    const [size, setSize] = useState<CountSize>(() => readSize(item.key));
    const [drag, setDrag] = useState<{ width: number; height: number; dims: any } | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const wrapper = useRef<HTMLDivElement>(null);

    const commit = (next: CountSize) => {
        animateLayout(wrapper.current?.parentElement, () => setSize(next));
        try {
            localStorage.setItem(SIZE_KEY + item.key, next);
        } catch {}
    };

    const startResize = (event: any) => {
        const widget = ref.current;
        const grid = wrapper.current?.parentElement;
        if (event.button !== 0 || !widget || !grid) return;
        event.preventDefault();
        event.stopPropagation();
        const handle = event.currentTarget;
        handle.setPointerCapture(event.pointerId);
        const direction = getComputedStyle(widget).direction === "rtl" ? -1 : 1;
        const dims = measure(grid);
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = widget.offsetWidth;
        const startHeight = widget.offsetHeight;
        const minWidth = dims.small[0];
        const maxWidth = dims.default[0];
        let last = { width: startWidth, height: startHeight };
        const move = (moveEvent: PointerEvent) => {
            last = {
                width: Math.max(
                    minWidth - 24,
                    Math.min(maxWidth, startWidth + (moveEvent.clientX - startX) * direction)
                ),
                height: Math.max(SHORT, Math.min(TALL + 48, startHeight + moveEvent.clientY - startY))
            };
            setDrag({ ...last, dims });
        };
        const end = () => {
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", end);
            handle.removeEventListener("pointercancel", end);
            setDrag(null);
            commit(nearest(dims, last.width, last.height));
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", end);
        handle.addEventListener("pointercancel", end);
    };

    const target = drag ? nearest(drag.dims, drag.width, drag.height) : size;
    const small = target === "small";

    return (
        <div
            ref={wrapper}
            data-count
            className={`group/count relative ${size === "small" ? "md:col-span-1" : "md:col-span-2"}`}
        >
            {drag && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute start-0 top-0 z-10 animate-in transition-[width,height] duration-500 ease-in-out fade-in-0 motion-reduce:transition-none"
                    style={{ width: drag.dims[target][0], height: drag.dims[target][1] }}
                >
                    <svg aria-hidden fill="none" className="size-full overflow-visible stroke-foreground/25">
                        <rect
                            width="100%"
                            height="100%"
                            rx="24"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                            strokeLinecap="round"
                        />
                    </svg>
                </span>
            )}
            <Widget
                ref={ref}
                role="link"
                tabIndex={0}
                aria-label={`${item.label} ${value}`}
                data-resizing={drag ? "free" : undefined}
                style={
                    drag ? { width: drag.width, height: drag.height } : { height: size === "expanded" ? TALL : SHORT }
                }
                onClick={onOpen}
                onKeyDown={event => {
                    if (event.key === "Enter") onOpen();
                }}
                className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
                <WidgetHeader className={`gap-1.5 ${item.tone}`}>
                    <WidgetIcon size="sm" className={item.tone}>
                        {item.icon}
                    </WidgetIcon>
                    <WidgetTitle>{item.label}</WidgetTitle>
                </WidgetHeader>
                <div className={small ? "mt-auto flex flex-col gap-1" : "flex shrink-0 items-center gap-10"}>
                    <div className="flex shrink-0 flex-col gap-1">
                        {loading ? (
                            <span aria-busy="true" className="h-9 w-12 animate-pulse rounded-lg bg-foreground/8" />
                        ) : (
                            <WidgetValue>{value}</WidgetValue>
                        )}
                        <WidgetDescription className="truncate text-xs">{footer}</WidgetDescription>
                    </div>
                    {!small && list}
                </div>
                {target === "expanded" && (
                    <div className="flex min-h-0 flex-1 flex-col animate-in fade-in-0">{children}</div>
                )}
            </Widget>
            <span
                aria-hidden="true"
                data-slot="widget-handle"
                data-dragging={drag ? "" : undefined}
                onPointerDown={startResize}
                onDoubleClick={() => commit("default")}
                className="group/widget-handle absolute -end-1.5 -bottom-1.5 size-8.5 cursor-nwse-resize touch-none after:absolute after:-inset-3 after:content-[''] rtl:-scale-x-100 rtl:cursor-nesw-resize"
                style={
                    drag
                        ? { insetInlineEnd: "auto", insetInlineStart: drag.width - 28, top: drag.height - 28 }
                        : undefined
                }
            >
                <svg
                    aria-hidden
                    viewBox="0 0 34 34"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="pointer-events-none size-full overflow-visible stroke-border opacity-0 transition-[stroke,opacity] duration-200 group-hover/count:opacity-100 group-hover/widget-handle:stroke-primary group-data-dragging/widget-handle:stroke-primary group-data-dragging/widget-handle:opacity-100 pointer-coarse:opacity-100"
                >
                    <path d="M29.9 13.9A33 33 0 0 1 13.9 29.9" />
                </svg>
            </span>
        </div>
    );
}

function RecentList({ rows }: { rows: { name: string; meta?: any }[] }) {
    if (rows.length === 0) return null;
    return (
        <ul className="hidden min-w-0 flex-1 flex-col md:flex">
            {rows.map(row => (
                <li
                    key={row.name}
                    className="flex min-w-0 items-center justify-between gap-2 border-t py-1 text-[13px] leading-5 first:border-t-0"
                >
                    <span className="min-w-0 truncate">{row.name}</span>
                    {row.meta && (
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{row.meta}</span>
                    )}
                </li>
            ))}
        </ul>
    );
}

function userSeries(stats: any, days: any[]) {
    const series = days.map(d => ({ key: d.key, value: 0 }));
    const index = Object.fromEntries(series.map((d, i) => [d.key, i]));
    for (const time of stats.created) {
        const k = new Date(time).toISOString().slice(0, 10);
        if (k in index) series[index[k]].value++;
    }
    return series;
}

function Bars({ rows, color, num, empty }: any) {
    if (rows.length === 0) return <p className="mt-auto text-xs text-muted-foreground">{empty}</p>;
    const max = Math.max(1, ...rows.map(r => r.value));
    return (
        <ul className="mt-auto flex flex-col gap-2">
            {rows.slice(0, 4).map(row => (
                <li key={row.name} className="flex flex-col gap-1">
                    <div className="flex justify-between gap-2 text-xs">
                        <span className="truncate">{row.name}</span>
                        <span className="text-muted-foreground tabular-nums">{num(row.value)}</span>
                    </div>
                    <span className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <span
                            className="block h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${(row.value / max) * 100}%`, background: color }}
                        />
                    </span>
                </li>
            ))}
        </ul>
    );
}

function WidgetChart({ kind, stats, days, byClient, t, lang, num }: any) {
    const empty = t("sxDashboardNoData");
    const day = (key: string) =>
        days.find(d => d.key === key)?.date.toLocaleDateString(lang, { day: "numeric", month: "short" }) ?? key;

    if (kind === "users") {
        const series = userSeries(stats, days);
        const config = { value: { label: t("sxNavUsers"), color: "var(--color-blue-500)" } } satisfies ChartConfig;
        return (
            <ChartContainer config={config} className="mt-auto aspect-auto h-full max-h-36 min-h-0 w-full">
                <AreaChart data={series} margin={{ top: 6, right: 2, left: 2, bottom: 0 }}>
                    <defs>
                        <linearGradient id="sx-users-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="key" hide />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" labelFormatter={day} />} />
                    <Area
                        dataKey="value"
                        type="monotone"
                        stroke="var(--color-value)"
                        strokeWidth={2}
                        fill="url(#sx-users-fill)"
                    />
                </AreaChart>
            </ChartContainer>
        );
    }

    if (kind === "clients") {
        const config = {
            login: { label: t("sxDashboardLogins"), color: "var(--color-orange-500)" }
        } satisfies ChartConfig;
        return (
            <ChartContainer config={config} className="mt-auto aspect-auto h-full max-h-36 min-h-0 w-full">
                <AreaChart data={days} margin={{ top: 6, right: 2, left: 2, bottom: 0 }}>
                    <defs>
                        <linearGradient id="sx-clients-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-login)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="var(--color-login)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="key" hide />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" labelFormatter={day} />} />
                    <Area
                        dataKey="login"
                        type="monotone"
                        stroke="var(--color-login)"
                        strokeWidth={2}
                        fill="url(#sx-clients-fill)"
                    />
                </AreaChart>
            </ChartContainer>
        );
    }

    if (kind === "roles") {
        const composite = stats.footer.roles;
        const data = [
            { key: "composite", value: composite, fill: "var(--color-composite)" },
            { key: "simple", value: stats.roles - composite, fill: "var(--color-simple)" }
        ];
        const config = {
            value: { label: t("sxDashboardRoles") },
            composite: { label: t("sxDashboardRoleComposite"), color: "var(--color-green-500)" },
            simple: {
                label: t("sxDashboardRoleSimple"),
                color: "color-mix(in oklab, var(--color-green-500) 30%, transparent)"
            }
        } satisfies ChartConfig;
        if (stats.roles === 0) return <p className="mt-auto text-xs text-muted-foreground">{empty}</p>;
        return (
            <ChartContainer config={config} className="mt-auto aspect-auto h-full max-h-40 min-h-0 w-full">
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={data} dataKey="value" nameKey="key" innerRadius="55%" strokeWidth={3} />
                    <ChartLegend content={<ChartLegendContent nameKey="key" />} className="text-xs" />
                </PieChart>
            </ChartContainer>
        );
    }

    return <Bars rows={stats.members} color="var(--color-purple-500)" num={num} empty={empty} />;
}

function LoginActivity({ days, total, failed, loading, t, lang, num }: any) {
    const config = {
        login: { label: t("sxDashboardEventLogin"), color: "var(--chart-1)" },
        error: {
            label: t("sxDashboardEventLoginError"),
            color: "var(--color-red-500)"
        }
    } satisfies ChartConfig;
    const day = (key: string) =>
        days.find(d => d.key === key)?.date.toLocaleDateString(lang, { day: "numeric", month: "short" }) ?? key;

    return (
        <div className="rounded-3xl bg-muted px-4 pt-3.5 pb-3">
            <div className="flex items-end gap-2.5">
                <div className="flex flex-1 flex-col">
                    <span className="text-sm text-muted-foreground">{t("sxDashboardLoginActivity")}</span>
                    {loading ? (
                        <span aria-busy="true" className="mt-1 h-9 w-16 animate-pulse rounded-lg bg-foreground/8" />
                    ) : (
                        <span className="text-3xl font-bold tracking-tight tabular-nums">{num(total)}</span>
                    )}
                </div>
                {!loading && failed > 0 && (
                    <span className="text-sm font-semibold text-destructive">
                        {num(failed)} {t("sxDashboardEventLoginError")}
                    </span>
                )}
            </div>
            {loading ? (
                <div aria-busy="true" className="mt-4 h-52 animate-pulse rounded-2xl bg-foreground/5" />
            ) : total + failed === 0 ? (
                <p className="mt-3 mb-1.5 text-sm text-muted-foreground">{t("sxDashboardNoLoginsDescription")}</p>
            ) : (
                <ChartContainer config={config} className="mt-4 aspect-auto h-56 w-full">
                    <AreaChart accessibilityLayer data={days} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="key"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            minTickGap={16}
                            tickFormatter={day}
                        />
                        <ChartTooltip content={<ChartTooltipContent indicator="dot" labelFormatter={day} />} />
                        <Area
                            dataKey="error"
                            type="monotone"
                            stackId="a"
                            fill="var(--color-error)"
                            fillOpacity={0.4}
                            stroke="var(--color-error)"
                        />
                        <Area
                            dataKey="login"
                            type="monotone"
                            stackId="a"
                            fill="var(--color-login)"
                            fillOpacity={0.4}
                            stroke="var(--color-login)"
                        />
                    </AreaChart>
                </ChartContainer>
            )}
        </div>
    );
}

function relativeTime(time: number, lang: string, style: "long" | "narrow" = "long") {
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto", style });
    const seconds = Math.round((time - Date.now()) / 1000);
    const abs = Math.abs(seconds);
    if (abs < 60) return rtf.format(seconds, "second");
    if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
    if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
    return new Date(time).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });
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
