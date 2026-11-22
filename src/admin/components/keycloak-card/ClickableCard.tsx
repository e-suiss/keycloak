/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/keycloak-card/ClickableCard.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Card, CardHeader } from "@ui/components/card";
import { type ComponentProps, type KeyboardEvent, useId } from "react";

type ClickableCardProps = Omit<ComponentProps<typeof Card>, "onClick"> & {
    onClick: () => void;
    isSelected?: boolean;
};

export const ClickableCard = ({
    onClick,
    isSelected,
    children,
    className,
    ...rest
}: ClickableCardProps) => {
    const id = useId();
    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === " " || e.key === "Enter" || e.key === "Spacebar") {
            e.preventDefault();
            onClick();
        }
    };
    return (
        <Card
            id={id}
            role="button"
            tabIndex={0}
            data-selected={isSelected ? "" : undefined}
            onKeyDown={onKeyDown}
            onClick={onClick}
            className={[
                "cursor-pointer border border-border/60 bg-card outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring data-selected:border-primary",
                className
            ]
                .filter(Boolean)
                .join(" ")}
            {...rest}
        >
            <CardHeader id={`input-${id}`} aria-labelledby={id} onClick={onClick}>
                {children}
            </CardHeader>
        </Card>
    );
};
