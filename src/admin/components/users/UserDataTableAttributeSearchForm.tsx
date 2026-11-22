/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/users/UserDataTableAttributeSearchForm.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type { UserProfileConfig } from "@keycloak/keycloak-admin-client/lib/defs/userProfileMetadata";
import { CheckIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Field, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Form } from "react-router-dom";
import { label, useAlerts } from "../../../shared/keycloak-ui-shared";
import type { UserAttribute, UserFilter } from "./UserDataTable";

type UserDataTableAttributeSearchFormProps = {
    activeFilters: UserFilter;
    setActiveFilters: (filters: UserFilter) => void;
    profile: UserProfileConfig;
    createAttributeSearchChips: () => ReactNode;
    searchUserWithAttributes: () => void;
    clearAllFilters: () => void;
};

type UserFilterForm = UserAttribute & { exact: boolean };

export function UserDataTableAttributeSearchForm({
    activeFilters,
    setActiveFilters,
    profile,
    createAttributeSearchChips,
    searchUserWithAttributes,
    clearAllFilters
}: UserDataTableAttributeSearchFormProps) {
    const { t } = useTranslation();
    const { addAlert } = useAlerts();

    const defaultValues: UserAttribute = {
        name: "",
        displayName: "",
        value: ""
    };

    const {
        getValues,
        register,
        reset,
        formState: { errors },
        setValue,
        setError,
        clearErrors
    } = useForm<UserFilterForm>({
        mode: "onChange",
        defaultValues
    });

    const isAttributeKeyDuplicate = () => {
        return activeFilters.userAttribute.some(
            filter => filter.name === getValues().name
        );
    };

    const isAttributeNameValid = () => {
        let valid = false;
        if (!getValues().name.length) {
            setError("name", {
                type: "empty",
                message: t("searchUserByAttributeMissingKeyError")
            });
        } else if (
            activeFilters.userAttribute.some(filter => filter.name === getValues().name)
        ) {
            setError("name", {
                type: "conflict",
                message: t("searchUserByAttributeKeyAlreadyInUseError")
            });
        } else {
            valid = true;
        }
        return valid;
    };

    const isAttributeValueValid = () => {
        let valid = false;
        if (!getValues().value.length) {
            setError("value", {
                type: "empty",
                message: t("searchUserByAttributeMissingValueError")
            });
        } else {
            valid = true;
        }
        return valid;
    };

    const isAttributeValid = () => isAttributeNameValid() && isAttributeValueValid();

    const addToFilter = () => {
        if (isAttributeValid()) {
            setActiveFilters({
                ...activeFilters,
                userAttribute: [...activeFilters.userAttribute, { ...getValues() }]
            });
            reset(defaultValues);
        } else {
            if (errors.name?.message) {
                addAlert(errors.name.message, "danger");
            }

            if (errors.value?.message) {
                addAlert(errors.value.message, "danger");
            }
        }
    };

    const clearActiveFilters = () => {
        const filtered = [...activeFilters.userAttribute].filter(
            chip => chip.name !== chip.name
        );
        setActiveFilters({ ...activeFilters, userAttribute: filtered });
        clearAllFilters();
    };

    const createAttributeKeyInputField = () => {
        if (profile) {
            return (
                <Select
                    value={getValues().name}
                    onValueChange={selectedName => {
                        const option = profile.attributes?.find(
                            attr => attr.name === selectedName
                        );
                        setValue("name", selectedName);
                        setValue(
                            "displayName",
                            option
                                ? label(t, option.displayName!, option.name)
                                : selectedName
                        );
                        if (isAttributeKeyDuplicate()) {
                            setError("name", { type: "conflict" });
                        } else {
                            clearErrors("name");
                        }
                    }}
                >
                    <SelectTrigger
                        data-testid="search-attribute-name-select"
                        aria-invalid={errors.name ? true : undefined}
                        className="w-full"
                    >
                        <SelectValue placeholder={t("selectAttribute")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-75">
                        {profile.attributes?.map(option => (
                            <SelectItem key={option.name} value={option.name!}>
                                {label(t, option.displayName!, option.name)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        } else {
            return (
                <Input
                    id="name"
                    placeholder={t("keyPlaceholder")}
                    aria-invalid={errors.name ? true : undefined}
                    onKeyDown={e => e.key === "Enter" && addToFilter()}
                    {...register("name", {
                        required: true,
                        validate: isAttributeNameValid
                    })}
                />
            );
        }
    };

    return (
        <Form
            className="user-attribute-search-form"
            data-testid="user-attribute-search-form"
        >
            <div className="user-attribute-search-form-headline">
                <h2 className="font-semibold text-base">
                    {t("selectAttributes")}
                </h2>
            </div>
            <Alert className="user-attribute-search-form-alert">
                <AlertDescription>
                    {t("searchUserByAttributeDescription")}
                </AlertDescription>
            </Alert>
            <div className="user-attribute-search-form-key-value">
                <div className="user-attribute-search-form-left">
                    <h3 className="font-semibold text-base">{t("key")}</h3>
                </div>
                <div className="user-attribute-search-form-right">
                    <h3 className="font-semibold text-base">{t("value")}</h3>
                </div>
            </div>
            <div className="user-attribute-search-form-left">
                {createAttributeKeyInputField()}
            </div>
            <div className="user-attribute-search-form-right">
                <div className="flex items-center">
                    <Input
                        id="value"
                        placeholder={t("valuePlaceholder")}
                        aria-invalid={errors.value ? true : undefined}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addToFilter();
                            }
                        }}
                        {...register("value", {
                            required: true,
                            validate: isAttributeValueValid
                        })}
                    />
                    <Button
                        data-testid="user-attribute-search-add-filter-button"
                        variant="ghost"
                        onClick={addToFilter}
                        aria-label={t("addToFilter")}
                    >
                        <CheckIcon />
                    </Button>
                </div>
            </div>
            {createAttributeSearchChips()}

            <Field orientation="horizontal" className="pt-6">
                <Checkbox
                    id="exact"
                    data-testid="exact"
                    checked={activeFilters.exact}
                    onCheckedChange={value => {
                        setActiveFilters({
                            ...activeFilters,
                            exact: value
                        });
                    }}
                />
                <FieldLabel htmlFor="exact">{t("exactSearch")}</FieldLabel>
            </Field>
            <div className="user-attribute-search-form-action-group flex gap-2">
                <Button
                    data-testid="search-user-attribute-btn"
                    type="submit"
                    disabled={!activeFilters.userAttribute.length}
                    onClick={searchUserWithAttributes}
                >
                    {t("search")}
                </Button>
                <Button
                    variant="link"
                    onClick={() => {
                        reset();
                        clearActiveFilters();
                    }}
                >
                    {t("reset")}
                </Button>
            </div>
        </Form>
    );
}
