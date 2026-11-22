/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/UrlComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Label } from "@ui/components/label";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { HelpItem } from "../../../shared/keycloak-ui-shared";
import { FormattedLink } from "../external-link/FormattedLink";
import type { ComponentProps } from "./components";

export const UrlComponent = ({ name, label, helpText }: ComponentProps) => {
    const { t } = useTranslation();
    const { control } = useFormContext();
    const { value } = useWatch({
        control,
        name: name!,
        defaultValue: ""
    });

    return (
        <div className="keycloak__identity-providers__url_component space-y-1.5">
            <Label htmlFor={name!} className="gap-1">
                {t(label!)}
                <HelpItem helpText={t(helpText!)} fieldLabelId={`${label}`} />
            </Label>
            <FormattedLink title={t(helpText!)} href={value} isInline />
        </div>
    );
};
