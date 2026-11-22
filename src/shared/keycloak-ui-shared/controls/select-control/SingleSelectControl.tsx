/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/select-control/SingleSelectControl.tsx"
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
import { get } from "lodash-es";
import {
    Controller,
    type FieldPath,
    type FieldValues,
    useFormContext
} from "react-hook-form";
import { getRuleValue } from "../../utils/getRuleValue";
import { FormLabel } from "../FormLabel";
import { isString, key, type SelectControlProps } from "./SelectControl";

export const SingleSelectControl = <
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
    isDisabled,
    isFullWidth = true,
    onSelect,
    ...rest
}: SelectControlProps<T, P>) => {
    const {
        control,
        formState: { errors }
    } = useFormContext();
    const required = getRuleValue(controller.rules?.required) === true;

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
                render={({ field: { onChange, value } }) => {
                    const selectedKey = Array.isArray(value) ? value[0] : value;
                    const handleValueChange = (v: string) => {
                        const convertedValue = Array.isArray(value) ? [v] : v;
                        if (onSelect) {
                            onSelect(convertedValue, onChange);
                        } else {
                            onChange(convertedValue);
                        }
                    };
                    return (
                        <Select
                            {...rest}
                            value={selectedKey ? String(selectedKey) : undefined}
                            onValueChange={handleValueChange}
                            disabled={isDisabled}
                        >
                            <SelectTrigger
                                id={id || name}
                                aria-label={label}
                                aria-invalid={get(errors, name) ? true : undefined}
                                className={isFullWidth ? "w-full" : undefined}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent data-testid={`select-${name}`}>
                                {[...options, ...selectedOptions].map(option => (
                                    <SelectItem key={key(option)} value={key(option)}>
                                        <span className="flex flex-col">
                                            <span>
                                                {isString(option) ? option : option.value}
                                            </span>
                                            {!isString(option) &&
                                            "description" in option ? (
                                                <span className="text-muted-foreground text-xs">
                                                    {option.description}
                                                </span>
                                            ) : null}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    );
                }}
            />
        </FormLabel>
    );
};
