/**
 * This file has been claimed for ownership from @keycloakify/keycloak-admin-ui version 260601.0.1.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "admin/i18next.d.ts" --revert
 */

/* eslint-disable */

// @ts-nocheck

// https://www.i18next.com/overview/typescript
import "i18next";

declare module "i18next" {
  interface CustomTypeOptions {
    // Kept disabled: enabling it widens HTMLAttributes children to Record<string, unknown>
    // globally, which breaks type-checking of the shared src/ui components. The vendored
    // admin/account sources type-check fine without it.
    allowObjectInHTMLChildren: false;
  }
}
