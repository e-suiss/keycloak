/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dropdown-panel/DropdownPanel.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover";
import { useEffect } from "react";

type DropdownPanelProps = {
    buttonText: string;
    children: React.ReactNode;
    setSearchDropdownOpen: (open: boolean) => void;
    searchDropdownOpen: boolean;
    marginRight?: string;
    width: string;
};

const DropdownPanel: React.FC<DropdownPanelProps> = ({
    buttonText,
    children,
    setSearchDropdownOpen,
    searchDropdownOpen,
    marginRight,
    width
}) => {
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                setSearchDropdownOpen(false);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () =>
            document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [setSearchDropdownOpen]);

    return (
        <Popover open={searchDropdownOpen} onOpenChange={setSearchDropdownOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    aria-label={buttonText}
                    style={{ width, marginRight }}
                    data-testid="dropdown-panel-btn"
                >
                    {buttonText}
                    <CaretDownIcon data-icon="inline-end" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto">
                {children}
            </PopoverContent>
        </Popover>
    );
};

export default DropdownPanel;
