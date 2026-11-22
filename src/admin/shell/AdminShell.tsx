// @ts-nocheck
// Custom shadcn admin shell — replaces the PatternFly Page/PageNav/PageHeader.

import {
    AppleLogoIcon,
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
    StackIcon,
    UserGearIcon,
    UserIcon,
    UsersThreeIcon
} from "@phosphor-icons/react";
import { NavUser } from "../../shared/NavUser";
import { Badge } from "@ui/components/badge";
import { Separator } from "@ui/components/separator";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger
} from "@ui/components/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs";
import type { PropsWithChildren } from "react";
import { Link, useLocation } from "react-router-dom";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { useTheme } from "../theme";
import { useCapabilities } from "../ui/capabilities";
import { useRealm } from "../ui/realm";

const ICON = {
    dashboard: HouseIcon,
    clients: AppWindowIcon,
    clientScopes: StackIcon,
    roles: ShieldCheckIcon,
    users: UserIcon,
    groups: UsersThreeIcon,
    sessions: ClockCounterClockwiseIcon,
    events: LightningIcon,
    settings: GearSixIcon,
    auth: FingerprintIcon,
    idp: ShareNetworkIcon,
    federation: DatabaseIcon,
    iam: UserGearIcon,
    organizations: BuildingsIcon,
    workflows: FlowArrowIcon,
    permissions: LockKeyIcon,
    terms: FileTextIcon,
    registration: IdentificationCardIcon
};

function BrandMark({ className }: { className?: string }) {
    return <AppleLogoIcon weight="fill" className={className} />;
}

export function AdminShell({ children }: PropsWithChildren) {
    const { realm } = useRealm();
    const { pathname } = useLocation();
    const caps = useCapabilities();
    const r = (p: string) => `/${realm}/${p}`;

    // `show` defaults to true; feature-gated items stay hidden until caps load,
    // then appear only when their realm feature/toggle is on (matches the console).
    const rawGroups = [
        {
            label: "Genel",
            items: [
                { to: r("dashboard"), label: "Genel Bakış", icon: ICON.dashboard },
                { to: r("users"), label: "Kullanıcılar", icon: ICON.users },
                { to: r("groups"), label: "Gruplar", icon: ICON.groups },
                { to: r("sessions"), label: "Oturumlar", icon: ICON.sessions },
                { to: r("events"), label: "Olaylar", icon: ICON.events },
                { to: r("iam-management"), label: "Yetki Yönetimi", icon: ICON.iam }
            ]
        },
        {
            label: "Yönet",
            items: [
                { to: r("clients"), label: "İstemciler", icon: ICON.clients },
                {
                    to: r("client-scopes"),
                    label: "İstemci Kapsamları",
                    icon: ICON.clientScopes
                },
                { to: r("roles"), label: "Realm Rolleri", icon: ICON.roles },
                {
                    to: r("organizations"),
                    label: "Organizasyonlar",
                    icon: ICON.organizations,
                    show: caps.organizationsEnabled
                }
            ]
        },
        {
            label: "Yapılandır",
            items: [
                { to: r("realm-settings"), label: "Realm Ayarları", icon: ICON.settings },
                { to: r("authentication"), label: "Kimlik Doğrulama", icon: ICON.auth },
                {
                    to: r("identity-providers"),
                    label: "Kimlik Sağlayıcılar",
                    icon: ICON.idp
                },
                {
                    to: r("user-federation"),
                    label: "Kullanıcı Federasyonu",
                    icon: ICON.federation
                },
                {
                    to: r("permissions"),
                    label: "İzinler",
                    icon: ICON.permissions,
                    show: caps.adminPermissionsEnabled
                },
                {
                    to: r("workflows"),
                    label: "İş Akışları",
                    icon: ICON.workflows,
                    show: caps.workflowsEnabled
                }
            ]
        },
        {
            label: "Uzantılar",
            items: [
                { to: r("terms"), label: "Sözleşmeler", icon: ICON.terms },
                {
                    to: r("registration-config"),
                    label: "Kayıt Yapılandırması",
                    icon: ICON.registration
                }
            ]
        }
    ];

    const groups = rawGroups
        .map(g => ({ ...g, items: g.items.filter(it => it.show !== false) }))
        .filter(g => g.items.length > 0);

    const all = groups.flatMap(g => g.items);
    const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);
    const activeItem = all.find(item => isActive(item.to));
    const title = activeItem?.label ?? "Genel Bakış";

    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <div className="flex items-center gap-2 font-semibold">
                        <BrandMark className="size-5" />
                        Wallet
                        <Badge variant="secondary">Admin</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">Yönetim Konsolu</span>
                </SidebarHeader>

                <SidebarContent>
                    {groups.map(g => (
                        <SidebarGroup key={g.label}>
                            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
                            <SidebarMenu>
                                {g.items.map(item => (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive(item.to)}
                                        >
                                            <Link to={item.to}>
                                                <item.icon
                                                    weight={
                                                        isActive(item.to)
                                                            ? "fill"
                                                            : "regular"
                                                    }
                                                    className="size-5"
                                                />
                                                <span className="flex-1">
                                                    {item.label}
                                                </span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroup>
                    ))}
                </SidebarContent>
            </Sidebar>

            <SidebarInset>
                <header className="sticky top-0 z-40 bg-background">
                    <div className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
                        <div className="flex min-w-0 items-center gap-2">
                            <SidebarTrigger className="md:hidden" />
                            <h1 className="truncate text-xl font-semibold tracking-tight">
                                {title}
                            </h1>
                        </div>
                        <AccountMenu />
                    </div>

                    <Tabs value={activeItem?.to ?? ""} className="px-5 pb-3 md:hidden">
                        <TabsList>
                            {all.map(item => (
                                <TabsTrigger key={item.to} value={item.to} asChild>
                                    <Link to={item.to}>{item.label}</Link>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                    <Separator />
                </header>

                <main>{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}

function AccountMenu() {
    const { keycloak } = useEnvironment();
    const { mode, setMode } = useTheme();

    const user = keycloak?.idTokenParsed as
        | { name?: string; preferred_username?: string; email?: string }
        | undefined;
    const name = user?.name || user?.preferred_username || user?.email || "Admin";
    const email = user?.email || "";

    return (
        <NavUser
            name={name}
            email={email}
            mode={mode}
            onModeChange={setMode}
            onSignOut={() => keycloak.logout()}
        />
    );
}
