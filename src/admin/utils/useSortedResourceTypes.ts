/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/utils/useSortedResourceTypes.ts"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type ResourceServerRepresentation from "@keycloak/keycloak-admin-client/lib/defs/resourceServerRepresentation";
import { sortBy } from "lodash-es";
import { useMemo, useState } from "react";
import { useFetch } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";

type UseSortedResourceTypesProps = {
    clientId: string;
};

export default function useSortedResourceTypes({
    clientId
}: UseSortedResourceTypesProps) {
    const { adminClient } = useAdminClient();
    const [resourceServer, setResourceServer] = useState<ResourceServerRepresentation>();

    useFetch(
        () =>
            adminClient.clients.getResourceServer({
                id: clientId
            }),
        setResourceServer,
        [clientId]
    );

    const resourceTypes = useMemo(() => {
        const allResourceTypes = resourceServer?.authorizationSchema?.resourceTypes;
        return allResourceTypes ? sortBy(Object.values(allResourceTypes), "type") : [];
    }, [resourceServer]);

    return resourceTypes;
}
