/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/user-profile/SelectComponent.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    useComboboxAnchor
} from "@ui/components/combobox";
import { useState } from "react";
import { Controller } from "react-hook-form";
import type { OptionLabel, Options, UserProfileFieldProps } from "./UserProfileFields";
import { UserProfileGroup } from "./UserProfileGroup";
import { fieldName, label } from "./utils";

export const SelectComponent = (props: UserProfileFieldProps) => {
    const { t, form, inputType, attribute } = props;
    const [open, setOpen] = useState(false);
    const anchorRef = useComboboxAnchor();
    const isMultiValue = inputType === "multiselect";

    const options = (attribute.validators?.options as Options | undefined)?.options || [];

    const optionLabel = (attribute.annotations?.inputOptionLabels as OptionLabel) || {};
    const prefix = attribute.annotations?.inputOptionLabelsI18nPrefix as string;

    const fetchLabel = (option: string) =>
        label(props.t, optionLabel[option], option, prefix);

    // base-ui Combobox uses the `{ value, label }` shape automatically:
    // `value` is the stored option key, `label` is the displayed text. The
    // controlled `value`/`onValueChange` operate on these item objects, so we
    // bridge them to/from the plain string keys stored in the form value.
    type Item = { value: string; label: string };
    const items: Item[] = options.map(option => ({
        value: option,
        label: fetchLabel(option)
    }));
    const toItem = (option: string): Item =>
        items.find(item => item.value === option) ?? {
            value: option,
            label: fetchLabel(option)
        };

    return (
        <UserProfileGroup {...props}>
            <Controller
                name={fieldName(attribute.name)}
                defaultValue={attribute.defaultValue}
                control={form.control}
                render={({ field }) => {
                    const selectionArray = Array.isArray(field.value)
                        ? (field.value as string[])
                        : field.value
                          ? [field.value as string]
                          : [];

                    if (isMultiValue) {
                        return (
                            <Combobox
                                items={items}
                                multiple
                                value={selectionArray.map(toItem)}
                                disabled={attribute.readOnly}
                                open={open}
                                onOpenChange={setOpen}
                                onValueChange={(value: Item[]) =>
                                    field.onChange((value ?? []).map(item => item.value))
                                }
                            >
                                <ComboboxChips ref={anchorRef}>
                                    {selectionArray.map(selection => (
                                        <ComboboxChip
                                            key={selection}
                                            aria-label={fetchLabel(selection)}
                                        >
                                            {fetchLabel(selection)}
                                        </ComboboxChip>
                                    ))}
                                    <ComboboxChipsInput
                                        id={attribute.name}
                                        aria-label={t("selectOne")}
                                        disabled={attribute.readOnly}
                                    />
                                </ComboboxChips>
                                <ComboboxContent anchor={anchorRef}>
                                    <ComboboxEmpty>{t("noResults")}</ComboboxEmpty>
                                    <ComboboxList>
                                        {(item: { value: string; label: string }) => (
                                            <ComboboxItem key={item.value} value={item}>
                                                {item.label}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        );
                    }

                    return (
                        <Combobox
                            items={items}
                            value={field.value ? toItem(field.value as string) : null}
                            disabled={attribute.readOnly}
                            open={open}
                            onOpenChange={setOpen}
                            onValueChange={(value: Item | null) =>
                                field.onChange(value?.value ?? "")
                            }
                        >
                            <ComboboxInput
                                id={attribute.name}
                                aria-label={t("selectOne")}
                                disabled={attribute.readOnly}
                                showClear
                            />
                            <ComboboxContent>
                                <ComboboxEmpty>{t("noResults")}</ComboboxEmpty>
                                <ComboboxList>
                                    {(item: { value: string; label: string }) => (
                                        <ComboboxItem key={item.value} value={item}>
                                            {item.label}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    );
                }}
            />
        </UserProfileGroup>
    );
};
