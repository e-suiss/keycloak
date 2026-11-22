/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/resources/ShareTheResource.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { XIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel
} from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";

import { updateRequest } from "../api";
import type { Permission, Resource } from "../api/representations";
import { useAccountAlerts } from "../utils/useAccountAlerts";
import { ScopePicker } from "./ScopePicker";
import { SharedWith } from "./SharedWith";

type ShareTheResourceProps = {
    resource: Resource;
    permissions?: Permission[];
    open: boolean;
    onClose: () => void;
};

type FormValues = {
    permissions: string[];
    usernames: { value: string }[];
};

export const ShareTheResource = ({
    resource,
    permissions,
    open,
    onClose
}: ShareTheResourceProps) => {
    const { t } = useTranslation();
    const context = useEnvironment();
    const { addAlert, addError } = useAccountAlerts();
    const form = useForm<FormValues>();
    const {
        control,
        register,
        reset,
        formState: { errors, isValid },
        setError,
        clearErrors,
        handleSubmit
    } = form;
    const { fields, append, remove } = useFieldArray<FormValues>({
        control,
        name: "usernames"
    });

    useEffect(() => {
        if (fields.length === 0) {
            append({ value: "" });
        }
    }, [fields, append]);

    const watchFields = useWatch({
        control,
        name: "usernames",
        defaultValue: []
    });

    const isDisabled = watchFields.every(({ value }) => value.trim().length === 0);

    const addShare = async ({ usernames, permissions }: FormValues) => {
        try {
            await Promise.all(
                usernames
                    .filter(({ value }) => value !== "")
                    .map(({ value: username }) =>
                        updateRequest(context, resource._id, username, permissions)
                    )
            );
            addAlert(t("shareSuccess"));
            onClose();
        } catch (error) {
            addError("shareError", error);
        }
        reset({});
    };

    const validateUser = async () => {
        const userOrEmails = fields.map(f => f.value).filter(f => f !== "");
        const userPermission = permissions?.flatMap(p => [p.username, p.email]);

        const hasUsers = userOrEmails.length > 0;
        const alreadyShared =
            userOrEmails.filter(u => userPermission?.includes(u)).length !== 0;

        if (!hasUsers || alreadyShared) {
            setError("usernames", {
                message: !hasUsers ? t("required") : t("resourceAlreadyShared")
            });
        } else {
            clearErrors();
        }

        return hasUsers && !alreadyShared;
    };

    if (!open) {
        return null;
    }

    return (
        <Modal open onOpenChange={next => !next && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>
                        {t("shareTheResource", { name: resource.name })}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <form id="share-form" onSubmit={handleSubmit(addShare)}>
                        <FieldGroup>
                            <Field data-invalid={errors.usernames !== undefined}>
                                <FieldLabel htmlFor="users">
                                    {t("shareUser")}
                                    <span className="text-destructive"> *</span>
                                </FieldLabel>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="users"
                                        data-testid="users"
                                        placeholder={t("usernamePlaceholder")}
                                        aria-invalid={errors.usernames !== undefined}
                                        className="flex-1"
                                        {...register(
                                            `usernames.${fields.length - 1}.value`,
                                            {
                                                validate: validateUser
                                            }
                                        )}
                                    />
                                    <Button
                                        key="add-user"
                                        variant="secondary"
                                        data-testid="add"
                                        onClick={() => append({ value: "" })}
                                        disabled={isDisabled}
                                    >
                                        {t("add")}
                                    </Button>
                                </div>
                                {fields.length > 1 && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <FieldDescription>{t("shareWith")}</FieldDescription>
                                        {fields.map(
                                            (field, index) =>
                                                index !== fields.length - 1 && (
                                                    <Button
                                                        key={field.id}
                                                        variant="secondary"
                                                        size="xs"
                                                        onClick={() => remove(index)}
                                                    >
                                                        {field.value}
                                                        <XIcon data-icon="inline-end" />
                                                    </Button>
                                                )
                                        )}
                                    </div>
                                )}
                                {errors.usernames && (
                                    <FieldError>{errors.usernames.message!}</FieldError>
                                )}
                            </Field>
                            <Field data-testid="permissions">
                                <FieldLabel>{t("permissions")}</FieldLabel>
                                <ScopePicker
                                    control={control}
                                    name="permissions"
                                    scopes={resource.scopes}
                                />
                            </Field>
                            <div>
                                <SharedWith permissions={permissions} />
                            </div>
                            <Button
                                key="confirm"
                                data-testid="done"
                                disabled={!isValid}
                                type="submit"
                                size="lg"
                                block
                            >
                                {t("done")}
                            </Button>
                        </FieldGroup>
                    </form>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};
