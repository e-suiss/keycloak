/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/IdentityProviderMultiSelectComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { IdentityProviderSelect } from "../identity-provider/IdentityProviderSelect";
import type { ComponentProps } from "./components";

export const IdentityProviderMultiSelectComponent = (props: ComponentProps) => (
    <IdentityProviderSelect
        {...props}
        convertToName={props.convertToName}
        name={props.name!}
    />
);
