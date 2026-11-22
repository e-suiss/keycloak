/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/environment.ts"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { getInjectedEnvironment } from "../shared/keycloak-ui-shared";
import type { AccountEnvironment } from ".";

export const environment = getInjectedEnvironment<AccountEnvironment>();
