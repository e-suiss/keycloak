/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/buttons/FormSubmitButton.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Button } from "@ui/components/button";
import type { ComponentProps, PropsWithChildren } from "react";
import type { FieldValues, FormState } from "react-hook-form";

type ButtonProps = ComponentProps<typeof Button>;

export type FormSubmitButtonProps = Omit<ButtonProps, "disabled"> & {
    formState: FormState<FieldValues>;
    allowNonDirty?: boolean;
    allowInvalid?: boolean;
    isDisabled?: boolean;
};

const isSubmittable = (
    formState: FormState<FieldValues>,
    allowNonDirty: boolean,
    allowInvalid: boolean
) => {
    return (
        (formState.isValid || allowInvalid) &&
        (formState.isDirty || allowNonDirty) &&
        !formState.isLoading &&
        !formState.isValidating &&
        !formState.isSubmitting
    );
};

export const FormSubmitButton = ({
    formState,
    isDisabled = false,
    allowInvalid = false,
    allowNonDirty = false,
    children,
    ...rest
}: PropsWithChildren<FormSubmitButtonProps>) => {
    return (
        <Button
            disabled={
                (formState && !isSubmittable(formState, allowNonDirty, allowInvalid)) ||
                isDisabled
            }
            {...rest}
            type="submit"
        >
            {children}
        </Button>
    );
};
