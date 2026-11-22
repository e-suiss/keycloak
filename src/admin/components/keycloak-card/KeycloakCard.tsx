/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/keycloak-card/KeycloakCard.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle
} from "@ui/components/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import type { ReactElement } from "react";
import { Link, type To } from "react-router-dom";

export type KeycloakCardProps = {
    title: string;
    dropdownItems?: ReactElement[];
    labelText?: string;
    labelColor?: any;
    footerText?: string;
    to: To;
};

export const KeycloakCard = ({
    title,
    dropdownItems,
    labelText,
    labelColor,
    footerText,
    to
}: KeycloakCardProps) => {
    return (
        <Card className="cursor-pointer">
            <CardHeader className="grid-cols-[1fr_auto]">
                <CardTitle data-testid="keycloak-card-title">
                    <Link to={to}>{title}</Link>
                </CardTitle>
                {dropdownItems && (
                    <div className="col-start-2 row-start-1 self-start justify-self-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    data-testid={`${title}-dropdown`}
                                >
                                    <DotsThreeVerticalIcon />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {dropdownItems}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </CardHeader>
            <CardContent />
            <CardFooter>
                <div className="flex items-center gap-3">
                    <div className="keycloak--keycloak-card__footer">
                        {footerText && footerText}
                    </div>
                    <div>
                        {labelText && <Badge variant="secondary">{labelText}</Badge>}
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
};
