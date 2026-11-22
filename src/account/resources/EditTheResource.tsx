/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/resources/EditTheResource.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Input } from "@ui/components/input";
import { Button } from "@ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@ui/components/field";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { Fragment, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";

import { updatePermissions } from "../api";
import type { Permission, Resource } from "../api/representations";
import { useAccountAlerts } from "../utils/useAccountAlerts";
import { ScopePicker } from "./ScopePicker";

type EditTheResourceProps = {
    resource: Resource;
    permissions?: Permission[];
    onClose: () => void;
};

type FormValues = {
    permissions: Permission[];
};

export const EditTheResource = ({
    resource,
    permissions,
    onClose
}: EditTheResourceProps) => {
    const { t } = useTranslation();
    const context = useEnvironment();
    const { addAlert, addError } = useAccountAlerts();

    const form = useForm<FormValues>();
    const { control, reset, handleSubmit, register } = form;

    const { fields } = useFieldArray<FormValues>({
        control,
        name: "permissions"
    });

    useEffect(() => reset({ permissions }), [reset, permissions]);

    const editShares = async ({ permissions }: FormValues) => {
        try {
            await Promise.all(
                permissions.map(permission =>
                    updatePermissions(context, resource._id, [permission])
                )
            );
            addAlert(t("updateSuccess"));
            onClose();
        } catch (error) {
            addError("updateError", error);
        }
    };

    return (
        <Modal open onOpenChange={open => !open && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>
                        {t("editTheResource", { name: resource.name })}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <form id="edit-form" onSubmit={handleSubmit(editShares)}>
                        <FieldGroup>
                            {fields.map((p, index) => (
                                <Fragment key={p.id}>
                                    <Field>
                                        <FieldLabel
                                            htmlFor={`permissions-${index}-username`}
                                        >
                                            {t("user")}
                                        </FieldLabel>
                                        <Input
                                            id={`permissions-${index}-username`}
                                            disabled
                                            {...register(
                                                `permissions.${index}.username`
                                            )}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>{t("permissions")}</FieldLabel>
                                        <ScopePicker
                                            id={`permissions-${p.id}`}
                                            control={control}
                                            name={`permissions.${index}.scopes`}
                                            scopes={resource.scopes}
                                        />
                                    </Field>
                                </Fragment>
                            ))}
                            <Button id="done" type="submit" size="lg" block>
                                {t("done")}
                            </Button>
                        </FieldGroup>
                    </form>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};
