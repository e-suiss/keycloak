/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/dynamic/RoleComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { XIcon } from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Field, FieldLabel } from "@ui/components/field";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormErrorText, HelpItem } from "../../../shared/keycloak-ui-shared";
import useToggle from "../../utils/useToggle";
import {
    AddRoleButton,
    AddRoleMappingModal,
    type FilterType
} from "../role-mapping/AddRoleMappingModal";
import { type Row, ServiceRole } from "../role-mapping/RoleMapping";
import type { ComponentProps } from "./components";

const parseValue = (value: any) =>
    value?.includes(".") ? value.split(".") : ["", value || ""];

const parseRow = (value: Row) =>
    value.client?.clientId
        ? `${value.client.clientId}.${value.role.name}`
        : value.role.name;

export const RoleComponent = ({
    name,
    label,
    helpText,
    defaultValue,
    required,
    isDisabled = false,
    convertToName
}: ComponentProps) => {
    const { t } = useTranslation();

    const [openModal, toggleModal] = useToggle();
    const [filterType, setFilterType] = useState<FilterType>("clients");

    const {
        control,
        formState: { errors }
    } = useFormContext();

    const fieldName = convertToName(name!);

    return (
        <Field>
            <FieldLabel htmlFor={name!}>
                {t(label!)}
                {required && <span className="text-destructive">*</span>}
                <HelpItem helpText={t(helpText!)} fieldLabelId={`${label}`} />
            </FieldLabel>
            <Controller
                name={fieldName}
                defaultValue={defaultValue || ""}
                control={control}
                render={({ field }) => (
                    <div className="flex items-center gap-2">
                        {openModal && (
                            <AddRoleMappingModal
                                id="id"
                                type="roles"
                                filterType={filterType}
                                name={name}
                                onAssign={rows => field.onChange(parseRow(rows[0]))}
                                onClose={toggleModal}
                                isRadio
                            />
                        )}

                        {field.value !== "" && (
                            <Badge variant="secondary" className="max-w-125">
                                <ServiceRole
                                    role={{ name: parseValue(field.value)[1] }}
                                    client={{ clientId: parseValue(field.value)[0] }}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={t("remove")}
                                    onClick={() => field.onChange("")}
                                >
                                    <XIcon />
                                </Button>
                            </Badge>
                        )}
                        <AddRoleButton
                            label="selectRole.label"
                            onFilerTypeChange={type => {
                                setFilterType(type);
                                toggleModal();
                            }}
                            variant="secondary"
                            data-testid="add-roles"
                            isDisabled={isDisabled}
                        />
                    </div>
                )}
            />
            {errors[fieldName] && <FormErrorText message={t("required")} />}
        </Field>
    );
};
