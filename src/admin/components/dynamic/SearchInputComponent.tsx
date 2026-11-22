/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/SearchInputComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { ArrowRightIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { useTranslation } from "react-i18next";

type SearchInputComponentProps = {
    value: string;
    onChange: (value: string) => void;
    onSearch: (value: string) => void;
    onClear: () => void;
    placeholder?: string;
    "aria-label"?: string;
};

export const SearchInputComponent = ({
    value,
    onChange,
    onSearch,
    onClear,
    placeholder,
    "aria-label": ariaLabel
}: SearchInputComponentProps) => {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-[0.1rem]">
            <div className="relative flex items-center">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
                <Input
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    aria-label={ariaLabel}
                    data-testid="search-input"
                    className="pr-9 pl-9"
                />
                {value && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1"
                        onClick={onClear}
                        aria-label={t("clear")}
                        data-testid="clear-search"
                    >
                        <XIcon />
                    </Button>
                )}
            </div>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onSearch(value)}
                aria-label={t("search")}
                data-testid="search"
            >
                <ArrowRightIcon />
            </Button>
        </div>
    );
};
