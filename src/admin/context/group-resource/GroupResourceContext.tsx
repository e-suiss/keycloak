/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/context/group-resource/GroupResourceContext.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type { Groups } from "@keycloak/keycloak-admin-client";
import type { PropsWithChildren } from "react";
import {
    createNamedContext,
    useRequiredContext
} from "../../../shared/keycloak-ui-shared";

export const GroupsResourceContext = createNamedContext<Groups | undefined>(
    "GroupsResourceContext",
    undefined
);

export const useGroupResource = () => useRequiredContext(GroupsResourceContext);

type GroupsContextProps = PropsWithChildren & {
    value: Groups;
};
export const GroupResourceContext = ({ value, children }: GroupsContextProps) => {
    return (
        <GroupsResourceContext.Provider value={value}>
            {children}
        </GroupsResourceContext.Provider>
    );
};
