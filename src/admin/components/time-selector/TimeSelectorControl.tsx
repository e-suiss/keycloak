/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/time-selector/TimeSelectorControl.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Label } from "@ui/components/label";
import {
    Controller,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
    type UseControllerProps,
    useFormContext
} from "react-hook-form";
import { HelpItem } from "../../../shared/keycloak-ui-shared";
import { TimeSelector, type TimeSelectorProps } from "./TimeSelector";

export type NumberControlOption = {
    key: string;
    value: string;
};

export type TimeSelectorControlProps<
    T extends FieldValues,
    P extends FieldPath<T> = FieldPath<T>
> = Omit<TimeSelectorProps, "name"> &
    UseControllerProps<T, P> & {
        name: string;
        label?: string;
        labelIcon?: string;
        controller: Omit<ControllerProps, "name" | "render">;
    };

export const TimeSelectorControl = <
    T extends FieldValues,
    P extends FieldPath<T> = FieldPath<T>
>({
    name,
    label,
    controller,
    labelIcon,
    ...rest
}: TimeSelectorControlProps<T, P>) => {
    const {
        control,
        formState: { errors }
    } = useFormContext();

    const error = errors[name];

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-1">
                <Label htmlFor={name}>
                    {label || name}
                    {controller.rules?.required === true && (
                        <span className="text-destructive"> *</span>
                    )}
                </Label>
                {labelIcon ? (
                    <HelpItem helpText={labelIcon} fieldLabelId={name} />
                ) : undefined}
            </div>
            <Controller
                {...controller}
                name={name}
                control={control}
                render={({ field }) => (
                    <TimeSelector
                        {...rest}
                        id={name}
                        data-testid={name}
                        value={field.value}
                        onChange={field.onChange}
                        aria-invalid={error ? true : undefined}
                    />
                )}
            />
            {error && (
                <p data-testid={`${name}-helper`} className="text-destructive text-sm">
                    {error.message as string}
                </p>
            )}
        </div>
    );
};
