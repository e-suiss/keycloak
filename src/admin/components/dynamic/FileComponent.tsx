/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/FileComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Textarea } from "@ui/components/textarea";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { HelpItem } from "../../../shared/keycloak-ui-shared";
import type { ComponentProps } from "./components";

export const FileComponent = ({
    name,
    label,
    helpText,
    defaultValue,
    required,
    isDisabled = false,
    convertToName
}: ComponentProps) => {
    const { t } = useTranslation();
    const { control } = useFormContext();
    const [filename, setFilename] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="space-y-1.5">
            <Label htmlFor={name!} className="text-sm">
                {t(label!)}
                {required && <span className="text-destructive">*</span>}
                <HelpItem helpText={t(helpText!)} fieldLabelId={`${label}`} />
            </Label>
            <Controller
                name={convertToName(name!)}
                control={control}
                defaultValue={defaultValue || ""}
                render={({ field }) => (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Input
                                id={name!}
                                type="file"
                                disabled={isDisabled || isLoading}
                                onChange={event => {
                                    const file = event.target.files?.[0];
                                    if (!file) {
                                        return;
                                    }
                                    setFilename(file.name);
                                    setIsLoading(true);
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        field.onChange(
                                            typeof reader.result === "string"
                                                ? reader.result
                                                : ""
                                        );
                                        setIsLoading(false);
                                    };
                                    reader.onerror = () => setIsLoading(false);
                                    reader.readAsText(file);
                                }}
                            />
                            {(filename || field.value) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isDisabled}
                                    onClick={() => {
                                        field.onChange("");
                                        setFilename("");
                                    }}
                                >
                                    {t("clear")}
                                </Button>
                            )}
                        </div>
                        {filename && (
                            <p className="text-muted-foreground text-sm">{filename}</p>
                        )}
                        <Textarea value={field.value} readOnly disabled={isDisabled} />
                    </div>
                )}
            />
        </div>
    );
};
