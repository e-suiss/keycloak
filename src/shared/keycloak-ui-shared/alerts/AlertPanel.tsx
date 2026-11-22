/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/alerts/AlertPanel.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

// PatternFly-free toast panel — built from esuiss Alert.
import {
    CheckCircleIcon,
    InfoIcon,
    WarningCircleIcon,
    WarningIcon,
    XIcon
} from "@phosphor-icons/react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import type { AlertEntry } from "./Alerts";

export type AlertPanelProps = {
    alerts: AlertEntry[];
    onCloseAlert: (id: number) => void;
};

const ICON: Record<string, typeof InfoIcon> = {
    success: CheckCircleIcon,
    danger: WarningCircleIcon,
    warning: WarningIcon,
    info: InfoIcon,
    custom: InfoIcon
};

export function AlertPanel({ alerts, onCloseAlert }: AlertPanelProps) {
    return (
        <div
            data-testid="global-alerts"
            className="pointer-events-none fixed top-4 right-4 z-100 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
        >
            {alerts.map(({ id, variant, message, description }, index) => {
                const Icon = ICON[variant] ?? ICON.custom;
                return (
                    <Alert
                        key={id}
                        variant={variant === "danger" ? "destructive" : "default"}
                        data-testid={index === 0 ? "last-alert" : undefined}
                        aria-live="polite"
                        className="pointer-events-auto"
                    >
                        <Icon />
                        <AlertTitle className="whitespace-pre-wrap break-words">
                            {message}
                        </AlertTitle>
                        {description && (
                            <AlertDescription className="whitespace-pre-wrap break-words">
                                {description}
                            </AlertDescription>
                        )}
                        <AlertAction>
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Close"
                                onClick={() => onCloseAlert(id)}
                            >
                                <XIcon />
                            </Button>
                        </AlertAction>
                    </Alert>
                );
            })}
        </div>
    );
}
