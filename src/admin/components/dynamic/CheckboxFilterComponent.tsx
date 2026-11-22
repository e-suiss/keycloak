/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/CheckboxFilterComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { CaretDownIcon } from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";

type CheckboxFilterOptions = {
    value: string;
    label: string;
};

type CheckboxFilterComponentProps = {
    filterPlaceholderText: string;
    isOpen: boolean;
    options: CheckboxFilterOptions[];
    onOpenChange: (isOpen: boolean) => void;
    onToggleClick: () => void;
    onSelect: (event: React.MouseEvent<HTMLButtonElement>, selection: string) => void;
    selectedItems: string[];
    width?: string;
};

export const CheckboxFilterComponent = ({
    filterPlaceholderText,
    isOpen,
    options,
    onOpenChange,
    onToggleClick,
    onSelect,
    selectedItems,
    width
}: CheckboxFilterComponentProps) => {
    return (
        <DropdownMenu
            open={isOpen}
            onOpenChange={open => {
                if (!open) {
                    onOpenChange(false);
                }
            }}
        >
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    onClick={onToggleClick}
                    style={{ width }}
                    className="justify-between gap-2"
                    data-testid="checkbox-filter-toggle"
                >
                    <span className="inline-flex items-center gap-1.5">
                        {filterPlaceholderText}
                        {selectedItems.length > 0 && (
                            <Badge variant="secondary">{selectedItems.length}</Badge>
                        )}
                    </span>
                    <CaretDownIcon className="opacity-60" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                role="menu"
                id="checkbox-select"
                align="start"
                data-testid="checkbox-filter-select"
            >
                {options.map(option => (
                    <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={selectedItems.includes(option.value)}
                        onSelect={event => {
                            event.preventDefault();
                            onSelect(
                                event as unknown as React.MouseEvent<HTMLButtonElement>,
                                option.value
                            );
                        }}
                        data-testid={`checkbox-filter-option-${option.value}`}
                    >
                        {option.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
