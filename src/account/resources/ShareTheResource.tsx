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
    const form = useForm<FormValues>({ mode: "onTouched" });
    const {
        control,
        register,
        reset,
        formState: { errors, isValid },
        getValues,
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

    const validateUser = () => {
        const userOrEmails = (getValues("usernames") ?? [])
            .map(({ value }) => value?.trim())
            .filter(Boolean);
        const userPermission = permissions?.flatMap(p => [p.username, p.email]) ?? [];
        if (userOrEmails.length === 0) return t("required");
        if (userOrEmails.some(u => userPermission.includes(u))) return t("resourceAlreadyShared");
        return true;
    };

    const usernameError =
        errors.usernames?.[fields.length - 1]?.value?.message ?? errors.usernames?.message;

    if (!open) {
        return null;
    }

    return (
        <Modal open onOpenChange={next => !next && onClose()}>
            <ModalContent className="sm:max-w-110 sm:gap-4 sm:rounded-[18px] sm:p-6">
                <ModalHeader className="group-has-data-[slot=drawer-close-button]/drawer-popup:ps-5.5 group-data-[swipe-axis=y]/drawer-popup:text-start">
                    <ModalTitle className="text-[17px] font-semibold sm:text-lg">
                        {t("shareTheResource", { name: resource.name })}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody className="max-md:px-5.5 max-md:pt-3">
                    <form id="share-form" onSubmit={handleSubmit(addShare)}>
                        <FieldGroup className="gap-4.5">
                            <Field data-invalid={usernameError !== undefined}>
                                <FieldLabel htmlFor="users" className="text-sm font-medium">
                                    {t("shareUser")}
                                    <span className="text-[#d70015] dark:text-[#ff453a]"> *</span>
                                </FieldLabel>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="users"
                                        data-testid="users"
                                        placeholder={t("usernamePlaceholder")}
                                        aria-invalid={usernameError !== undefined}
                                        className="h-12 flex-1 rounded-xl text-[15px]"
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
                                        className="h-12 rounded-xl bg-[#e5e5ea] px-4 text-[15px] font-medium text-muted-foreground hover:bg-[#d2d2d7] dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c]"
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
                                {usernameError && (
                                    <FieldError>{usernameError}</FieldError>
                                )}
                            </Field>
                            <Field data-testid="permissions">
                                <FieldLabel className="text-sm font-medium">{t("permissions")}</FieldLabel>
                                <ScopePicker
                                    control={control}
                                    name="permissions"
                                    scopes={resource.scopes}
                                />
                            </Field>
                            <div className="[&>div]:text-[15px] [&>div]:leading-[1.55]">
                                <SharedWith permissions={permissions} />
                            </div>
                            <Button
                                key="confirm"
                                data-testid="done"
                                disabled={!isValid}
                                type="submit"
                                size="form"
                                block
                                className="mt-0.5"
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
