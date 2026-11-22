/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/select/TypeaheadSelect.tsx"
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
    ComboboxList,
    ComboboxTrigger
} from "@ui/components/combobox";
import { Separator } from "@ui/components/separator";
import { Children, useMemo, useState } from "react";
import { type KeycloakSelectProps, SelectVariant } from "./KeycloakSelect";

export const TypeaheadSelect = ({
    toggleId,
    onSelect,
    onToggle,
    onFilter,
    variant,
    validated,
    placeholderText,
    maxHeight,
    width,
    toggleIcon,
    direction,
    selections,
    typeAheadAriaLabel,
    chipGroupComponent,
    chipGroupProps,
    footer,
    isDisabled,
    children,
    ...rest
}: KeycloakSelectProps) => {
    const [filterValue, setFilterValue] = useState("");

    const isMulti = variant === SelectVariant.typeaheadMulti;

    // PatternFly SelectOption children carry `value` and display `children`.
    const options = useMemo(() => {
        const childArray = Children.toArray(children) as React.ReactElement<{
            value?: any;
            children?: React.ReactNode;
        }>[];

        return childArray
            .filter(child => child && child.props && child.props.value !== undefined)
            .map(child => ({
                value: child.props.value,
                label: child.props.children ?? child.props.value
            }));
    }, [children]);

    const selectedValues = isMulti
        ? Array.isArray(selections)
            ? selections
            : selections
              ? [selections]
              : []
        : (selections ?? null);

    const handleInputChange = (value: string) => {
        setFilterValue(value);
        onFilter?.(value);
    };

    const inputValue =
        variant === SelectVariant.typeahead && selections
            ? (selections as string)
            : filterValue;

    return (
        <Combobox
            {...rest}
            items={options}
            multiple={isMulti}
            value={selectedValues}
            inputValue={inputValue}
            disabled={isDisabled}
            open={rest.isOpen}
            onOpenChange={(open: boolean) => onToggle?.(open)}
            onInputValueChange={(value: string) => handleInputChange(value ?? "")}
            onValueChange={(value: any) => {
                if (isMulti) {
                    const prev = Array.isArray(selectedValues) ? selectedValues : [];
                    const next = Array.isArray(value) ? value : [];
                    // Determine which entry toggled and emit it (matches PF onSelect contract).
                    const added = next.find(v => !prev.includes(v));
                    const removed = prev.find(v => !next.includes(v));
                    const changed = added ?? removed;
                    if (changed !== undefined) {
                        onSelect?.(changed);
                    }
                    setFilterValue("");
                    onFilter?.("");
                } else {
                    onSelect?.(value ?? "");
                    setFilterValue("");
                    onFilter?.("");
                }
            }}
        >
            {isMulti ? (
                chipGroupComponent ? (
                    chipGroupComponent
                ) : (
                    <ComboboxChips
                        aria-invalid={validated === "error" || undefined}
                        {...chipGroupProps}
                    >
                        {(Array.isArray(selectedValues) ? selectedValues : []).map(
                            (selection: string, index: number) => (
                                <ComboboxChip
                                    key={index}
                                    aria-label={selection}
                                    onClick={() => onSelect?.(selection)}
                                >
                                    {selection}
                                </ComboboxChip>
                            )
                        )}
                        <ComboboxChipsInput
                            id={toggleId}
                            placeholder={placeholderText}
                            aria-label={typeAheadAriaLabel}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleInputChange(e.target.value)
                            }
                        />
                        <ComboboxTrigger aria-label="Toggle options" />
                    </ComboboxChips>
                )
            ) : (
                <ComboboxInput
                    id={toggleId}
                    placeholder={placeholderText}
                    aria-label={typeAheadAriaLabel}
                    aria-invalid={validated === "error" || undefined}
                    showClear={!!filterValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange(e.target.value)
                    }
                >
                    {toggleIcon}
                </ComboboxInput>
            )}
            <ComboboxContent
                side={direction === "up" ? "top" : "bottom"}
                style={{
                    maxHeight:
                        typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
                    width: typeof width === "number" ? `${width}px` : width
                }}
            >
                <ComboboxEmpty>No results found</ComboboxEmpty>
                <ComboboxList>
                    {(item: { value: any; label: React.ReactNode }) => (
                        <ComboboxItem key={String(item.value)} value={item.value}>
                            {item.label}
                        </ComboboxItem>
                    )}
                </ComboboxList>
                {footer && (
                    <>
                        <Separator className="my-1" />
                        <div className="p-1">{footer}</div>
                    </>
                )}
            </ComboboxContent>
        </Combobox>
    );
};
