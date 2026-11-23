// @ts-nocheck

import {
    AppWindowIcon,
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
import type { PropsWithChildren } from "react";
import { Link, useLocation } from "react-router-dom";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { HAIRLINE, NavBrandBar, navLinkClass, Shell, useNavDrawer } from "../../shared/shell/Shell";
import { UserMenu } from "../../shared/shell/UserMenu";
import { useCapabilities } from "../ui/capabilities";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";

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

function AdminNav() {
    const t = useT();
    const groups = visible(useNavGroups());
    const isActive = useActive();
    const { setOpen } = useNavDrawer();

    return (
        <>
            <NavBrandBar title={t("sxBrandTitle")} suffix={t("sxBrandSuffix")} />
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
    const user = keycloak?.idTokenParsed as
        | { name?: string; preferred_username?: string; email?: string }
        | undefined;
    const name = user?.name || user?.preferred_username || user?.email || "Admin";
    const accountUrl = `${environment.serverBaseUrl}/realms/${encodeURIComponent(realm)}/account/`;

    return (
        <UserMenu
            name={name}
            email={user?.email}
            items={[{ label: t("sxMyAccount"), onSelect: () => window.open(accountUrl, "_blank", "noopener") }]}
            signOutLabel={t("sxSignOut")}
            onSignOut={() => keycloak.logout()}
        />
    );
}

function AdminHeader() {
    const t = useT();
    const groups = useNavGroups();
    const isActive = useActive();
    const { setOpen } = useNavDrawer();
    const title = groups.flatMap(group => group.items).find(item => isActive(item.to))?.label ?? t("sxNavDashboard");

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
        <Shell header={<AdminHeader />} sidebar={<AdminNav />} menuLabel={t("sxMenu")}>
            {children}
        </Shell>
    );
}
