// @ts-nocheck
import type { UserProfileAttributeMetadata } from "@keycloak/keycloak-admin-client/lib/defs/userProfileMetadata";
import type { TFunction } from "i18next";
import { get } from "lodash-es";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel
} from "@ui/components/field";
import type { PropsWithChildren, ReactNode } from "react";
import type { FieldError, UseFormReturn } from "react-hook-form";

import {
    fieldName,
    isRequiredAttribute,
    label,
    labelAttribute,
    type UserFormFields
} from "./utils";

export type UserProfileGroupProps = {
    t: TFunction;
    form: UseFormReturn<UserFormFields>;
    attribute: UserProfileAttributeMetadata;
    renderer?: (attribute: UserProfileAttributeMetadata) => ReactNode;
};

export const UserProfileGroup = ({
    t,
    form,
    attribute,
    renderer,
    children
}: PropsWithChildren<UserProfileGroupProps>) => {
    const helpText = label(t, attribute.annotations?.inputHelperTextBefore as string);
    const {
        formState: { errors }
    } = form;

    const component = renderer?.(attribute);
    const error = get(errors, fieldName(attribute.name)) as FieldError;
    const fieldLabel = labelAttribute(t, attribute) || "";

    return (
        <Field key={attribute.name}>
            <FieldLabel htmlFor={attribute.name}>
                {fieldLabel}
                {isRequiredAttribute(attribute) && (
                    <span className="text-destructive"> *</span>
                )}
            </FieldLabel>

            {component ? (
                <div className="flex items-center gap-2">
                    {children}
                    {component}
                </div>
            ) : (
                children
            )}

            {helpText && <FieldDescription>{helpText}</FieldDescription>}

            {error && (
                <FieldError data-testid={`${attribute.name}-helper`}>
                    {error.message as string}
                </FieldError>
            )}
        </Field>
    );
};
