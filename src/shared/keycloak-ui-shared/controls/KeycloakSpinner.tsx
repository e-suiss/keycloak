/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/KeycloakSpinner.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Spinner } from "@ui/components/spinner";
import { useTranslation } from "react-i18next";

export const KeycloakSpinner = () => {
    const { t } = useTranslation();

    return (
        <div className="grid place-items-center p-8">
            <Spinner aria-label={t("spinnerLoading")} className="size-8" />
        </div>
    );
};
