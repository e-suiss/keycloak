/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/TextComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Label } from "@ui/components/label";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { HelpItem, KeycloakTextArea } from "../../../shared/keycloak-ui-shared";
import type { ComponentProps } from "./components";

export const TextComponent = ({
    name,
    label,
    helpText,
    defaultValue,
    required,
    isDisabled = false,
    convertToName
}: ComponentProps) => {
    const { t } = useTranslation();
    const { register } = useFormContext();

    return (
        <div className="space-y-1.5">
            <Label htmlFor={name!}>
                {t(label!)}
                {required && <span className="text-destructive">*</span>}
                <HelpItem helpText={t(helpText!)} fieldLabelId={`${label}`} />
            </Label>
            <KeycloakTextArea
                id={name!}
                data-testid={name}
                isDisabled={isDisabled}
                defaultValue={defaultValue?.toString()}
                {...register(convertToName(name!))}
            />
        </div>
    );
};
