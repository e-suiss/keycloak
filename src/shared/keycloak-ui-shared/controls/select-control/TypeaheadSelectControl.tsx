/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/select-control/TypeaheadSelectControl.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
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
    ComboboxList
} from "@ui/components/combobox";
import { get } from "lodash-es";
import { useMemo, useState } from "react";
import {
    Controller,
    type FieldPath,
    type FieldValues,
    useFormContext
} from "react-hook-form";
import { getRuleValue } from "../../utils/getRuleValue";
import { FormLabel } from "../FormLabel";
import {
    isSelectBasedOptions,
    isString,
    key,
    type OptionType,
    type SelectControlOption,
    type SelectControlProps,
    SelectVariant
} from "./SelectControl";

const getValue = (option: SelectControlOption | string) =>
    isString(option) ? option : option.value;

export const TypeaheadSelectControl = <
    T extends FieldValues,
    P extends FieldPath<T> = FieldPath<T>
>({
    id,
    name,
    label,
    options,
    selectedOptions = [],
    controller,
    labelIcon,
    placeholderText,
    onFilter,
    variant,
    isFullWidth = true,
    ...rest
}: SelectControlProps<T, P>) => {
    const {
        control,
        formState: { errors }
    } = useFormContext();
    const [filterValue, setFilterValue] = useState("");
    const required = getRuleValue(controller.rules?.required) === true;
    const isTypeaheadMulti = variant === SelectVariant.typeaheadMulti;

    const combinedOptions = useMemo(
        () =>
            [
                ...options.filter(
                    o => !selectedOptions.map(o => getValue(o)).includes(getValue(o))
                ),
                ...selectedOptions
            ] as OptionType,
        [selectedOptions, options]
    );

    const filteredOptions = combinedOptions.filter(option =>
        getValue(option).toLowerCase().startsWith(filterValue.toLowerCase())
    );

    const labelForKey = (k: string) =>
        isSelectBasedOptions(combinedOptions)
            ? combinedOptions.find(o => o.key === k)?.value
            : k;

    return (
        <FormLabel
            id={id}
            name={name}
            label={label}
            isRequired={required}
            error={get(errors, name)}
            labelIcon={labelIcon}
        >
            <Controller
                {...controller}
                name={name}
                control={control}
                render={({ field }) => {
                    const singleValue = Array.isArray(field.value)
                        ? field.value[0]
                        : field.value;

                    const handleInputChange = (value: string) => {
                        setFilterValue(value);
                        onFilter?.(value);
                    };

                    if (isTypeaheadMulti) {
                        const selected = Array.isArray(field.value) ? field.value : [];

                        return (
                            <Combobox
                                {...rest}
                                multiple
                                items={filteredOptions.map(o => key(o))}
                                value={selected}
                                inputValue={filterValue}
                                onInputValueChange={handleInputChange}
                                onValueChange={(value: string[]) => {
                                    field.onChange(value);
                                    setFilterValue("");
                                }}
                            >
                                <ComboboxChips
                                    aria-invalid={get(errors, name) ? true : undefined}
                                    className={isFullWidth ? "w-full" : undefined}
                                >
                                    {selected.map((selection: string) => (
                                        <ComboboxChip key={selection}>
                                            {labelForKey(key(selection)) ??
                                                getValue(selection)}
                                        </ComboboxChip>
                                    ))}
                                    <ComboboxChipsInput
                                        id={id || name}
                                        placeholder={placeholderText}
                                        role="combobox"
                                        aria-controls="select-typeahead-listbox"
                                    />
                                </ComboboxChips>
                                <ComboboxContent>
                                    <ComboboxEmpty>No options found</ComboboxEmpty>
                                    <ComboboxList>
                                        {filteredOptions.map(option => (
                                            <ComboboxItem
                                                key={key(option)}
                                                value={key(option)}
                                            >
                                                <div className="flex flex-col">
                                                    <span>{getValue(option)}</span>
                                                    {!isString(option) &&
                                                        "description" in option &&
                                                        option.description && (
                                                            <span className="text-muted-foreground text-xs">
                                                                {option.description}
                                                            </span>
                                                        )}
                                                </div>
                                            </ComboboxItem>
                                        ))}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        );
                    }

                    const inputValue =
                        filterValue ||
                        (singleValue ? (labelForKey(singleValue) ?? singleValue) : "");

                    return (
                        <Combobox
                            {...rest}
                            items={filteredOptions.map(o => key(o))}
                            value={singleValue ?? null}
                            inputValue={inputValue}
                            onInputValueChange={handleInputChange}
                            onValueChange={(value: string | null) => {
                                const next = value ?? "";
                                field.onChange(
                                    Array.isArray(field.value) ? [next] : next
                                );
                                setFilterValue("");
                            }}
                        >
                            <ComboboxInput
                                id={id || name}
                                placeholder={placeholderText}
                                showClear={!!filterValue || !!singleValue}
                                aria-invalid={get(errors, name) ? true : undefined}
                                aria-controls="select-typeahead-listbox"
                                className={isFullWidth ? "w-full" : undefined}
                            />
                            <ComboboxContent>
                                <ComboboxEmpty>No options found</ComboboxEmpty>
                                <ComboboxList>
                                    {filteredOptions.map(option => (
                                        <ComboboxItem
                                            key={key(option)}
                                            value={key(option)}
                                        >
                                            <div className="flex flex-col">
                                                <span>{getValue(option)}</span>
                                                {!isString(option) &&
                                                    "description" in option &&
                                                    option.description && (
                                                        <span className="text-muted-foreground text-xs">
                                                            {option.description}
                                                        </span>
                                                    )}
                                            </div>
                                        </ComboboxItem>
                                    ))}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    );
                }}
            />
        </FormLabel>
    );
};
