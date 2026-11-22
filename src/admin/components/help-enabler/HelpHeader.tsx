/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/help-enabler/HelpHeader.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { QuestionIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { Switch } from "@ui/components/switch";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHelp } from "../../../shared/keycloak-ui-shared";
import helpUrls from "../../help-urls";
import { FormattedLink } from "../external-link/FormattedLink";

export const HelpHeader = () => {
    const [open, setOpen] = useState(false);
    const help = useHelp();
    const { t } = useTranslation();

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Help"
                    id="help"
                    data-testid="help-toggle"
                >
                    <QuestionIcon />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem id="link" asChild>
                    <FormattedLink
                        data-testId="documentation-link"
                        href={helpUrls.documentationUrl}
                        title={t("documentation")}
                    />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    id="enable"
                    onSelect={e => e.preventDefault()}
                    className="flex flex-col items-start gap-1"
                >
                    <div className="flex w-full items-center justify-between gap-2">
                        <span className="flex-1">{t("enableHelpMode")}</span>
                        <Switch
                            id="enableHelp"
                            aria-label={t("enableHelp")}
                            checked={help.enabled}
                            className="keycloak_help-header-switch"
                            onCheckedChange={() => help.toggleHelp()}
                        />
                    </div>
                    <span className="text-muted-foreground text-sm">
                        {t("helpToggleInfo")}
                    </span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
