/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/SwitchControl.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Label } from "@ui/components/label";
import { Switch } from "@ui/components/switch";
import type * as React from "react";
import {
    Controller,
    type FieldPath,
    type FieldValues,
    type PathValue,
    type UseControllerProps,
    useFormContext
} from "react-hook-form";
import { FormLabel } from "./FormLabel";

type SwitchProps = React.ComponentProps<typeof Switch>;

import { debeerify } from "../user-profile/utils";

export type SwitchControlProps<
    T extends FieldValues,
    P extends FieldPath<T> = FieldPath<T>
> = Omit<SwitchProps, "name" | "defaultValue" | "ref"> &
    UseControllerProps<any, P> & {
        name: string;
        label?: string;
        labelIcon?: string;
        labelOn: string;
        labelOff: string;
        stringify?: boolean;
    };

export const SwitchControl = <
    T extends FieldValues,
    P extends FieldPath<T> = FieldPath<T>
>({
    labelOn,
    stringify,
    defaultValue,
    labelIcon,
    ...props
}: SwitchControlProps<T, P>) => {
    const fallbackValue = stringify ? "false" : false;
    const defValue = defaultValue ?? (fallbackValue as PathValue<T, P>);
    const { control } = useFormContext();
    return (
        <FormLabel
            hasNoPaddingTop
            name={props.name}
            isRequired={props.rules?.required === true}
            label={props.label}
            labelIcon={labelIcon}
        >
            <Controller
                control={control}
                name={props.name}
                defaultValue={defValue}
                render={({ field: { onChange, value } }) => {
                    const isChecked = stringify ? value === "true" : value;
                    return (
                        <div className="flex items-center gap-2">
                            <Switch
                                {...props}
                                id={props.name}
                                data-testid={debeerify(props.name)}
                                aria-label={props.label}
                                checked={isChecked}
                                onCheckedChange={checked => {
                                    const value = stringify
                                        ? checked.toString()
                                        : checked;
                                    props.onCheckedChange?.(checked);
                                    onChange(value);
                                }}
                            />
                            {labelOn && (
                                <Label htmlFor={props.name}>{labelOn}</Label>
                            )}
                        </div>
                    );
                }}
            />
        </FormLabel>
    );
};
