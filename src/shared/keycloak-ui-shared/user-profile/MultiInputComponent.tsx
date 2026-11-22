/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/user-profile/MultiInputComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { MinusCircleIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import type { TFunction } from "i18next";
import { type ComponentProps, Fragment, useEffect, useMemo } from "react";
import { type FieldPath, type UseFormReturn, useWatch } from "react-hook-form";

import type { InputType, UserProfileFieldProps } from "./UserProfileFields";
import { UserProfileGroup } from "./UserProfileGroup";
import { fieldName, labelAttribute, type UserFormFields } from "./utils";

export const MultiInputComponent = ({
    t,
    form,
    attribute,
    renderer,
    ...rest
}: UserProfileFieldProps) => (
    <UserProfileGroup t={t} form={form} attribute={attribute} renderer={renderer}>
        <MultiLineInput
            t={t}
            form={form}
            aria-label={labelAttribute(t, attribute)}
            name={fieldName(attribute.name)!}
            defaultValue={[attribute.defaultValue || ""]}
            addButtonLabel={t("addMultivaluedLabel", {
                fieldLabel: labelAttribute(t, attribute)
            })}
            {...rest}
        />
    </UserProfileGroup>
);

export type MultiLineInputProps = Omit<ComponentProps<typeof Input>, "form"> & {
    t: TFunction;
    name: FieldPath<UserFormFields>;
    form: UseFormReturn<UserFormFields>;
    addButtonLabel?: string;
    isDisabled?: boolean;
    defaultValue?: string[];
    inputType: InputType;
};

const MultiLineInput = ({
    t,
    name,
    inputType,
    form,
    addButtonLabel,
    isDisabled = false,
    defaultValue,
    id,
    ...rest
}: MultiLineInputProps) => {
    const { register, setValue, control } = form;
    const value = useWatch({
        name,
        control,
        defaultValue: defaultValue || ""
    });

    const fields = useMemo<string[]>(() => {
        return Array.isArray(value) && value.length !== 0 ? value : defaultValue || [""];
    }, [value, defaultValue]);

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
        setValue(name, fieldValue, {
            shouldDirty: true
        });
    };

    const type = inputType.startsWith("html")
        ? inputType.substring("html".length + 2)
        : "text";

    useEffect(() => {
        register(name);
    }, [register, name]);

    return (
        <div id={id}>
            {fields.map((value, index) => (
                <Fragment key={index}>
                    <div className="flex items-center">
                        <Input
                            className="flex-1"
                            data-testid={name + index}
                            onChange={e => updateValue(index, e.target.value)}
                            name={`${name}.${index}.value`}
                            value={value}
                            disabled={isDisabled}
                            type={type}
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
                        <Button
                            variant="link"
                            onClick={append}
                            tabIndex={-1}
                            aria-label={t("add")}
                            data-testid="addValue"
                            disabled={!value || isDisabled}
                        >
                            <PlusCircleIcon /> {t(addButtonLabel || "add")}
                        </Button>
                    )}
                </Fragment>
            ))}
        </div>
    );
};
