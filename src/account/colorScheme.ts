/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/colorScheme.ts"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

import { getKcContext } from "./KcContext";
import { initTheme } from "./theme";

export function startColorSchemeManagement() {
    const { kcContext } = getKcContext();

    // The "Dark Mode" realm configuration has been set to false
    // (Admin Console -> Realm Setting -> Themes -> Dark Mode) means the admin
    // does not want dark mode at all — so we lock appearance to light.
    initTheme({ allowDark: kcContext.darkMode !== false });
}
