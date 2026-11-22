/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/utils/useCurrentUser.ts"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation";
import { useState } from "react";
import { useFetch } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useWhoAmI } from "../context/whoami/WhoAmI";

export function useCurrentUser() {
    const { adminClient } = useAdminClient();
    const { whoAmI } = useWhoAmI();
    const [currentUser, setCurrentUser] = useState<UserRepresentation>();

    useFetch(() => adminClient.users.findOne({ id: whoAmI.userId }), setCurrentUser, [
        whoAmI.userId
    ]);

    return { ...currentUser, realm: whoAmI.realm };
}
