/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/KcAccountUi.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

import "../globals.css";

import { useEffect, useReducer } from "react";
import { KeycloakProvider } from "../shared/keycloak-ui-shared";
import { SessionExpirationWarningOverlay } from "../shared/SessionExpirationWarningOverlay";
import { startColorSchemeManagement } from "./colorScheme";
import { environment } from "./environment";
import { i18n } from "./i18n/i18n";
import { Root } from "./root/Root";
import { AccountSkeleton } from "./root/Skeleton";

document.title = "Account Management";

const prI18nInitialized = i18n.init();
startColorSchemeManagement();

export default function KcAccountUi() {
    const [isI18nInitialized, setI18nInitialized] = useReducer(() => true, false);

    useEffect(() => {
        prI18nInitialized.then(() => setI18nInitialized());
    }, []);

    if (!isI18nInitialized) {
        return null;
    }

    return (
        <KeycloakProvider environment={environment} fallback={<AccountSkeleton />}>
            <Root />
            <SessionExpirationWarningOverlay warnUserSecondsBeforeAutoLogout={45} />
        </KeycloakProvider>
    );
}
