/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/colorScheme.ts"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

/* IMPORTANT NOTE:
 * If you modify how the light/dark mode is implemented
 * you must also update public/admin/early-color-scheme.js
 * This scrip is ran before this to avoid white flashes
 */

import { getKcContext } from "./KcContext";
import { initTheme } from "./theme";

export function startColorSchemeManagement() {
    const { kcContext } = getKcContext();

    // The "Dark Mode" realm configuration set to false means the admin does not
    // want dark mode at all — so we lock appearance to light. Otherwise the user
    // can switch Light / Dark / System (persisted) and toggle with the `d` key.
    initTheme({ allowDark: kcContext.darkMode !== false });
}
