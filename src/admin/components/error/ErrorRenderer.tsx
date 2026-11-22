/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/error/ErrorRenderer.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { NetworkError } from "@keycloak/keycloak-admin-client";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { useTranslation } from "react-i18next";
import { type FallbackProps, useEnvironment } from "../../../shared/keycloak-ui-shared";

export const ErrorRenderer = ({ error }: FallbackProps) => {
    const { keycloak } = useEnvironment();
    const { t } = useTranslation();
    const isPermissionError =
        error instanceof NetworkError && error.response.status === 403;

    let message;
    if (isPermissionError) {
        message = t("forbiddenAdminConsole");
    } else {
        message = error.message;
    }

    return (
        <div className="p-4">
            <Alert variant="destructive">
                <AlertTitle>{message}</AlertTitle>
                <AlertDescription>
                    {isPermissionError ? (
                        <Button
                            variant="link"
                            onClick={async () => await keycloak.logout()}
                        >
                            {t("signOut")}
                        </Button>
                    ) : (
                        <Button variant="link" onClick={() => location.reload()}>
                            {t("reload")}
                        </Button>
                    )}
                </AlertDescription>
            </Alert>
        </div>
    );
};
