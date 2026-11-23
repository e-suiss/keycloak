// @ts-nocheck

import {
    AppWindowIcon,
    CaretUpDownIcon,
    CheckIcon,
    GearIcon,
    PlusIcon,
    BuildingsIcon,
    ClockCounterClockwiseIcon,
    DatabaseIcon,
    FileTextIcon,
    FingerprintIcon,
    FlowArrowIcon,
    GearSixIcon,
    HouseIcon,
    IdentificationCardIcon,
    LightningIcon,
    LockKeyIcon,
    ShareNetworkIcon,
    ShieldCheckIcon,
    SidebarSimpleIcon,
    StackIcon,
    UserGearIcon,
    UserIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import { cn } from "@ui/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { type PropsWithChildren, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAdminClient } from "../admin-client";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { HAIRLINE, NavBrandBar, navLinkClass, Shell, useNavDrawer } from "../../shared/shell/Shell";
import { UserMenu } from "../../shared/shell/UserMenu";
import { useCapabilities } from "../ui/capabilities";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import { Banners } from "./Banners";
import { ClearCachesModal } from "./ClearCachesModal";
import { helpUrls } from "./help";
import { useRealmsVersion, useWhoAmI, WhoAmIProvider } from "./session";

type NavItem = { to: string; label: string; icon: any; show?: boolean };

function useNavGroups() {
    const { realm } = useRealm();
    const caps = useCapabilities();
    const t = useT();
    const r = (p: string) => `/${realm}/${p}`;

    const groups: { label: string; items: NavItem[] }[] = [
        {
            label: t("sxNavGeneral"),
            items: [
                { to: r("dashboard"), label: t("sxNavDashboard"), icon: HouseIcon },
                { to: r("users"), label: t("sxNavUsers"), icon: UserIcon },
                { to: r("groups"), label: t("sxNavGroups"), icon: UsersThreeIcon },
                { to: r("sessions"), label: t("sxNavSessions"), icon: ClockCounterClockwiseIcon },
                { to: r("events"), label: t("sxNavEvents"), icon: LightningIcon },
                { to: r("iam-management"), label: t("sxNavIam"), icon: UserGearIcon }
            ]
        },
        {
            label: t("sxNavManage"),
            items: [
                { to: r("clients"), label: t("sxNavClients"), icon: AppWindowIcon },
                { to: r("client-scopes"), label: t("sxNavClientScopes"), icon: StackIcon },
                { to: r("roles"), label: t("sxNavRealmRoles"), icon: ShieldCheckIcon },
                {
                    to: r("organizations"),
                    label: t("sxNavOrganizations"),
                    icon: BuildingsIcon,
                    show: caps.organizationsEnabled
                }
            ]
        },
        {
            label: t("sxNavConfigure"),
            items: [
                { to: r("realm-settings"), label: t("sxNavRealmSettings"), icon: GearSixIcon },
                { to: r("authentication"), label: t("sxNavAuthentication"), icon: FingerprintIcon },
                { to: r("identity-providers"), label: t("sxNavIdentityProviders"), icon: ShareNetworkIcon },
                { to: r("user-federation"), label: t("sxNavUserFederation"), icon: DatabaseIcon },
                {
                    to: r("permissions"),
                    label: t("sxNavAdminPermissions"),
                    icon: LockKeyIcon,
                    show: caps.adminPermissionsEnabled
                },
                { to: r("workflows"), label: t("sxNavWorkflows"), icon: FlowArrowIcon, show: caps.workflowsEnabled }
            ]
        },
        {
            label: t("sxNavExtensions"),
            items: [
                { to: r("terms"), label: t("sxNavTerms"), icon: FileTextIcon },
                { to: r("registration-config"), label: t("sxNavRegistrationConfig"), icon: IdentificationCardIcon }
            ]
        }
    ];

    return groups;
}

function visible(groups: { label: string; items: NavItem[] }[]) {
    return groups
        .map(group => ({ ...group, items: group.items.filter(item => item.show !== false) }))
        .filter(group => group.items.length > 0);
}

function useActive() {
    const { pathname } = useLocation();
    return (to: string) => pathname === to || pathname.startsWith(`${to}/`);
}

function RealmPicker() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { setOpen } = useNavDrawer();
    const [realms, setRealms] = useState<any[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [query, setQuery] = useState("");
    const version = useRealmsVersion();
    const { whoAmI } = useWhoAmI();

    useEffect(() => {
        let alive = true;
        setFailed(false);
        adminClient.realms
            .find({ briefRepresentation: true })
            .then(list => {
                if (!alive) return;
                const sorted = [...(Array.isArray(list) ? list : [])].sort((a, b) =>
                    (a.realm || "").localeCompare(b.realm || "")
                );
                setRealms(sorted);
            })
            .catch(() => alive && setFailed(true));
        return () => {
            alive = false;
        };
    }, [adminClient, attempt, version]);

    const current = realms?.find(r => r.realm === realm);
    const label = (r: any) => (r?.displayName && !/^\$\{.*\}$/.test(r.displayName) ? r.displayName : r?.realm);
    const filtered = (realms || []).filter(r =>
        `${r.realm} ${r.displayName || ""}`.toLowerCase().includes(query.trim().toLowerCase())
    );

    return (
        <DropdownMenu onOpenChange={open => !open && setQuery("")}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={t("sxRealmSelect")}
                    className="mb-1 flex h-12 w-full items-center gap-2.5 rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] px-3 text-left outline-none transition-colors hover:bg-[#e5e5ea]/60 focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-[#38383a] dark:bg-[#1c1c1e] dark:hover:bg-[#2c2c2e]"
                >
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary text-[11px] font-semibold text-white uppercase">
                        {(realm || "?").charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[11px] leading-tight text-muted-foreground">{t("sxRealmCurrent")}</span>
                        <span className="block truncate text-sm font-medium leading-tight">{label(current) || realm}</span>
                    </span>
                    <CaretUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-xl border border-[#e5e5ea] bg-background p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.18)] ring-0 dark:border-[#38383a] dark:bg-[#1c1c1e]"
            >
                <DropdownMenuLabel className="px-2.5 pt-1.5 pb-1 text-xs font-normal text-muted-foreground">
                    {t("sxRealmSelect")}
                </DropdownMenuLabel>
                {realms && realms.length > 7 && (
                    <div className="px-1 pb-1">
                        <input
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            onKeyDown={event => event.stopPropagation()}
                            placeholder={t("sxRealmSearch")}
                            aria-label={t("sxRealmSearch")}
                            className="h-9 w-full rounded-lg border border-[#e5e5ea] bg-background px-2.5 text-sm outline-none focus-visible:border-ring dark:border-[#38383a]"
                        />
                    </div>
                )}
                {failed ? (
                    <div className="px-2.5 py-2 text-[13px] text-muted-foreground">
                        {t("sxRealmLoadError")}{" "}
                        <button type="button" className="font-medium text-primary" onClick={() => setAttempt(n => n + 1)}>
                            {t("sxRetry")}
                        </button>
                    </div>
                ) : realms === null ? (
                    <div className="flex flex-col gap-2 px-2.5 py-2">
                        <div className="h-3 w-3/5 animate-pulse rounded-md bg-[#e5e5ea] dark:bg-[#2c2c2e]" />
                        <div className="h-3 w-2/5 animate-pulse rounded-md bg-[#e5e5ea] dark:bg-[#2c2c2e]" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-2.5 py-2 text-[13px] text-muted-foreground">{t("sxRealmNone")}</div>
                ) : (
                    <div className="max-h-80 overflow-y-auto">
                        {filtered.map(r => (
                            <DropdownMenuItem
                                key={r.id || r.realm}
                                className="rounded-lg px-2.5 py-2 text-sm"
                                onSelect={() => {
                                    setOpen(false);
                                    if (r.realm !== realm) navigate(`/${encodeURIComponent(r.realm)}/dashboard`);
                                }}
                            >
                                <span className="min-w-0 flex-1 truncate">{label(r)}</span>
                                {r.realm === realm && <CheckIcon className="size-4 text-primary" />}
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
                <DropdownMenuSeparator className="mx-0 my-1 bg-[#e5e5ea] dark:bg-[#38383a]" />
                {whoAmI?.createRealm && (
                    <DropdownMenuItem
                        className="rounded-lg px-2.5 py-2 text-sm"
                        onSelect={() => {
                            setOpen(false);
                            navigate(`/${encodeURIComponent(realm)}/realms/new`);
                        }}
                    >
                        <PlusIcon className="size-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{t("sxRealmsCreate")}</span>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem
                    className="rounded-lg px-2.5 py-2 text-sm"
                    onSelect={() => {
                        setOpen(false);
                        navigate(`/${encodeURIComponent(realm)}/realms`);
                    }}
                >
                    <GearIcon className="size-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{t("sxShellManageRealms")}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function AdminNav() {
    const t = useT();
    const groups = visible(useNavGroups());
    const isActive = useActive();
    const { setOpen } = useNavDrawer();

    return (
        <>
            <NavBrandBar title={t("sxBrandTitle")} suffix={t("sxBrandSuffix")} />
            <RealmPicker />
            <nav aria-label={t("sxMenu")}>
                {groups.map(group => (
                    <div key={group.label}>
                        <div className="px-2.5 pt-4.5 pb-1.5 text-xs text-muted-foreground">{group.label}</div>
                        <ul>
                            {group.items.map(item => {
                                const active = isActive(item.to);
                                return (
                                    <li key={item.to}>
                                        <Link
                                            to={item.to}
                                            aria-current={active ? "page" : undefined}
                                            onClick={() => setOpen(false)}
                                            className={navLinkClass(active)}
                                        >
                                            <item.icon
                                                className={cn(
                                                    "size-4 shrink-0",
                                                    active ? "text-primary" : "text-muted-foreground"
                                                )}
                                            />
                                            <span className="flex-1 truncate">{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
        </>
    );
}

function AdminUserMenu() {
    const t = useT();
    const { keycloak, environment } = useEnvironment();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { hasAccess } = useWhoAmI();
    const [clearing, setClearing] = useState(false);
    const isMaster = realm === "master";
    const user = keycloak?.idTokenParsed as
        | { name?: string; preferred_username?: string; email?: string }
        | undefined;
    const name = user?.name || user?.preferred_username || user?.email || "Admin";
    const accountUrl = `${environment.serverBaseUrl}/realms/${encodeURIComponent(realm)}/account/`;

    const items = [
        { label: t("sxMyAccount"), onSelect: () => window.open(accountUrl, "_blank", "noopener") },
        {
            label: isMaster ? t("sxShellServerInfo") : t("sxShellRealmInfo"),
            onSelect: () => navigate(`/${encodeURIComponent(realm)}/server-info`)
        },
        ...(isMaster && hasAccess("manage-realm")
            ? [{ label: t("sxShellClearCaches"), onSelect: () => setTimeout(() => setClearing(true), 0) }]
            : []),
        {
            label: t("sxShellDocumentation"),
            onSelect: () => window.open(helpUrls.documentationUrl, "_blank", "noopener,noreferrer")
        }
    ];

    return (
        <>
            <UserMenu
                name={name}
                email={user?.email}
                items={items}
                signOutLabel={t("sxSignOut")}
                onSignOut={() => keycloak.logout()}
            />
            {clearing && <ClearCachesModal onClose={() => setClearing(false)} />}
        </>
    );
}

function AdminHeader() {
    const t = useT();
    const groups = useNavGroups();
    const isActive = useActive();
    const { setOpen } = useNavDrawer();
    const { realm } = useRealm();
    const extra = [
        { to: `/${realm}/realms`, label: t("sxShellManageRealms") },
        { to: `/${realm}/server-info`, label: realm === "master" ? t("sxShellServerInfo") : t("sxShellRealmInfo") }
    ];
    const title =
        [...groups.flatMap(group => group.items), ...extra].find(item => isActive(item.to))?.label ?? t("sxNavDashboard");

    return (
        <header
            className={`sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between border-b bg-background px-4 sm:h-15 sm:px-7 ${HAIRLINE}`}
        >
            <button
                type="button"
                aria-label={t("sxOpenMenu")}
                onClick={() => setOpen(true)}
                className="grid size-7 place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:hidden"
            >
                <SidebarSimpleIcon className="size-5" />
            </button>
            <span className="pointer-events-none absolute inset-x-14 truncate text-center text-base font-semibold sm:static sm:text-left sm:text-lg">
                {title}
            </span>
            <AdminUserMenu />
        </header>
    );
}

export function AdminShell({ children }: PropsWithChildren) {
    const t = useT();
    return (
        <WhoAmIProvider>
            <Shell header={<AdminHeader />} sidebar={<AdminNav />} menuLabel={t("sxMenu")}>
                <Banners />
                {children}
            </Shell>
        </WhoAmIProvider>
    );
}
