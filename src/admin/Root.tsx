// @ts-nocheck

import { KeycloakProvider } from "../shared/keycloak-ui-shared";

import { App } from "./App";
import { environment } from "./environment";
import { AppSkeleton } from "./ui/kit";

export const Root = () => (
    <KeycloakProvider environment={environment} fallback={<AppSkeleton />}>
        <App />
    </KeycloakProvider>
);
