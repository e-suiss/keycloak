/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/account-security/LinkedAccountsToolbar.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@ui/components/input-group";

import { useState } from "react";
import { useTranslation } from "react-i18next";

type LinkedAccountsToolbarProps = {
    onFilter: (nameFilter: string) => void;
    count: number;
    first: number;
    max: number;
    onNextClick: (page: number) => void;
    onPreviousClick: (page: number) => void;
    onPerPageSelect: (max: number, first: number) => void;
    hasNext: boolean;
};

export const LinkedAccountsToolbar = ({
    count,
    first,
    max,
    onNextClick,
    onPreviousClick,
    onPerPageSelect,
    onFilter,
    hasNext
}: LinkedAccountsToolbarProps) => {
    const { t } = useTranslation();
    const [nameFilter, setNameFilter] = useState("");

    const page = Math.round(first / max) + 1;
    const hasPrevious = first > 0;

    return (
        <div className="flex items-center gap-2">
            <InputGroup className="w-44">
                <InputGroupInput
                    type="text"
                    placeholder={t("filterByName")}
                    aria-label={t("filterByName")}
                    value={nameFilter}
                    onChange={e => setNameFilter(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            onFilter(nameFilter);
                        }
                    }}
                />
                <InputGroupAddon>
                    <MagnifyingGlassIcon />
                </InputGroupAddon>
            </InputGroup>
            <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={t("filterByName")}
                onClick={() => onFilter(nameFilter)}
            >
                <MagnifyingGlassIcon />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label="Previous"
                disabled={!hasPrevious}
                onClick={() => onPreviousClick((page - 1) * max)}
            >
                <CaretLeftIcon />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label="Next"
                disabled={!hasNext}
                onClick={() => onNextClick((page - 1) * max)}
            >
                <CaretRightIcon />
            </Button>
        </div>
    );
};
