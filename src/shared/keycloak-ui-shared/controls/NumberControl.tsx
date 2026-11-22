/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/NumberControl.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import type { InputHTMLAttributes } from "react";
import {
    Controller,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
    type UseControllerProps,
    useFormContext
} from "react-hook-form";

import { getRuleValue } from "../utils/getRuleValue";
import { FormLabel } from "./FormLabel";

export type NumberControlOption = {
    key: string;
    value: string;
};

export type NumberControlProps<
    T extends FieldValues,
    P extends FieldPath<T> = FieldPath<T>
> = Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "required" | "defaultValue"> &
    UseControllerProps<T, P> & {
        name: string;
        label?: string;
        labelIcon?: string;
        controller: Omit<ControllerProps, "name" | "render">;
    };

export const NumberControl = <
    T extends FieldValues,
    P extends FieldPath<T> = FieldPath<T>
>({
    name,
    label,
    controller,
    labelIcon,
    ...rest
}: NumberControlProps<T, P>) => {
    const {
        control,
        formState: { errors }
    } = useFormContext();

    return (
        <FormLabel
            name={name}
            label={label}
            isRequired={controller.rules?.required === true}
            error={errors[name]}
            labelIcon={labelIcon}
        >
            <Controller
                {...controller}
                name={name}
                control={control}
                render={({ field }) => {
                    const required = !!controller.rules?.required;
                    const min = getRuleValue(controller.rules?.min);
                    const value = field.value ?? controller.defaultValue;
                    const setValue = (newValue: number) =>
                        field.onChange(
                            min !== undefined ? Math.max(newValue, Number(min)) : newValue
                        );

                    const minValue = min !== undefined ? Number(min) : undefined;
                    const maxValue =
                        controller.rules?.max !== undefined
                            ? Number(controller.rules?.max)
                            : undefined;

                    return (
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="Minus"
                                onClick={() => setValue(value - 1)}
                            >
                                −
                            </Button>
                            <Input
                                {...rest}
                                id={name}
                                type="number"
                                className="w-20 text-center"
                                value={value}
                                aria-invalid={errors[name] ? true : undefined}
                                required={required}
                                min={minValue}
                                max={maxValue}
                                onChange={event => {
                                    const newValue = Number(event.currentTarget.value);
                                    setValue(
                                        !Number.isNaN(newValue)
                                            ? newValue
                                            : controller.defaultValue
                                    );
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="Plus"
                                onClick={() => setValue(value + 1)}
                            >
                                +
                            </Button>
                        </div>
                    );
                }}
            />
        </FormLabel>
    );
};
