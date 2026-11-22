/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/utils/translationFormatter.ts"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type { TFunction } from "i18next";
import { label } from "../../shared/keycloak-ui-shared";
import type { IFormatter, IFormatterValueType } from "../util";

export const translationFormatter =
    (t: TFunction): IFormatter =>
    (data?: IFormatterValueType) => {
        return data ? label(t, data as string) || "—" : "—";
    };
