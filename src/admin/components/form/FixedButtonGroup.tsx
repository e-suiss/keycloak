/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/form/FixedButtonGroup.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Button } from "@ui/components/button";
import { Separator } from "@ui/components/separator";
import { useTranslation } from "react-i18next";

type FixedButtonGroupProps = React.HTMLAttributes<HTMLDivElement> & {
    name: string;
    save?: () => void;
    saveText?: string;
    reset?: () => void;
    resetText?: string;
    isSubmit?: boolean;
    isDisabled?: boolean;
};

export const FixedButtonsGroup = ({
    name,
    save,
    saveText,
    reset,
    resetText,
    isSubmit = false,
    isDisabled = false,
    children,
    ...rest
}: FixedButtonGroupProps) => {
    const { t } = useTranslation();
    return (
        <div
            className="fixed bottom-0 -ms-6 flex w-full flex-col bg-background ps-4 pb-2"
            {...rest}
        >
            <Separator className="mb-4" />
            <div className="flex gap-2">
            {(save || isSubmit) && (
                <Button
                    disabled={isDisabled}
                    data-testid={`${name}-save`}
                    onClick={() => save?.()}
                    type={isSubmit ? "submit" : "button"}
                >
                    {!saveText ? t("save") : saveText}
                </Button>
            )}
            {reset && (
                <Button
                    disabled={isDisabled}
                    data-testid={`${name}-revert`}
                    variant="link"
                    onClick={() => reset()}
                >
                    {!resetText ? t("revert") : resetText}
                </Button>
            )}
            {children}
            </div>
        </div>
    );
};
