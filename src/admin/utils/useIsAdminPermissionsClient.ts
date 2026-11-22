/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/utils/useIsAdminPermissionsClient.ts"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { useEffect, useState } from "react";
import { useRealm } from "../context/realm-context/RealmContext";

export function useIsAdminPermissionsClient(selectedClientId: string) {
    const { realmRepresentation } = useRealm();
    const [isAdminPermissionsClient, setIsAdminPermissionsClient] =
        useState<boolean>(false);

    useEffect(() => {
        if (realmRepresentation?.adminPermissionsClient) {
            setIsAdminPermissionsClient(
                selectedClientId === realmRepresentation.adminPermissionsClient.id
            );
        } else {
            setIsAdminPermissionsClient(false);
        }
    }, [selectedClientId, realmRepresentation]);

    return isAdminPermissionsClient;
}
