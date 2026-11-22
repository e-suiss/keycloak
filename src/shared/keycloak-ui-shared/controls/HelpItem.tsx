/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/HelpItem.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { QuestionIcon, WarningIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover";
import type { ReactNode } from "react";
import { useHelp } from "../context/HelpContext";

type HelpItemProps = {
    helpText: string | ReactNode;
    fieldLabelId: string;
    noVerticalAlign?: boolean;
    unWrap?: boolean;
    isRecommendation?: boolean;
};

export const HelpItem = ({
    helpText,
    fieldLabelId,
    noVerticalAlign = true,
    unWrap = false,
    isRecommendation = false
}: HelpItemProps) => {
    const { enabled } = useHelp();
    const IconComponent = isRecommendation ? WarningIcon : QuestionIcon;

    const icon = <IconComponent />;

    return enabled ? (
        <Popover>
            <PopoverTrigger asChild>
                {!unWrap ? (
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        data-testid={`help-label-${fieldLabelId}`}
                        aria-label={fieldLabelId}
                        onClick={e => e.preventDefault()}
                        className="text-muted-foreground"
                    >
                        {icon}
                    </Button>
                ) : (
                    <span className="inline-flex items-center">{icon}</span>
                )}
            </PopoverTrigger>
            <PopoverContent>{helpText}</PopoverContent>
        </Popover>
    ) : null;
};
