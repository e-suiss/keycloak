/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/FormErrorText.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { WarningCircleIcon } from "@phosphor-icons/react";

export type FormErrorTextProps = React.HTMLAttributes<HTMLParagraphElement> & {
    message: string;
};

export const FormErrorText = ({ message, ...props }: FormErrorTextProps) => {
    return (
        <p className="mt-1 flex items-center gap-1 text-destructive text-sm" {...props}>
            <span className="inline-flex">
                <WarningCircleIcon />
            </span>
            {message}
        </p>
    );
};
