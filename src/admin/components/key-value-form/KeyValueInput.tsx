/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/key-value-form/KeyValueInput.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { MinusCircleIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Empty, EmptyContent, EmptyDescription } from "@ui/components/empty";
import { Input } from "@ui/components/input";
import { Fragment, type FunctionComponent, type PropsWithChildren } from "react";
import {
    type FieldValues,
    useFieldArray,
    useFormContext,
    useWatch
} from "react-hook-form";
import { useTranslation } from "react-i18next";

export type DefaultValue = {
    key: string;
    values?: string[];
    label: string;
};

type Field = {
    name: string;
    error: boolean;
};

type ValueField = Field & {
    keyValue: string;
};

type KeyValueInputProps = PropsWithChildren & {
    name: string;
    label?: string;
    isDisabled?: boolean;
    keyLabel?: string;
    valueLabel?: string;
    KeyComponent?: FunctionComponent<Field>;
    ValueComponent?: FunctionComponent<ValueField>;
};

export const KeyValueInput = ({
    name,
    label = "attributes",
    isDisabled = false,
    keyLabel = "key",
    valueLabel = "value",
    KeyComponent,
    ValueComponent
}: KeyValueInputProps) => {
    const { t } = useTranslation();
    const {
        control,
        register,
        formState: { errors }
    } = useFormContext();

    const { fields, append, remove } = useFieldArray({
        control,
        name
    });

    const appendNew = () => append({ key: "", value: "" });

    const values = useWatch<FieldValues>({
        name,
        control,
        defaultValue: []
    });

    const getError = () => {
        return name.split(".").reduce((record: any, key) => record?.[key], errors);
    };

    return fields.length > 0 ? (
        <>
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-5">
                    <span className="font-medium text-sm">{t(keyLabel)}</span>
                </div>
                <div className="col-span-7">
                    <span className="font-medium text-sm">{t(valueLabel)}</span>
                </div>
                {fields.map((attribute, index) => {
                    const error = getError()?.[index];
                    const keyError = !!error?.key;
                    const valueErrorPresent = !!error?.value || !!error?.message;
                    const valueError = error?.message || t(`${valueLabel}Error`);
                    return (
                        <Fragment key={attribute.id}>
                            <div className="col-span-5">
                                {KeyComponent ? (
                                    <KeyComponent
                                        name={`${name}.${index}.key`}
                                        error={keyError}
                                    />
                                ) : (
                                    <Input
                                        placeholder={t(`${keyLabel}Placeholder`)}
                                        aria-label={t(keyLabel)}
                                        data-testid={`${name}-key`}
                                        {...register(`${name}.${index}.key`, {
                                            required: true
                                        })}
                                        aria-invalid={keyError || undefined}
                                        required
                                        disabled={isDisabled}
                                    />
                                )}
                                {keyError && (
                                    <p className="text-destructive text-sm">
                                        {t(`${keyLabel}Error`)}
                                    </p>
                                )}
                            </div>
                            <div className="col-span-5">
                                {ValueComponent ? (
                                    <ValueComponent
                                        name={`${name}.${index}.value`}
                                        keyValue={values[index]?.key}
                                        error={valueErrorPresent}
                                    />
                                ) : (
                                    <Input
                                        placeholder={t(`${valueLabel}Placeholder`)}
                                        aria-label={t(valueLabel)}
                                        data-testid={`${name}-value`}
                                        {...register(`${name}.${index}.value`, {
                                            required: true
                                        })}
                                        aria-invalid={valueErrorPresent || undefined}
                                        required
                                        disabled={isDisabled}
                                    />
                                )}
                                {valueErrorPresent && (
                                    <p className="text-destructive text-sm">
                                        {valueError}
                                    </p>
                                )}
                            </div>
                            <div className="col-span-2">
                                <Button
                                    variant="link"
                                    title={t("removeAttribute")}
                                    onClick={() => remove(index)}
                                    data-testid={`${name}-remove`}
                                    disabled={isDisabled}
                                >
                                    <MinusCircleIcon />
                                </Button>
                            </div>
                        </Fragment>
                    );
                })}
            </div>
            <div className="flex gap-2">
                <Button
                    data-testid={`${name}-add-row`}
                    className="mt-2 px-0"
                    variant="link"
                    onClick={appendNew}
                    disabled={isDisabled}
                >
                    <PlusCircleIcon />
                    {t("addAttribute", { label })}
                </Button>
            </div>
        </>
    ) : (
        <Empty data-testid={`${name}-empty-state`} className="p-0">
            <EmptyDescription>{t("missingAttributes", { label })}</EmptyDescription>
            <EmptyContent>
                <Button
                    data-testid={`${name}-add-row`}
                    variant="link"
                    size="sm"
                    onClick={appendNew}
                    disabled={isDisabled}
                >
                    <PlusCircleIcon />
                    {t("addAttribute", { label })}
                </Button>
            </EmptyContent>
        </Empty>
    );
};
