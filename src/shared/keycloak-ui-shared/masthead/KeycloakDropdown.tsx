/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/masthead/KeycloakDropdown.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { type ComponentProps, type ReactNode, useState } from "react";

type DropdownProps = ComponentProps<typeof DropdownMenu>;

type KeycloakDropdownProps = Omit<DropdownProps, "children"> & {
    "data-testid"?: string;
    isKebab?: boolean;
    title?: ReactNode;
    dropDownItems: ReactNode[];
};

export const KeycloakDropdown = ({
    isKebab = false,
    title,
    dropDownItems,
    ...rest
}: KeycloakDropdownProps) => {
    const [open, setOpen] = useState(false);

    return (
        <DropdownMenu {...rest} open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    data-testid={`${rest["data-testid"]}-toggle`}
                    variant="ghost"
                    size={isKebab ? "icon" : "default"}
                >
                    {isKebab ? <DotsThreeVerticalIcon /> : title}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{dropDownItems}</DropdownMenuContent>
        </DropdownMenu>
    );
};
