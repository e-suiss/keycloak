/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/BooleanComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Label } from "@ui/components/label";
import { Switch } from "@ui/components/switch";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { HelpItem } from "../../../shared/keycloak-ui-shared";
import type { ComponentProps } from "./components";

export const BooleanComponent = ({
    name,
    label,
    helpText,
    isDisabled = false,
    defaultValue,
    isNew = true,
    convertToName
}: ComponentProps) => {
    const { t } = useTranslation();
    const { control } = useFormContext();

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <Label htmlFor={name!}>{t(label!)}</Label>
                <HelpItem helpText={t(helpText!)} fieldLabelId={`${label}`} />
            </div>
            <Controller
                name={convertToName(name!)}
                data-testid={name}
                defaultValue={isNew ? defaultValue : false}
                control={control}
                render={({ field }) => {
                    const checked =
                        field.value === "true" ||
                        field.value === true ||
                        field.value?.[0] === "true";
                    return (
                        <div className="flex items-center gap-2">
                            <Switch
                                id={name!}
                                disabled={isDisabled}
                                checked={checked}
                                onCheckedChange={value => field.onChange(`${value}`)}
                                data-testid={name}
                                aria-label={t(label!)}
                            />
                            <span className="text-muted-foreground text-sm">
                                {checked ? t("on") : t("off")}
                            </span>
                        </div>
                    );
                }}
            />
        </div>
    );
};
