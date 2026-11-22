/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/multi-line-input/MultiLineInput.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { MinusCircleIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import type { ComponentProps } from "react";
import { Fragment, useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormErrorText } from "../../../shared/keycloak-ui-shared";

function stringToMultiline(value?: string): string[] {
    return typeof value === "string" ? value.split("##") : [value || ""];
}

function toStringValue(formValue: string[]): string {
    return formValue.join("##");
}

export type MultiLineInputProps = Omit<ComponentProps<typeof Input>, "form"> & {
    name: string;
    addButtonLabel?: string;
    isDisabled?: boolean;
    defaultValue?: string[];
    stringify?: boolean;
    isRequired?: boolean;
};

export const MultiLineInput = ({
    name,
    addButtonLabel,
    isDisabled = false,
    defaultValue,
    stringify = false,
    isRequired = false,
    id,
    ...rest
}: MultiLineInputProps) => {
    const { t } = useTranslation();
    const {
        register,
        getValues,
        setValue,
        control,
        formState: { errors }
    } = useFormContext();
    const value = useWatch({
        name,
        control,
        defaultValue: defaultValue || ""
    });

    const fields = useMemo<string[]>(() => {
        let values = stringify
            ? stringToMultiline(
                  Array.isArray(value) && value.length === 1 ? value[0] : value
              )
            : Array.isArray(value)
              ? value
              : [value];

        if (!Array.isArray(values) || values.length === 0) {
            values = (stringify
                ? stringToMultiline(defaultValue as string)
                : defaultValue) || [""];
        }

        return values;
    }, [value, stringify, defaultValue]);

    const remove = (index: number) => {
        update([...fields.slice(0, index), ...fields.slice(index + 1)]);
    };

    const append = () => {
        update([...fields, ""]);
    };

    const updateValue = (index: number, value: string) => {
        update([...fields.slice(0, index), value, ...fields.slice(index + 1)]);
    };

    const update = (values: string[]) => {
        const fieldValue = values.flat();
        setValue(name, stringify ? toStringValue(fieldValue) : fieldValue, {
            shouldDirty: true,
            shouldValidate: true
        });
    };

    if (typeof getValues(name) === "undefined") {
        update(fields); // set initial default values
    }

    useEffect(() => {
        register(name, {
            validate: value =>
                isRequired &&
                (stringify ? value : toStringValue(value || [])).length === 0
                    ? t("required")
                    : undefined
        });
    }, [register, stringify, isRequired, t, name]);

    const getError = () => {
        return name.split(".").reduce((record: any, key) => record?.[key], errors);
    };

    return (
        <div id={id}>
            {fields.map((value, index) => (
                <Fragment key={index}>
                    <div className="flex items-center">
                        <Input
                            data-testid={name + index}
                            onChange={e => updateValue(index, e.target.value)}
                            name={`${name}.${index}.value`}
                            value={value}
                            disabled={isDisabled}
                            {...rest}
                        />
                        <Button
                            data-testid={`remove${index}`}
                            variant="link"
                            onClick={() => remove(index)}
                            tabIndex={-1}
                            aria-label={t("remove")}
                            disabled={fields.length === 1 || isDisabled}
                        >
                            <MinusCircleIcon />
                        </Button>
                    </div>
                    {index === fields.length - 1 && (
                        <>
                            {getError() && <FormErrorText message={t("required")} />}
                            <Button
                                variant="link"
                                onClick={append}
                                tabIndex={-1}
                                aria-label={t("add")}
                                data-testid={`${name}-addValue`}
                                disabled={!value || isDisabled}
                            >
                                <PlusCircleIcon /> {t(addButtonLabel || "add")}
                            </Button>
                        </>
                    )}
                </Fragment>
            ))}
        </div>
    );
};
