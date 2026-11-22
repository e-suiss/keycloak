/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/users/UserSelect.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation";
import { XIcon } from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Command, CommandItem, CommandList } from "@ui/components/command";
import { Field, FieldLabel } from "@ui/components/field";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput
} from "@ui/components/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover";
import { debounce } from "lodash-es";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormErrorText, HelpItem, useFetch } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import useToggle from "../../utils/useToggle";
import type { ComponentProps } from "../dynamic/components";

type UserSelectVariant = "typeaheadMulti" | "typeahead";

type UserSelectProps = Omit<ComponentProps, "convertToName"> & {
    variant?: UserSelectVariant;
    isRequired?: boolean;
};

export const UserSelect = ({
    name,
    label,
    helpText,
    defaultValue,
    isRequired,
    variant = "typeaheadMulti"
}: UserSelectProps) => {
    const { adminClient } = useAdminClient();

    const { t } = useTranslation();
    const {
        control,
        getValues,
        formState: { errors }
    } = useFormContext();
    const values: string[] | undefined = getValues(name!);

    const [open, _toggleOpen, setOpen] = useToggle();
    const [selectedUsers, setSelectedUsers] = useState<UserRepresentation[]>([]);
    const [searchedUsers, setSearchedUsers] = useState<UserRepresentation[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [search, setSearch] = useState("");
    const textInputRef = useRef<HTMLInputElement>();
    const containerRef = useRef<HTMLDivElement>(null);

    const debounceFn = useCallback(debounce(setSearch, 500), []);

    useFetch(
        async () => {
            if (!values) {
                return [];
            }

            const foundUsers = await Promise.all(
                values.map(id => adminClient.users.findOne({ id }))
            );

            return foundUsers.filter(user => user !== undefined);
        },
        users => {
            setSelectedUsers(users);
            if (variant !== "typeaheadMulti") {
                setInputValue(users[0]?.username || "");
            }
        },
        [values]
    );

    useFetch(
        async () =>
            adminClient.users.find({
                username: search,
                max: 20
            }),
        setSearchedUsers,
        [search]
    );

    useEffect(() => {
        if (!values || values.length === 0) {
            setSelectedUsers([]);
            setInputValue("");
        }
    }, [values]);

    const users = useMemo(
        () => [...selectedUsers, ...searchedUsers],
        [selectedUsers, searchedUsers]
    );

    return (
        <Field>
            <FieldLabel htmlFor={name!}>
                {t(label!)}
                {isRequired && <span className="text-destructive">*</span>}
                <HelpItem helpText={helpText!} fieldLabelId={t(label!)} />
            </FieldLabel>
            <Controller
                name={name!}
                defaultValue={defaultValue}
                control={control}
                rules={
                    isRequired && variant === "typeaheadMulti"
                        ? { validate: value => value.length > 0 }
                        : { required: isRequired }
                }
                render={({ field }) => {
                    const onSelect = (option?: string) => {
                        if (!option) {
                            return;
                        }
                        if (variant !== "typeaheadMulti") {
                            const removed = field.value.includes(option);

                            if (removed) {
                                field.onChange([]);
                            } else {
                                field.onChange([option]);
                            }

                            setInputValue(
                                removed
                                    ? ""
                                    : users.find(u => u?.id === option)?.username || ""
                            );
                            setOpen(false);
                        } else {
                            const changedValue = field.value.find(
                                (v: string) => v === option
                            )
                                ? field.value.filter((v: string) => v !== option)
                                : [...field.value, option];
                            field.onChange(changedValue);
                        }
                    };

                    const chips =
                        variant === "typeaheadMulti" && Array.isArray(field.value)
                            ? field.value
                            : [];
                    return (
                        <Popover
                            open={open && searchedUsers.length > 0}
                            onOpenChange={next => {
                                if (!next) setOpen(false);
                            }}
                        >
                            <PopoverTrigger
                                asChild
                                onClick={e => e.preventDefault()}
                            >
                                <div ref={containerRef} aria-label={t(name!)}>
                                    <InputGroup>
                                        {chips.length > 0 && (
                                            <InputGroupAddon
                                                align="block-start"
                                                className="flex-wrap"
                                            >
                                                {chips.map(
                                                    (selection: string, index: number) => (
                                                        <Badge
                                                            key={index}
                                                            variant="secondary"
                                                        >
                                                            {
                                                                users.find(
                                                                    u => u?.id === selection
                                                                )?.username
                                                            }
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-xs"
                                                                aria-label="Remove"
                                                                onClick={ev => {
                                                                    ev.stopPropagation();
                                                                    field.onChange(
                                                                        field.value.filter(
                                                                            (item: string) =>
                                                                                item !==
                                                                                selection
                                                                        )
                                                                    );
                                                                }}
                                                            >
                                                                <XIcon aria-hidden />
                                                            </Button>
                                                        </Badge>
                                                    )
                                                )}
                                            </InputGroupAddon>
                                        )}
                                        <InputGroupInput
                                            id={name!}
                                            data-testid={name!}
                                            ref={textInputRef}
                                            aria-invalid={errors[name!] ? true : undefined}
                                            value={inputValue}
                                            autoComplete="off"
                                            placeholder={t("selectAUser")}
                                            role="combobox"
                                            aria-expanded={open}
                                            aria-controls="select-create-typeahead-listbox"
                                            {...(field.value && {
                                                "aria-activedescendant": field.value
                                            })}
                                            onClick={() => setOpen(true)}
                                            onChange={e => {
                                                setOpen(true);
                                                setInputValue(e.target.value);
                                                debounceFn(e.target.value);
                                            }}
                                        />
                                        {!!search && (
                                            <InputGroupAddon align="inline-end">
                                                <InputGroupButton
                                                    size="icon-xs"
                                                    aria-label="Clear input value"
                                                    onClick={() => {
                                                        setInputValue("");
                                                        setSearch("");
                                                        field.onChange([]);
                                                        textInputRef?.current?.focus();
                                                    }}
                                                >
                                                    <XIcon aria-hidden />
                                                </InputGroupButton>
                                            </InputGroupAddon>
                                        )}
                                    </InputGroup>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent
                                align="start"
                                className="w-(--radix-popover-trigger-width) p-0"
                                onOpenAutoFocus={e => e.preventDefault()}
                                onInteractOutside={e => {
                                    if (
                                        containerRef.current?.contains(
                                            e.target as Node
                                        )
                                    ) {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <Command shouldFilter={false}>
                                    <CommandList id="select-create-typeahead-listbox">
                                        {searchedUsers.map(option => {
                                            const selected = field.value?.includes(
                                                option.id!
                                            );
                                            return (
                                                <CommandItem
                                                    key={option.id}
                                                    value={option.id}
                                                    aria-selected={selected}
                                                    data-checked={selected}
                                                    onSelect={() => onSelect(option.id)}
                                                >
                                                    {option.username}
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    );
                }}
            />
            {errors[name!] && <FormErrorText message={t("required")} />}
        </Field>
    );
};
