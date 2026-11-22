/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/select/SingleSelect.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Children, useRef } from "react";
import { type KeycloakSelectProps, propertyToString } from "./KeycloakSelect";

type SelectOptionProps = {
    value?: string | number | object;
    children?: React.ReactNode;
    isDisabled?: boolean;
};

type SingleSelectProps = Omit<KeycloakSelectProps, "variant">;

export const SingleSelect = ({
    toggleId,
    onToggle,
    onSelect,
    selections,
    isOpen,
    menuAppendTo,
    direction,
    width,
    maxHeight,
    toggleIcon,
    className,
    isDisabled,
    children,
    ...props
}: SingleSelectProps) => {
    const ref = useRef<HTMLButtonElement>(null);

    const childArray = Children.toArray(
        children
    ) as React.ReactElement<SelectOptionProps>[];

    const selectedValue =
        selections !== undefined && selections !== null ? String(selections) : undefined;

    const selectedLabel =
        childArray.find(c => c.props.value === selections)?.props.children ||
        selections ||
        props["aria-label"];

    return (
        <Select
            value={selectedValue}
            open={isOpen}
            onOpenChange={open => onToggle(open)}
            onValueChange={value => onSelect?.(value || "")}
            disabled={isDisabled}
        >
            <SelectTrigger
                id={toggleId}
                ref={ref}
                className={className}
                aria-label={props["aria-label"]}
                style={{
                    width: propertyToString(width),
                    ...(props.style as React.CSSProperties)
                }}
            >
                {toggleIcon}
                <SelectValue placeholder={props["aria-label"]}>
                    {selectedLabel}
                </SelectValue>
            </SelectTrigger>
            <SelectContent
                style={{ maxHeight: propertyToString(maxHeight) }}
                side={direction === "up" ? "top" : "bottom"}
            >
                {childArray.map((child, index) => (
                    <SelectItem
                        key={index}
                        value={String(child.props.value ?? "")}
                        disabled={child.props.isDisabled}
                    >
                        {child.props.children}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
