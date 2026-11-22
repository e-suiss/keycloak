/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/MultivaluedListComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    useComboboxAnchor
} from "@ui/components/combobox";
import { Label } from "@ui/components/label";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
    FormErrorText,
    HelpItem,
    SelectVariant
} from "../../../shared/keycloak-ui-shared";
import type { ComponentProps } from "./components";

function stringToMultiline(value?: string): string[] {
    return typeof value === "string" && value.length > 0 ? value.split("##") : [];
}

function toStringValue(formValue: string[]): string {
    return formValue.join("##");
}

type MultiValuedListComponentProps = ComponentProps & {
    variant?: `${SelectVariant}`;
};

export const MultiValuedListComponent = ({
    name,
    label,
    helpText,
    defaultValue,
    options,
    isDisabled = false,
    stringify,
    required,
    convertToName,
    onSearch,
    variant = SelectVariant.typeaheadMulti
}: MultiValuedListComponentProps) => {
    const { t } = useTranslation();
    const {
        control,
        formState: { errors }
    } = useFormContext();
    const [open, setOpen] = useState(false);
    const anchorRef = useComboboxAnchor();

    function setSearch(value: string) {
        if (onSearch) {
            onSearch(value);
        }
    }

    const convertedName = convertToName(name!);
    const isMulti = variant === SelectVariant.typeaheadMulti;

    const getError = () => {
        return convertedName
            .split(".")
            .reduce((record: any, key) => record?.[key], errors);
    };

    return (
        <div className="space-y-1.5">
            <Label htmlFor={name!}>
                {t(label!)}
                {required && <span className="text-destructive">*</span>}
                <HelpItem helpText={t(helpText!)} fieldLabelId={`${label}`} />
            </Label>
            <Controller
                name={convertedName}
                control={control}
                defaultValue={
                    stringify || !isMulti
                        ? defaultValue || ""
                        : defaultValue
                          ? [defaultValue]
                          : []
                }
                rules={{
                    required: { value: required || false, message: t("required") }
                }}
                render={({ field }) => {
                    const selections = isMulti
                        ? stringify
                            ? stringToMultiline(field.value)
                            : (field.value as string[]) || []
                        : (field.value as string) || "";

                    const commitMulti = (next: string[]) => {
                        field.onChange(stringify ? toStringValue(next) : next);
                    };

                    if (isMulti) {
                        return (
                            <>
                                <Combobox
                                    items={options ?? []}
                                    multiple
                                    value={selections}
                                    disabled={isDisabled}
                                    open={open}
                                    onOpenChange={setOpen}
                                    onValueChange={(value: string[]) =>
                                        commitMulti(value ?? [])
                                    }
                                    onInputValueChange={setSearch}
                                >
                                    <ComboboxChips ref={anchorRef}>
                                        {selections.map((selection: string) => (
                                            <ComboboxChip
                                                key={selection}
                                                aria-label={selection}
                                            >
                                                {selection}
                                            </ComboboxChip>
                                        ))}
                                        <ComboboxChipsInput
                                            id={name}
                                            data-testid={name}
                                            aria-label={t("choose")}
                                            disabled={isDisabled}
                                        />
                                    </ComboboxChips>
                                    <ComboboxContent anchor={anchorRef}>
                                        <ComboboxEmpty>{t("noResults")}</ComboboxEmpty>
                                        <ComboboxList>
                                            {(option: string) => (
                                                <ComboboxItem key={option} value={option}>
                                                    {option}
                                                </ComboboxItem>
                                            )}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                                {getError() && (
                                    <FormErrorText message={getError().message} />
                                )}
                            </>
                        );
                    }

                    return (
                        <>
                            <Combobox
                                items={options ?? []}
                                value={selections}
                                disabled={isDisabled}
                                open={open}
                                onOpenChange={setOpen}
                                onValueChange={(value: string) => {
                                    field.onChange(value ?? "");
                                }}
                                onInputValueChange={setSearch}
                            >
                                <ComboboxInput
                                    id={name}
                                    data-testid={name}
                                    aria-label={t("choose")}
                                    disabled={isDisabled}
                                    showClear
                                />
                                <ComboboxContent>
                                    <ComboboxEmpty>{t("noResults")}</ComboboxEmpty>
                                    <ComboboxList>
                                        {(option: string) => (
                                            <ComboboxItem key={option} value={option}>
                                                {option}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                            {getError() && <FormErrorText message={getError().message} />}
                        </>
                    );
                }}
            />
        </div>
    );
};
