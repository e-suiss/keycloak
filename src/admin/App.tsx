// @ts-nocheck
// Custom admin app — PatternFly-free. Keeps the Keycloak auth + admin REST
// client bootstrap, but renders a fully shadcn shell + routes.
import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useEnvironment } from "../shared/keycloak-ui-shared";
import { SessionExpirationWarningOverlay } from "../shared/SessionExpirationWarningOverlay";

import { AdminClientContext, initAdminClient } from "./admin-client";
import type { Environment } from "./environment";
import { AdminShell } from "./shell/AdminShell";
import { initAdminI18n } from "./ui/i18n";
import { AppSkeleton, PageSkeleton } from "./ui/kit";
import { RealmProvider, useRealm } from "./ui/realm";

function RealmOutlet() {
    const { realm } = useRealm();
    return <Outlet key={realm} />;
}

export const App = () => {
    const { keycloak, environment } = useEnvironment<Environment>();
    const [adminClient, setAdminClient] = useState<KeycloakAdminClient>();

    useEffect(() => {
        const fragment = "#/";
        if (window.location.href.endsWith(fragment)) {
            const newPath = window.location.pathname.replace(fragment, "");
            window.history.replaceState(null, "", newPath);
        }
        initAdminClient(keycloak, environment)
            .then(async client => {
                await initAdminI18n(client, environment).catch(() => {});
                setAdminClient(client);
            })
            .catch(console.error);
    }, [environment, keycloak]);

    if (!adminClient) {
        return <AppSkeleton />;
    }

    return (
        <AdminClientContext.Provider value={{ keycloak, adminClient }}>
            <RealmProvider>
                <AdminShell>
                    <Suspense
                        fallback={<PageSkeleton />}
                    >
                        <RealmOutlet />
                    </Suspense>
                </AdminShell>
                <SessionExpirationWarningOverlay warnUserSecondsBeforeAutoLogout={45} />
            </RealmProvider>
        </AdminClientContext.Provider>
    );
};
