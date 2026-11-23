import { Empty, EmptyHeader, EmptyTitle } from "@ui/components/empty";
// @ts-nocheck
// Custom admin routes — shadcn pages only, no PatternFly feature routes.
import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { environment } from "./environment";
import { useT } from "./ui/i18n";
import { Root } from "./Root";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Users = lazy(() => import("./pages/Users"));
const UserDetail = lazy(() => import("./pages/UserDetail"));
const Roles = lazy(() => import("./pages/Roles"));
const RoleDetail = lazy(() => import("./pages/RoleDetail"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const ClientScopes = lazy(() => import("./pages/ClientScopes"));
const ClientScopeDetail = lazy(() => import("./pages/ClientScopeDetail"));
const Groups = lazy(() => import("./pages/Groups"));
const GroupDetail = lazy(() => import("./pages/GroupDetail"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Events = lazy(() => import("./pages/Events"));
const RealmSettings = lazy(() => import("./pages/RealmSettings"));
const Authentication = lazy(() => import("./pages/Authentication"));
const IdentityProviders = lazy(() => import("./pages/IdentityProviders"));
const IdentityProviderDetail = lazy(() => import("./pages/IdentityProviderDetail"));
const UserFederation = lazy(() => import("./pages/UserFederation"));
const Organizations = lazy(() => import("./pages/Organizations"));
const OrganizationDetail = lazy(() => import("./pages/OrganizationDetail"));
const Workflows = lazy(() => import("./pages/Workflows"));
const WorkflowDetail = lazy(() => import("./pages/WorkflowDetail"));
const Permissions = lazy(() => import("./pages/Permissions"));
const Terms = lazy(() => import("./pages/Terms"));
const RegistrationConfig = lazy(() => import("./pages/RegistrationConfig"));
const IamManagement = lazy(() => import("./iam-management/IamManagement"));

function NotFound() {
    const t = useT();
    return (
        <Empty className="py-24">
            <EmptyHeader>
                <EmptyTitle>{t("sxNotFoundTitle")}</EmptyTitle>
            </EmptyHeader>
        </Empty>
    );
}

export const RootRoute: RouteObject = {
    path: "/",
    element: <Root />,
    children: [
        {
            index: true,
            element: <Navigate to={`/${environment.realm}/dashboard`} replace />
        },
        { path: ":realm/dashboard", element: <Dashboard /> },
        { path: ":realm/users", element: <Users /> },
        { path: ":realm/users/:id", element: <UserDetail /> },
        { path: ":realm/roles", element: <Roles /> },
        { path: ":realm/roles/:id", element: <RoleDetail /> },
        { path: ":realm/clients", element: <Clients /> },
        { path: ":realm/clients/:id", element: <Navigate to="settings" replace /> },
        { path: ":realm/clients/:id/:tab", element: <ClientDetail /> },
        { path: ":realm/client-scopes", element: <ClientScopes /> },
        { path: ":realm/client-scopes/:id", element: <ClientScopeDetail /> },
        { path: ":realm/groups", element: <Groups /> },
        { path: ":realm/groups/:id", element: <GroupDetail /> },
        { path: ":realm/sessions", element: <Sessions /> },
        { path: ":realm/events", element: <Events /> },
        { path: ":realm/realm-settings", element: <RealmSettings /> },
        { path: ":realm/authentication", element: <Authentication /> },
        { path: ":realm/identity-providers", element: <IdentityProviders /> },
        { path: ":realm/identity-providers/:alias", element: <IdentityProviderDetail /> },
        { path: ":realm/user-federation", element: <UserFederation /> },
        { path: ":realm/organizations", element: <Organizations /> },
        { path: ":realm/organizations/:id", element: <OrganizationDetail /> },
        { path: ":realm/workflows", element: <Workflows /> },
        { path: ":realm/workflows/new", element: <WorkflowDetail /> },
        { path: ":realm/workflows/copy/:id", element: <WorkflowDetail /> },
        { path: ":realm/workflows/:id", element: <WorkflowDetail /> },
        { path: ":realm/permissions", element: <Permissions /> },
        { path: ":realm/terms", element: <Terms /> },
        { path: ":realm/registration-config", element: <RegistrationConfig /> },
        { path: ":realm/iam-management", element: <IamManagement /> },
        { path: "*", element: <NotFound /> }
    ]
};
