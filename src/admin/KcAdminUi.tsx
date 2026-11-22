/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/KcAdminUi.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

import "../globals.css";
import { useEffect, useReducer } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { startColorSchemeManagement } from "./colorScheme";
import { i18n } from "./i18n/i18n";
import { RootRoute } from "./routes";

document.title = "Wallet — Yönetim Konsolu";

const router = createHashRouter([RootRoute]);
const prI18nInitialized = i18n.init();
startColorSchemeManagement();

export default function KcAdminUi() {
    const [isI18nInitialized, setI18nInitialized] = useReducer(() => true, false);

    useEffect(() => {
        prI18nInitialized.then(() => setI18nInitialized());
    }, []);

    if (!isI18nInitialized) {
        return null;
    }

    return <RouterProvider router={router} />;
}
