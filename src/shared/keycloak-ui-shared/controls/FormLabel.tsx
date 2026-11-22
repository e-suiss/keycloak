/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/FormLabel.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Label } from "@ui/components/label";
import type { PropsWithChildren, ReactNode } from "react";
import type { FieldError, FieldValues, Merge } from "react-hook-form";
import { FormErrorText } from "./FormErrorText";
import { HelpItem } from "./HelpItem";

export type FieldProps<T extends FieldValues = FieldValues> = {
    id?: string | undefined;
    label?: string;
    name: string;
    labelIcon?: string | ReactNode;
    error?: FieldError | Merge<FieldError, T>;
    isRequired: boolean;
};

type FormLabelProps = FieldProps & {
    className?: string;
    [key: string]: any;
};

export const FormLabel = ({
    id,
    name,
    label,
    labelIcon,
    error,
    isRequired,
    children,
    ...rest
}: PropsWithChildren<FormLabelProps>) => {
    const fieldId = id || name;
    return (
        <div className="space-y-1.5" {...rest}>
            <Label htmlFor={fieldId}>
                {label || name}
                {isRequired && <span className="text-destructive">*</span>}
                {labelIcon ? (
                    <HelpItem helpText={labelIcon} fieldLabelId={fieldId} />
                ) : undefined}
            </Label>
            {children}
            {error && (
                <FormErrorText data-testid={`${name}-helper`} message={error.message} />
            )}
        </div>
    );
};
