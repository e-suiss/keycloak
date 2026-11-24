// @ts-nocheck

import { DelayedReveal } from "../shared/DelayedReveal";
import { KeycloakProvider } from "../shared/keycloak-ui-shared";

import { App } from "./App";
import { environment } from "./environment";
import { AppSkeleton } from "./ui/kit";

export const Root = () => (
    <KeycloakProvider environment={environment} fallback={<DelayedReveal><AppSkeleton /></DelayedReveal>}>
        <App />
    </KeycloakProvider>
);
