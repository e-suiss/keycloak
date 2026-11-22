/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/FileUploadControl.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Input } from "@ui/components/input";
import { type ComponentProps, type ReactNode, useState } from "react";
import {
    type FieldPath,
    type FieldValues,
    type PathValue,
    type UseControllerProps,
    useController
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getRuleValue } from "../utils/getRuleValue";
import { FormLabel } from "./FormLabel";

export type FileUploadControlProps<
    T extends FieldValues,
    P extends FieldPath<T> = FieldPath<T>
> = UseControllerProps<T, P> &
    Omit<ComponentProps<typeof Input>, "name" | "required"> & {
        label: string;
        labelIcon?: string | ReactNode;
        isDisabled?: boolean;
        "data-testid"?: string;
        type?: string;
    };

export const FileUploadControl = <
    T extends FieldValues,
    P extends FieldPath<T> = FieldPath<T>
>(
    props: FileUploadControlProps<T, P>
) => {
    const { labelIcon, ...rest } = props;
    const required = !!getRuleValue(props.rules?.required);
    const defaultValue = props.defaultValue ?? ("" as PathValue<T, P>);

    const { t } = useTranslation();

    const [filename, setFilename] = useState<string>("");

    const { field, fieldState } = useController({
        ...props,
        defaultValue
    });

    return (
        <FormLabel
            name={props.name}
            label={props.label}
            labelIcon={labelIcon}
            isRequired={required}
            error={fieldState.error}
        >
            <div className="space-y-1.5">
                <Input
                    type="file"
                    required={required}
                    data-testid={props["data-testid"] || props.name}
                    aria-invalid={fieldState.error ? true : undefined}
                    disabled={props.isDisabled}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    onChange={e => {
                        const file = e.target.files?.[0] ?? null;
                        field.onChange(file);
                        setFilename(file ? file.name : "");
                    }}
                    className="cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-foreground file:text-sm"
                />
                {filename ? (
                    <p className="text-muted-foreground text-sm">{filename}</p>
                ) : (
                    <p className="text-muted-foreground text-sm">{t("browse")}</p>
                )}
            </div>
        </FormLabel>
    );
};
