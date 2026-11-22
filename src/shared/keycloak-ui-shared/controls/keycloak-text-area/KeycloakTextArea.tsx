/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/keycloak-text-area/KeycloakTextArea.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

// TODO: Remove code once the following issue has been fixed:
// https://github.com/patternfly/patternfly-react/issues/10192
import { Textarea } from "@ui/components/textarea";
import type {
    ComponentProps,
    ForwardRefExoticComponent,
    HTMLProps,
    RefAttributes
} from "react";

export type KeycloakTextAreaProps = Omit<
    ComponentProps<typeof Textarea>,
    "onFocus" | "onBlur"
> &
    Pick<HTMLProps<HTMLTextAreaElement>, "onFocus" | "onBlur">;

export const KeycloakTextArea = Textarea as ForwardRefExoticComponent<
    KeycloakTextAreaProps & RefAttributes<HTMLTextAreaElement>
>;
