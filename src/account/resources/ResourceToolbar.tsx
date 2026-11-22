/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/resources/ResourceToolbar.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import {
    CaretLeftIcon,
    CaretRightIcon,
    MagnifyingGlassIcon,
    XCircleIcon
} from "@phosphor-icons/react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@ui/components/input-group";
import { Button } from "@ui/components/button";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type ResourceToolbarProps = {
    onFilter: (nameFilter: string) => void;
    count: number;
    first: number;
    max: number;
    onNextClick: (page: number) => void;
    onPreviousClick: (page: number) => void;
    onPerPageSelect: (max: number, first: number) => void;
    hasNext: boolean;
};

export const ResourceToolbar = ({
    count,
    first,
    max,
    onNextClick,
    onPreviousClick,
    onPerPageSelect,
    onFilter,
    hasNext
}: ResourceToolbarProps) => {
    const { t } = useTranslation();
    const [nameFilter, setNameFilter] = useState("");

    const page = Math.round(first / max) + 1;
    const firstIndex = count > 0 ? first + 1 : 0;
    const lastIndex = first + count;
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <InputGroup className="min-w-0 flex-1 sm:max-w-xs">
                <InputGroupInput
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
                {nameFilter && (
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            size="icon-xs"
                            aria-label={t("clear")}
                            className="text-muted-foreground"
                            onClick={() => {
                                setNameFilter("");
                                onFilter("");
                            }}
                        >
                            <XCircleIcon weight="fill" />
                        </InputGroupButton>
                    </InputGroupAddon>
                )}
            </InputGroup>
            <div className="flex items-center gap-3">
                <NativeSelect
                    value={max}
                    onChange={e => onPerPageSelect(0, parseInt(e.target.value, 10))} className="w-auto" size="sm"
                >
                    <NativeSelectOption value={5}>5</NativeSelectOption>
                    <NativeSelectOption value={10}>10</NativeSelectOption>
                    <NativeSelectOption value={20}>20</NativeSelectOption>
                </NativeSelect>
                <span className="text-sm font-medium text-muted-foreground tabular-nums">
                    {firstIndex} - {lastIndex}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("previousPage", "Previous")}
                        disabled={page <= 1}
                        onClick={() => onPreviousClick((page - 2) * max)}
                    >
                        <CaretLeftIcon />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("nextPage", "Next")}
                        disabled={!hasNext}
                        onClick={() => onNextClick(page * max)}
                    >
                        <CaretRightIcon />
                    </Button>
                </div>
            </div>
        </div>
    );
};
