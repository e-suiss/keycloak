/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/ListComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Label } from "@ui/components/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { HelpItem } from "../../../shared/keycloak-ui-shared";
import type { ComponentProps } from "./components";

export const ListComponent = ({
    name,
    label,
    helpText,
    defaultValue,
    options,
    required,
    isDisabled = false,
    convertToName
}: ComponentProps) => {
    const { t } = useTranslation();
    const { control } = useFormContext();

    return (
        <div className="space-y-1.5">
            <Label htmlFor={name!}>
                {t(label!)}
                {required && <span className="text-destructive">*</span>}
                <HelpItem helpText={t(helpText!)} fieldLabelId={`${label}`} />
            </Label>
            <Controller
                name={convertToName(name!)}
                data-testid={name}
                defaultValue={defaultValue || options?.[0] || ""}
                control={control}
                render={({ field }) => (
                    <Select
                        value={field.value}
                        onValueChange={value => field.onChange(value)}
                        disabled={isDisabled}
                    >
                        <SelectTrigger
                            id={name}
                            aria-label={t(label!)}
                            className="w-full"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {options?.map(option => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
        </div>
    );
};
