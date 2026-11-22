/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/KcContext.ts"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

import { createGetKcContext, type KcContextLike } from "@keycloakify/keycloak-admin-ui";
import type { KcEnvName } from "../kc.gen";

export type KcContext = KcContextLike & {
    themeType: "admin";
    themeName: string;
    properties: Record<KcEnvName, string>;
};

export const { getKcContext } = createGetKcContext<KcContext>();
