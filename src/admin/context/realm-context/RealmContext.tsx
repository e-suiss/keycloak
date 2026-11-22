/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/context/realm-context/RealmContext.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type RealmRepresentation from "@keycloak/keycloak-admin-client/lib/defs/realmRepresentation";
import { type PropsWithChildren, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    createNamedContext,
    KeycloakSpinner,
    useEnvironment,
    useFetch,
    useRequiredContext
} from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useHash } from "./useHash";

type RealmContextType = {
    realm: string;
    realmRepresentation?: RealmRepresentation;
    refresh: () => void;
};

export const RealmContext = createNamedContext<RealmContextType | undefined>(
    "RealmContext",
    undefined
);

export const RealmContextProvider = ({ children }: PropsWithChildren) => {
    const { adminClient } = useAdminClient();
    const { environment } = useEnvironment();
    const { i18n } = useTranslation();
    const [key, setKey] = useState(0);
    const refresh = () => setKey(key + 1);
    const [realmRepresentation, setRealmRepresentation] = useState<RealmRepresentation>();

    const locationRealm = useHash();
    const realm = locationRealm?.split("/")[1] ?? environment.realm;

    // Configure admin client to use selected realm when it changes.
    useEffect(() => {
        void (async () => {
            adminClient.setConfig({ realmName: realm });
            const namespace = encodeURIComponent(realm);
            await i18n.loadNamespaces(namespace);
            i18n.setDefaultNamespace(namespace);
        })();
    }, [realm, i18n, adminClient]);
    useFetch(() => adminClient.realms.findOne({ realm }), setRealmRepresentation, [
        realm,
        key
    ]);

    if (!realmRepresentation) {
        return <KeycloakSpinner />;
    }

    return (
        <RealmContext.Provider value={{ realm, realmRepresentation, refresh }}>
            {children}
        </RealmContext.Provider>
    );
};

export const useRealm = () => useRequiredContext(RealmContext);
