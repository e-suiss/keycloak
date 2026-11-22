/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/table/ListEmptyState.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type { IconProps } from "@phosphor-icons/react";
import { MagnifyingGlassIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import type {
    ComponentType,
    MouseEventHandler,
    PropsWithChildren,
    ReactNode
} from "react";

export type Action = {
    text: string;
    type?: "default" | "secondary" | "outline" | "destructive" | "link" | "ghost";
    onClick: MouseEventHandler<HTMLButtonElement>;
};

export type ListEmptyStateProps = {
    message: string;
    instructions: ReactNode;
    primaryActionText?: string;
    onPrimaryAction?: MouseEventHandler<HTMLButtonElement>;
    hasIcon?: boolean;
    icon?: ComponentType<IconProps>;
    isSearchVariant?: boolean;
    secondaryActions?: Action[];
    isDisabled?: boolean;
};

export const ListEmptyState = ({
    message,
    instructions,
    onPrimaryAction,
    hasIcon = true,
    isSearchVariant,
    primaryActionText,
    secondaryActions,
    icon,
    isDisabled = false,
    children
}: PropsWithChildren<ListEmptyStateProps>) => {
    const IconComponent = isSearchVariant
        ? MagnifyingGlassIcon
        : icon
          ? icon
          : PlusCircleIcon;

    return (
        <Empty data-testid="empty-state">
            <EmptyHeader>
                {hasIcon && (
                    <EmptyMedia variant="icon">
                        <IconComponent />
                    </EmptyMedia>
                )}
                <EmptyTitle>{message}</EmptyTitle>
                <EmptyDescription>{instructions}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                {primaryActionText && (
                    <Button
                        data-testid={`${message
                            .replace(/\W+/g, "-")
                            .toLowerCase()}-empty-action`}
                        onClick={onPrimaryAction}
                        disabled={isDisabled}
                    >
                        {primaryActionText}
                    </Button>
                )}
                {children}
                {secondaryActions && (
                    <div className="flex gap-2">
                        {secondaryActions.map(action => (
                            <Button
                                key={action.text}
                                data-testid={`${action.text
                                    .replace(/\W+/g, "-")
                                    .toLowerCase()}-empty-action`}
                                variant={action.type || "secondary"}
                                onClick={action.onClick}
                                disabled={isDisabled}
                            >
                                {action.text}
                            </Button>
                        ))}
                    </div>
                )}
            </EmptyContent>
        </Empty>
    );
};
